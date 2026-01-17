package v1

import (
	"net/http"

	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/labstack/echo/v4"
)

// StatsAPI 统计 API
type StatsAPI struct {
	store *store.Store
}

// NewStatsAPI 创建统计 API
func NewStatsAPI(store *store.Store) *StatsAPI {
	return &StatsAPI{store: store}
}

// Dashboard 获取仪表盘统计数据
func (a *StatsAPI) Dashboard(c echo.Context) error {
	userID := middleware.GetUserID(c)

	stats, err := a.store.GetDashboardStats(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取统计数据失败")
	}

	return c.JSON(http.StatusOK, stats)
}
