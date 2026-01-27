package server

import (
	v1 "github.com/CoxxA/nomadbank/api/v1"
	"github.com/CoxxA/nomadbank/server/middleware"
)

// SetupRoutes 配置路由
func (s *Server) SetupRoutes() {
	s.SetupRoutesWithVersion("dev", "unknown")
}

// SetupRoutesWithVersion 配置路由（带版本信息）
func (s *Server) SetupRoutesWithVersion(version, commit string) {
	e := s.echo

	// 健康检查（无需认证，放在 /api 之外）
	healthAPI := v1.NewHealthAPI(s.store, version, commit)
	e.GET("/health", healthAPI.Health)
	e.GET("/health/ready", healthAPI.Ready)
	e.GET("/health/live", healthAPI.Live)

	// API v1 路由组
	apiV1 := e.Group("/api/v1")

	// 系统状态（无需登录）
	userAPI := v1.NewUserAPI(s.store)
	apiV1.GET("/system/initialized", userAPI.Initialized)

	// 认证路由（无需登录）
	authAPI := v1.NewAuthAPI(s.store, s.config)
	apiV1.POST("/auth/register", authAPI.Register)
	apiV1.POST("/auth/login", authAPI.Login)

	// 需要认证的路由
	authGroup := apiV1.Group("")
	authGroup.Use(middleware.JWTMiddleware(s.config.JWTSecret))

	// 用户信息与设置
	authGroup.GET("/auth/me", authAPI.Me)
	authGroup.PUT("/auth/password", authAPI.ChangePassword)
	authGroup.PUT("/auth/profile", authAPI.UpdateProfile)

	// 用户管理 API（管理员）
	authGroup.GET("/users", userAPI.List)
	authGroup.POST("/users", userAPI.Create)
	authGroup.PUT("/users/:id", userAPI.Update)
	authGroup.DELETE("/users/:id", userAPI.Delete)
	authGroup.PUT("/users/:id/password", userAPI.ResetPassword)

	// 银行 API
	bankAPI := v1.NewBankAPI(s.store)
	authGroup.GET("/banks", bankAPI.List)
	authGroup.GET("/banks/groups", bankAPI.Groups)
	authGroup.POST("/banks", bankAPI.Create)
	authGroup.GET("/banks/:id", bankAPI.Get)
	authGroup.PUT("/banks/:id", bankAPI.Update)
	authGroup.DELETE("/banks/:id", bankAPI.Delete)

	// 策略 API
	strategyAPI := v1.NewStrategyAPI(s.store)
	authGroup.GET("/strategies", strategyAPI.List)
	authGroup.POST("/strategies", strategyAPI.Create)
	authGroup.GET("/strategies/:id", strategyAPI.Get)
	authGroup.PUT("/strategies/:id", strategyAPI.Update)
	authGroup.DELETE("/strategies/:id", strategyAPI.Delete)

	// 任务 API
	taskAPI := v1.NewTaskAPI(s.store)
	authGroup.GET("/tasks", taskAPI.List)
	authGroup.GET("/tasks/cycles", taskAPI.Cycles)
	authGroup.POST("/tasks/generate", taskAPI.Generate)
	authGroup.PUT("/tasks/:id/complete", taskAPI.Complete)
	authGroup.DELETE("/tasks", taskAPI.DeleteAll)

	// 通知渠道 API
	notificationAPI := v1.NewNotificationAPI(s.store)
	authGroup.GET("/notifications", notificationAPI.List)
	authGroup.POST("/notifications", notificationAPI.Create)
	authGroup.PUT("/notifications/:id", notificationAPI.Update)
	authGroup.DELETE("/notifications/:id", notificationAPI.Delete)
	authGroup.POST("/notifications/:id/test", notificationAPI.Test)

	// 统计 API
	statsAPI := v1.NewStatsAPI(s.store)
	authGroup.GET("/stats/dashboard", statsAPI.Dashboard)
}
