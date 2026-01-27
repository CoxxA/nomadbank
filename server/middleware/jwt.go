package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

// JWTClaims JWT 声明
type JWTClaims struct {
	UserID   string `json:"sub"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// JWTConfig JWT 配置
type JWTConfig struct {
	Secret      string
	ExpireHours int
}

// GenerateToken 生成 JWT Token
func GenerateToken(cfg *JWTConfig, userID, username, role string) (string, error) {
	claims := &JWTClaims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(cfg.ExpireHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.Secret))
}

// JWTMiddleware JWT 认证中间件
func JWTMiddleware(secret string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "缺少认证信息")
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				return echo.NewHTTPError(http.StatusUnauthorized, "认证格式错误")
			}

			tokenString := parts[1]
			claims := &JWTClaims{}

			token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				return echo.NewHTTPError(http.StatusUnauthorized, "认证无效或已过期")
			}

			// 将用户信息存入 context
			c.Set("user_id", claims.UserID)
			c.Set("username", claims.Username)
			c.Set("role", claims.Role)

			return next(c)
		}
	}
}

// GetUserID 从 context 获取用户 ID
func GetUserID(c echo.Context) string {
	if id, ok := c.Get("user_id").(string); ok {
		return id
	}
	return ""
}

// GetUsername 从 context 获取用户名
func GetUsername(c echo.Context) string {
	if name, ok := c.Get("username").(string); ok {
		return name
	}
	return ""
}

// GetUserRole 从 context 获取用户角色
func GetUserRole(c echo.Context) string {
	if role, ok := c.Get("role").(string); ok {
		return role
	}
	return ""
}

// IsAdmin 检查当前用户是否是管理员
func IsAdmin(c echo.Context) bool {
	return GetUserRole(c) == "admin"
}
