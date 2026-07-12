package httpapi

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"

	"github.com/CoxxA/nomadbank/v2/internal/auth"
	"github.com/CoxxA/nomadbank/v2/internal/config"
	"github.com/CoxxA/nomadbank/v2/internal/sqlite"
	taskservice "github.com/CoxxA/nomadbank/v2/internal/task"
)

const sessionCookieName = "nomadbank_session"

type Server struct {
	echo        *echo.Echo
	config      config.Config
	store       *sqlite.Store
	authService *auth.Service
	taskService *taskservice.Service
}

func New(config config.Config, store *sqlite.Store) *Server {
	e := echo.New()
	e.HideBanner = true
	e.HTTPErrorHandler = errorHandler
	// Do not trust client-controlled forwarding headers for security decisions
	// such as the authentication rate-limit key. A reverse proxy still works;
	// in this single-user application its clients simply share the proxy bucket.
	e.IPExtractor = echo.ExtractIPDirect()
	e.Server.ReadHeaderTimeout = 5 * time.Second
	e.Server.ReadTimeout = 15 * time.Second
	e.Server.WriteTimeout = 30 * time.Second
	e.Server.IdleTimeout = 60 * time.Second
	e.Use(middleware.Recover())
	e.Use(middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
		LogStatus: true,
		LogMethod: true,
		LogURI:    true,
		LogError:  true,
		LogValuesFunc: func(c echo.Context, values middleware.RequestLoggerValues) error {
			if values.Error != nil {
				c.Logger().Errorf("%s %s %d: %v", values.Method, values.URI, values.Status, values.Error)
				return nil
			}
			c.Logger().Infof("%s %s %d", values.Method, values.URI, values.Status)
			return nil
		},
	}))
	e.Use(middleware.BodyLimit("1M"))
	e.Use(middleware.RemoveTrailingSlash())

	server := &Server{
		echo:        e,
		config:      config,
		store:       store,
		authService: auth.NewService(store, config.SessionDays),
		taskService: taskservice.NewService(store, nil),
	}
	server.registerRoutes()
	return server
}

func (s *Server) registerRoutes() {
	s.echo.GET("/health", s.health)
	s.echo.GET("/health/ready", s.ready)

	api := s.echo.Group("/api/v1")
	authLimiter := middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: middleware.NewRateLimiterMemoryStoreWithConfig(middleware.RateLimiterMemoryStoreConfig{
			Rate:      rate.Limit(1),
			Burst:     5,
			ExpiresIn: 5 * time.Minute,
		}),
		DenyHandler: func(echo.Context, string, error) error {
			return apiError(http.StatusTooManyRequests, "rate_limited", "请求过于频繁，请稍后再试")
		},
	})
	api.GET("/setup", s.setupStatus)
	api.POST("/setup", s.setup, authLimiter)
	api.POST("/session", s.login, authLimiter)

	protected := api.Group("")
	protected.Use(s.requireSession)
	protected.DELETE("/session", s.logout)
	protected.GET("/me", s.me)
	protected.PUT("/me", s.updateOwner)
	protected.PUT("/me/password", s.changePassword)

	protected.GET("/accounts", s.listAccounts)
	protected.POST("/accounts", s.createAccount)
	protected.GET("/accounts/:id", s.getAccount)
	protected.PUT("/accounts/:id", s.updateAccount)
	protected.DELETE("/accounts/:id", s.deleteAccount)

	protected.GET("/strategies", s.listStrategies)
	protected.POST("/strategies", s.createStrategy)
	protected.GET("/strategies/:id", s.getStrategy)
	protected.PUT("/strategies/:id", s.updateStrategy)
	protected.DELETE("/strategies/:id", s.deleteStrategy)

	protected.GET("/task-batches", s.listTaskBatches)
	protected.POST("/task-batches", s.createTaskBatch)
	protected.DELETE("/task-batches/:id", s.deleteTaskBatch)
	protected.GET("/tasks", s.listTasks)
	protected.POST("/tasks/:id/complete", s.completeTask)
	protected.GET("/dashboard", s.dashboard)
}

func (s *Server) Echo() *echo.Echo {
	return s.echo
}

func (s *Server) Start() error {
	return s.echo.Start(s.config.Address())
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.echo.Shutdown(ctx)
}

func (s *Server) health(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) ready(c echo.Context) error {
	if err := s.store.Ping(c.Request().Context()); err != nil {
		return apiError(http.StatusServiceUnavailable, "database_unavailable", "数据库不可用")
	}
	return c.JSON(http.StatusOK, map[string]string{"status": "ready"})
}
