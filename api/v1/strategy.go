package v1

import (
	"net/http"
	"strings"

	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// StrategyAPI 策略 API
type StrategyAPI struct {
	store *store.Store
}

// NewStrategyAPI 创建策略 API
func NewStrategyAPI(store *store.Store) *StrategyAPI {
	return &StrategyAPI{store: store}
}

// CreateStrategyRequest 创建/更新策略请求
type CreateStrategyRequest struct {
	Name        string  `json:"name"`
	IntervalMin int     `json:"interval_min"`
	IntervalMax int     `json:"interval_max"`
	TimeStart   string  `json:"time_start"`
	TimeEnd     string  `json:"time_end"`
	SkipWeekend bool    `json:"skip_weekend"`
	AmountMin   float64 `json:"amount_min"`
	AmountMax   float64 `json:"amount_max"`
	DailyLimit  int     `json:"daily_limit"`
}

// List 获取策略列表
func (a *StrategyAPI) List(c echo.Context) error {
	userID := middleware.GetUserID(c)

	strategies, err := a.store.ListStrategiesByUserID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取策略列表失败")
	}

	// 确保返回空数组而不是 null
	if strategies == nil {
		strategies = []model.Strategy{}
	}

	return c.JSON(http.StatusOK, strategies)
}

// Create 创建策略
func (a *StrategyAPI) Create(c echo.Context) error {
	userID := middleware.GetUserID(c)

	var req CreateStrategyRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求格式错误")
	}

	// 验证名称
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "策略名称不能为空")
	}

	// 设置默认值并验证
	if req.IntervalMin <= 0 {
		req.IntervalMin = 30
	}
	if req.IntervalMax <= 0 {
		req.IntervalMax = 60
	}
	if req.IntervalMin > req.IntervalMax {
		req.IntervalMin, req.IntervalMax = req.IntervalMax, req.IntervalMin
	}
	if req.TimeStart == "" {
		req.TimeStart = "09:00"
	}
	if req.TimeEnd == "" {
		req.TimeEnd = "21:00"
	}
	if req.AmountMin <= 0 {
		req.AmountMin = 10
	}
	if req.AmountMax <= 0 {
		req.AmountMax = 30
	}
	if req.AmountMin > req.AmountMax {
		req.AmountMin, req.AmountMax = req.AmountMax, req.AmountMin
	}
	if req.DailyLimit <= 0 {
		req.DailyLimit = 3
	}

	strategy := &model.Strategy{
		ID:          uuid.New().String(),
		UserID:      userID,
		Name:        req.Name,
		IntervalMin: req.IntervalMin,
		IntervalMax: req.IntervalMax,
		TimeStart:   req.TimeStart,
		TimeEnd:     req.TimeEnd,
		SkipWeekend: req.SkipWeekend,
		AmountMin:   req.AmountMin,
		AmountMax:   req.AmountMax,
		DailyLimit:  req.DailyLimit,
		IsSystem:    false,
	}

	if err := a.store.CreateStrategy(strategy); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建策略失败")
	}

	return c.JSON(http.StatusCreated, strategy)
}

// Get 获取策略详情
func (a *StrategyAPI) Get(c echo.Context) error {
	userID := middleware.GetUserID(c)
	strategyID := c.Param("id")

	strategy, err := a.store.GetStrategyByID(strategyID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "策略不存在")
	}

	// 系统策略所有人可访问，用户策略只能本人访问
	if !strategy.IsSystem && strategy.UserID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "无权访问")
	}

	return c.JSON(http.StatusOK, strategy)
}

// Update 更新策略
func (a *StrategyAPI) Update(c echo.Context) error {
	userID := middleware.GetUserID(c)
	strategyID := c.Param("id")

	strategy, err := a.store.GetStrategyByID(strategyID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "策略不存在")
	}

	// 系统策略不可修改
	if strategy.IsSystem {
		return echo.NewHTTPError(http.StatusForbidden, "系统策略不可修改")
	}

	if strategy.UserID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "无权访问")
	}

	var req CreateStrategyRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求格式错误")
	}

	// 验证名称
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "策略名称不能为空")
	}

	// 更新字段
	strategy.Name = req.Name
	if req.IntervalMin > 0 {
		strategy.IntervalMin = req.IntervalMin
	}
	if req.IntervalMax > 0 {
		strategy.IntervalMax = req.IntervalMax
	}
	if strategy.IntervalMin > strategy.IntervalMax {
		strategy.IntervalMin, strategy.IntervalMax = strategy.IntervalMax, strategy.IntervalMin
	}
	if req.TimeStart != "" {
		strategy.TimeStart = req.TimeStart
	}
	if req.TimeEnd != "" {
		strategy.TimeEnd = req.TimeEnd
	}
	strategy.SkipWeekend = req.SkipWeekend
	if req.AmountMin > 0 {
		strategy.AmountMin = req.AmountMin
	}
	if req.AmountMax > 0 {
		strategy.AmountMax = req.AmountMax
	}
	if strategy.AmountMin > strategy.AmountMax {
		strategy.AmountMin, strategy.AmountMax = strategy.AmountMax, strategy.AmountMin
	}
	if req.DailyLimit > 0 {
		strategy.DailyLimit = req.DailyLimit
	}

	if err := a.store.UpdateStrategy(strategy); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新策略失败")
	}

	return c.JSON(http.StatusOK, strategy)
}

// Delete 删除策略
func (a *StrategyAPI) Delete(c echo.Context) error {
	userID := middleware.GetUserID(c)
	strategyID := c.Param("id")

	strategy, err := a.store.GetStrategyByID(strategyID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "策略不存在")
	}

	// 系统策略不可删除
	if strategy.IsSystem {
		return echo.NewHTTPError(http.StatusForbidden, "系统策略不可删除")
	}

	if strategy.UserID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "无权访问")
	}

	if err := a.store.DeleteStrategy(strategyID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "删除策略失败")
	}

	return c.NoContent(http.StatusNoContent)
}
