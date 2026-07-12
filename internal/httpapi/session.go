package httpapi

import (
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/v2/internal/auth"
	"github.com/CoxxA/nomadbank/v2/internal/domain"
	"github.com/CoxxA/nomadbank/v2/internal/sqlite"
)

type setupRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
	Timezone    string `json:"timezone"`
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type updateOwnerRequest struct {
	DisplayName *string `json:"display_name"`
	Timezone    *string `json:"timezone"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (s *Server) setupStatus(c echo.Context) error {
	initialized, err := s.store.IsInitialized(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]bool{"initialized": initialized})
}

func (s *Server) setup(c echo.Context) error {
	var request setupRequest
	if err := c.Bind(&request); err != nil {
		return badRequest("invalid_json", "请求格式错误")
	}
	session, err := s.authService.Setup(c.Request().Context(), auth.SetupInput{
		Username:    request.Username,
		Password:    request.Password,
		DisplayName: request.DisplayName,
		Timezone:    request.Timezone,
	})
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrInvalidInput):
			return badRequest("invalid_setup", "用户名需为 3～40 个字符；显示名称最多 80 个字符；密码至少 10 个字符且不超过 72 个 UTF-8 字节；时区必须有效")
		case errors.Is(err, sqlite.ErrAlreadyInitialized):
			return conflict("already_initialized", "应用已经初始化")
		default:
			return err
		}
	}
	s.setSessionCookie(c, session)
	return c.JSON(http.StatusCreated, session.Owner)
}

func (s *Server) login(c echo.Context) error {
	var request loginRequest
	if err := c.Bind(&request); err != nil {
		return badRequest("invalid_json", "请求格式错误")
	}
	session, err := s.authService.Login(c.Request().Context(), request.Username, request.Password)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			return apiError(http.StatusUnauthorized, "invalid_credentials", "用户名或密码错误")
		}
		return err
	}
	s.setSessionCookie(c, session)
	return c.JSON(http.StatusOK, session.Owner)
}

func (s *Server) logout(c echo.Context) error {
	token := sessionToken(c)
	if err := s.authService.Logout(c.Request().Context(), token); err != nil {
		return err
	}
	s.clearSessionCookie(c)
	return c.NoContent(http.StatusNoContent)
}

func (s *Server) me(c echo.Context) error {
	owner, ok := c.Get("owner").(domain.Owner)
	if !ok {
		return unauthorized()
	}
	return c.JSON(http.StatusOK, owner)
}

func (s *Server) updateOwner(c echo.Context) error {
	var request updateOwnerRequest
	if err := c.Bind(&request); err != nil {
		return badRequest("invalid_json", "请求格式错误")
	}
	if request.DisplayName == nil || request.Timezone == nil {
		return badRequest("missing_fields", "display_name 和 timezone 均为必填项")
	}
	owner, ok := c.Get("owner").(domain.Owner)
	if !ok {
		return unauthorized()
	}
	timezone := strings.TrimSpace(*request.Timezone)
	if timezone == "" {
		return badRequest("invalid_timezone", "时区不能为空")
	}
	if _, err := time.LoadLocation(timezone); err != nil {
		return badRequest("invalid_timezone", "时区无效")
	}
	displayName := strings.TrimSpace(*request.DisplayName)
	if utf8.RuneCountInString(displayName) > domain.MaxDisplayNameRunes {
		return badRequest("invalid_display_name", "显示名称不能超过 80 个字符")
	}
	owner.DisplayName = displayName
	owner.Timezone = timezone
	if err := s.store.UpdateOwner(c.Request().Context(), owner); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, owner)
}

func (s *Server) changePassword(c echo.Context) error {
	var request changePasswordRequest
	if err := c.Bind(&request); err != nil {
		return badRequest("invalid_json", "请求格式错误")
	}
	session, err := s.authService.ChangePassword(
		c.Request().Context(),
		request.CurrentPassword,
		request.NewPassword,
	)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrInvalidInput):
			return badRequest("invalid_password", "新密码至少需要 10 个字符，且不能超过 72 个 UTF-8 字节")
		case errors.Is(err, auth.ErrInvalidCredentials):
			return badRequest("wrong_password", "当前密码错误")
		default:
			return err
		}
	}
	s.setSessionCookie(c, session)
	return c.NoContent(http.StatusNoContent)
}

func (s *Server) requireSession(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		owner, err := s.authService.Authenticate(c.Request().Context(), sessionToken(c))
		if err != nil {
			if errors.Is(err, auth.ErrInvalidSession) {
				s.clearSessionCookie(c)
				return unauthorized()
			}
			return err
		}
		c.Set("owner", owner)
		return next(c)
	}
}

func sessionToken(c echo.Context) string {
	cookie, err := c.Cookie(sessionCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

func (s *Server) setSessionCookie(c echo.Context, session auth.Session) {
	c.SetCookie(&http.Cookie{
		Name:     sessionCookieName,
		Value:    session.Token,
		Path:     "/",
		Expires:  session.ExpiresAt,
		MaxAge:   int(time.Until(session.ExpiresAt).Seconds()),
		HttpOnly: true,
		Secure:   requestIsSecure(c),
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *Server) clearSessionCookie(c echo.Context) {
	c.SetCookie(&http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   requestIsSecure(c),
		SameSite: http.SameSiteLaxMode,
	})
}

func requestIsSecure(c echo.Context) bool {
	return c.Request().TLS != nil || strings.EqualFold(c.Request().Header.Get("X-Forwarded-Proto"), "https")
}
