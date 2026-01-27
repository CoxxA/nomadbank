package middleware

import (
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// CORSMiddleware CORS 中间件（开发模式用，允许所有来源）
func CORSMiddleware() echo.MiddlewareFunc {
	return CORSMiddlewareWithOrigins([]string{"*"})
}

// CORSMiddlewareWithOrigins CORS 中间件（指定允许的来源）
func CORSMiddlewareWithOrigins(origins []string) echo.MiddlewareFunc {
	if len(origins) == 0 {
		origins = []string{"*"}
	}
	return middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: origins,
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization"},
	})
}
