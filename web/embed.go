package web

import (
	"embed"
	"io/fs"
	"net/http"

	"github.com/labstack/echo/v4"
)

//go:embed all:dist/*
var distFS embed.FS

// RegisterRoutes 注册前端静态文件路由
func RegisterRoutes(e *echo.Echo) {
	// 尝试获取 dist 子目录
	distSubFS, err := fs.Sub(distFS, "dist")
	if err != nil {
		// dist 目录不存在，跳过（开发模式）
		return
	}

	// 静态文件服务
	staticHandler := http.FileServer(http.FS(distSubFS))

	// 处理所有非 API 请求
	e.GET("/*", echo.WrapHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 尝试提供静态文件
		path := r.URL.Path
		if path == "/" {
			path = "/index.html"
		}

		// 检查文件是否存在
		if _, err := fs.Stat(distSubFS, path[1:]); err == nil {
			staticHandler.ServeHTTP(w, r)
			return
		}

		// 文件不存在，返回 index.html（SPA 路由）
		r.URL.Path = "/"
		staticHandler.ServeHTTP(w, r)
	})))
}
