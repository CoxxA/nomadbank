package v1

import (
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/CoxxA/nomadbank/internal/config"
	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
)

// AuthAPI 认证 API
type AuthAPI struct {
	store  *store.Store
	config *config.Config
}

// NewAuthAPI 创建认证 API
func NewAuthAPI(store *store.Store, cfg *config.Config) *AuthAPI {
	return &AuthAPI{store: store, config: cfg}
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Nickname string `json:"nickname"`
}

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// AuthResponse 认证响应
type AuthResponse struct {
	AccessToken string    `json:"access_token"`
	User        *UserInfo `json:"user"`
}

// UserInfo 用户信息
type UserInfo struct {
	ID       string         `json:"id"`
	Username string         `json:"username"`
	Role     model.UserRole `json:"role"`
	Nickname string         `json:"nickname"`
	Avatar   string         `json:"avatar"`
}

// Register 用户注册
func (a *AuthAPI) Register(c echo.Context) error {
	var req RegisterRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	// 验证用户名
	username, err := validateUsername(req.Username)
	if err != nil {
		return err
	}
	req.Username = username

	// 验证密码
	if err := validatePassword(req.Password); err != nil {
		return err
	}

	// 检查用户名是否已存在
	existing, err := a.store.GetUserByUsername(req.Username)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		// 数据库错误，非"用户不存在"
		return echo.NewHTTPError(http.StatusInternalServerError, "检查用户名失败")
	}
	if existing != nil {
		return echo.NewHTTPError(http.StatusConflict, "用户名已存在")
	}

	// 哈希密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return errInternal(msgPasswordProcessFail)
	}

	// 检查是否是第一个用户（自动成为管理员）
	userCount, _ := a.store.CountUsers()
	role := model.UserRoleUser
	if userCount == 0 {
		role = model.UserRoleAdmin
	}

	// 设置昵称
	nickname := strings.TrimSpace(req.Nickname)
	if nickname == "" {
		nickname = req.Username
	}

	// 创建用户
	user := &model.User{
		ID:           uuid.New().String(),
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		Role:         role,
		Nickname:     nickname,
	}

	if err := a.store.CreateUser(user); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建用户失败")
	}

	// 生成 Token
	jwtCfg := &middleware.JWTConfig{
		Secret:      a.config.JWTSecret,
		ExpireHours: a.config.JWTExpireHours,
	}
	token, err := middleware.GenerateToken(jwtCfg, user.ID, user.Username)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "生成 Token 失败")
	}

	return c.JSON(http.StatusCreated, &AuthResponse{
		AccessToken: token,
		User: &UserInfo{
			ID:       user.ID,
			Username: user.Username,
			Role:     user.Role,
			Nickname: user.Nickname,
			Avatar:   user.Avatar,
		},
	})
}

// Login 用户登录
func (a *AuthAPI) Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	// 查找用户
	user, err := a.store.GetUserByUsername(req.Username)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "用户名或密码错误")
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "用户名或密码错误")
	}

	// 生成 Token
	jwtCfg := &middleware.JWTConfig{
		Secret:      a.config.JWTSecret,
		ExpireHours: a.config.JWTExpireHours,
	}
	token, err := middleware.GenerateToken(jwtCfg, user.ID, user.Username)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "生成 Token 失败")
	}

	return c.JSON(http.StatusOK, &AuthResponse{
		AccessToken: token,
		User: &UserInfo{
			ID:       user.ID,
			Username: user.Username,
			Role:     user.Role,
			Nickname: user.Nickname,
			Avatar:   user.Avatar,
		},
	})
}

// Me 获取当前用户信息
func (a *AuthAPI) Me(c echo.Context) error {
	userID := middleware.GetUserID(c)

	user, err := a.store.GetUserByID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "用户不存在")
	}

	return c.JSON(http.StatusOK, &UserInfo{
		ID:       user.ID,
		Username: user.Username,
		Role:     user.Role,
		Nickname: user.Nickname,
		Avatar:   user.Avatar,
	})
}

// ChangePasswordRequest 修改密码请求
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

// ChangePassword 修改自己的密码
func (a *AuthAPI) ChangePassword(c echo.Context) error {
	userID := middleware.GetUserID(c)

	var req ChangePasswordRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	// 验证新密码
	if err := validatePassword(req.NewPassword); err != nil {
		return err
	}

	// 获取用户
	user, err := a.store.GetUserByID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "用户不存在")
	}

	// 验证旧密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "原密码错误")
	}

	// 哈希新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return errInternal(msgPasswordProcessFail)
	}

	user.PasswordHash = string(hashedPassword)
	if err := a.store.UpdateUser(user); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "修改密码失败")
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "密码修改成功"})
}

// UpdateProfileRequest 更新个人资料请求
type UpdateProfileRequest struct {
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}

// UpdateProfile 更新个人资料
func (a *AuthAPI) UpdateProfile(c echo.Context) error {
	userID := middleware.GetUserID(c)

	var req UpdateProfileRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	user, err := a.store.GetUserByID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "用户不存在")
	}

	// 更新字段
	if req.Nickname != "" {
		nickname, err := validateNickname(req.Nickname)
		if err != nil {
			return err
		}
		user.Nickname = nickname
	}
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}

	if err := a.store.UpdateUser(user); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新资料失败")
	}

	return c.JSON(http.StatusOK, &UserInfo{
		ID:       user.ID,
		Username: user.Username,
		Role:     user.Role,
		Nickname: user.Nickname,
		Avatar:   user.Avatar,
	})
}
