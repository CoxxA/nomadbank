package v1

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/internal/consts"
	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
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
	response := make([]*StrategyResponse, 0, len(strategies))
	for i := range strategies {
		response = append(response, toStrategyResponse(&strategies[i]))
	}

	return c.JSON(http.StatusOK, response)
}

// Create 创建策略
func (a *StrategyAPI) Create(c echo.Context) error {
	userID := middleware.GetUserID(c)

	var req CreateStrategyRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	// 验证名称
	name, err := validateName(req.Name, "策略名称")
	if err != nil {
		return err
	}
	req.Name = name

	// 设置默认值并验证
	if req.IntervalMin <= 0 {
		req.IntervalMin = consts.DefaultStrategyIntervalMin
	}
	if req.IntervalMax <= 0 {
		req.IntervalMax = consts.DefaultStrategyIntervalMax
	}
	req.IntervalMin, req.IntervalMax = normalizeIntervalRange(req.IntervalMin, req.IntervalMax)

	// 验证时间格式
	if req.TimeStart == "" {
		req.TimeStart = consts.DefaultStrategyTimeStart
	}
	if req.TimeEnd == "" {
		req.TimeEnd = consts.DefaultStrategyTimeEnd
	}
	if err := validateTimeRange(req.TimeStart, req.TimeEnd); err != nil {
		return err
	}

	if req.AmountMin <= 0 {
		req.AmountMin = consts.DefaultStrategyAmountMin
	}
	if req.AmountMax <= 0 {
		req.AmountMax = consts.DefaultStrategyAmountMax
	}
	req.AmountMin, req.AmountMax = normalizeAmountRange(req.AmountMin, req.AmountMax)

	if req.DailyLimit <= 0 {
		req.DailyLimit = consts.DefaultStrategyDailyLimit
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

	return c.JSON(http.StatusCreated, toStrategyResponse(strategy))
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
		return errForbidden(msgNoAccess)
	}

	return c.JSON(http.StatusOK, toStrategyResponse(strategy))
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
		return errForbidden(msgNoAccess)
	}

	var req CreateStrategyRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	// 验证名称
	name, err := validateName(req.Name, "策略名称")
	if err != nil {
		return err
	}

	// 更新字段
	strategy.Name = name
	if req.IntervalMin > 0 {
		strategy.IntervalMin = req.IntervalMin
	}
	if req.IntervalMax > 0 {
		strategy.IntervalMax = req.IntervalMax
	}
	strategy.IntervalMin, strategy.IntervalMax = normalizeIntervalRange(strategy.IntervalMin, strategy.IntervalMax)

	// 验证时间格式
	if req.TimeStart != "" {
		if err := validateTimeFormat(req.TimeStart); err != nil {
			return err
		}
		strategy.TimeStart = req.TimeStart
	}
	if req.TimeEnd != "" {
		if err := validateTimeFormat(req.TimeEnd); err != nil {
			return err
		}
		strategy.TimeEnd = req.TimeEnd
	}
	// 验证时间范围
	if err := validateTimeRange(strategy.TimeStart, strategy.TimeEnd); err != nil {
		return err
	}

	strategy.SkipWeekend = req.SkipWeekend
	if req.AmountMin > 0 {
		strategy.AmountMin = req.AmountMin
	}
	if req.AmountMax > 0 {
		strategy.AmountMax = req.AmountMax
	}
	strategy.AmountMin, strategy.AmountMax = normalizeAmountRange(strategy.AmountMin, strategy.AmountMax)

	if req.DailyLimit > 0 {
		strategy.DailyLimit = req.DailyLimit
	}

	if err := a.store.UpdateStrategy(strategy); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新策略失败")
	}

	return c.JSON(http.StatusOK, toStrategyResponse(strategy))
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
		return errForbidden(msgNoAccess)
	}

	if err := a.store.DeleteStrategy(strategyID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "删除策略失败")
	}

	return c.NoContent(http.StatusNoContent)
}
