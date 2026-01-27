package v1

import (
	"fmt"
	"net/http"
	"runtime"
	"sync"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/store"
)

// 应用启动时间
var (
	startTime     time.Time
	startTimeOnce sync.Once
)

// initStartTime 初始化启动时间（只执行一次）
func initStartTime() {
	startTimeOnce.Do(func() {
		startTime = time.Now()
	})
}

// HealthAPI 健康检查 API
type HealthAPI struct {
	store   *store.Store
	version string
	commit  string
}

// NewHealthAPI 创建健康检查 API
func NewHealthAPI(store *store.Store, version, commit string) *HealthAPI {
	initStartTime()
	return &HealthAPI{
		store:   store,
		version: version,
		commit:  commit,
	}
}

// HealthResponse 健康检查响应
type HealthResponse struct {
	Status   string `json:"status"`
	Version  string `json:"version,omitempty"`
	Commit   string `json:"commit,omitempty"`
	Uptime   string `json:"uptime,omitempty"`
	Database string `json:"database,omitempty"`
}

// LiveResponse 活力探针响应
type LiveResponse struct {
	Status       string `json:"status"`
	Uptime       string `json:"uptime"`
	GoVersion    string `json:"go_version"`
	NumGoroutine int    `json:"num_goroutine"`
	NumCPU       int    `json:"num_cpu"`
}

// Health 基本健康检查（存活探针）
// GET /health
func (h *HealthAPI) Health(c echo.Context) error {
	return c.JSON(http.StatusOK, &HealthResponse{
		Status:  "ok",
		Version: h.version,
		Uptime:  formatUptime(time.Since(startTime)),
	})
}

// Ready 就绪探针（检查数据库连接）
// GET /health/ready
func (h *HealthAPI) Ready(c echo.Context) error {
	// 检查数据库连接
	dbStatus := "connected"
	httpStatus := http.StatusOK

	if err := h.store.Ping(); err != nil {
		dbStatus = "disconnected"
		httpStatus = http.StatusServiceUnavailable
	}

	return c.JSON(httpStatus, &HealthResponse{
		Status:   statusFromHTTP(httpStatus),
		Version:  h.version,
		Commit:   h.commit,
		Uptime:   formatUptime(time.Since(startTime)),
		Database: dbStatus,
	})
}

// Live 活力探针（运行时状态）
// GET /health/live
func (h *HealthAPI) Live(c echo.Context) error {
	return c.JSON(http.StatusOK, &LiveResponse{
		Status:       "ok",
		Uptime:       formatUptime(time.Since(startTime)),
		GoVersion:    runtime.Version(),
		NumGoroutine: runtime.NumGoroutine(),
		NumCPU:       runtime.NumCPU(),
	})
}

// formatUptime 格式化运行时间
func formatUptime(d time.Duration) string {
	d = d.Round(time.Second)

	days := int(d.Hours()) / 24
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60

	if days > 0 {
		return formatDuration(days, "d") + formatDuration(hours, "h") + formatDuration(minutes, "m")
	}
	if hours > 0 {
		return formatDuration(hours, "h") + formatDuration(minutes, "m") + formatDuration(seconds, "s")
	}
	if minutes > 0 {
		return formatDuration(minutes, "m") + formatDuration(seconds, "s")
	}
	return formatDuration(seconds, "s")
}

// formatDuration 格式化时间单位
func formatDuration(value int, unit string) string {
	if value == 0 {
		return ""
	}
	return fmt.Sprintf("%d%s", value, unit)
}

// statusFromHTTP 从 HTTP 状态码获取状态字符串
func statusFromHTTP(code int) string {
	if code >= 200 && code < 300 {
		return "ok"
	}
	return "error"
}
