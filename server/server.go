package server

import (
	"fmt"

	"github.com/CoxxA/nomadbank/internal/config"
	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
)

// Server HTTP 服务器
type Server struct {
	echo   *echo.Echo
	config *config.Config
	store  *store.Store
}

// New 创建服务器实例
func New(cfg *config.Config, store *store.Store) *Server {
	e := echo.New()
	e.HideBanner = true

	// 全局中间件
	e.Use(echoMiddleware.Logger())
	e.Use(echoMiddleware.Recover())

	// 开发模式下启用 CORS
	if cfg.IsDev() {
		e.Use(middleware.CORSMiddleware())
	}

	return &Server{
		echo:   e,
		config: cfg,
		store:  store,
	}
}

// Echo 返回 Echo 实例（用于注册路由）
func (s *Server) Echo() *echo.Echo {
	return s.echo
}

// Config 返回配置
func (s *Server) Config() *config.Config {
	return s.config
}

// Store 返回数据存储
func (s *Server) Store() *store.Store {
	return s.store
}

// Start 启动服务器
func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.config.Port)
	return s.echo.Start(addr)
}
