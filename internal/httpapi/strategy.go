package httpapi

import (
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
)

type strategyRequest struct {
	Name             *string `json:"name"`
	IntervalMinDays  *int    `json:"interval_min_days"`
	IntervalMaxDays  *int    `json:"interval_max_days"`
	TimeStartMinutes *int    `json:"time_start_minutes"`
	TimeEndMinutes   *int    `json:"time_end_minutes"`
	SkipWeekends     *bool   `json:"skip_weekends"`
	AmountMinCents   *int64  `json:"amount_min_cents"`
	AmountMaxCents   *int64  `json:"amount_max_cents"`
	DailyLimit       *int    `json:"daily_limit"`
}

func (s *Server) listStrategies(c echo.Context) error {
	strategies, err := s.store.ListStrategies(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, strategies)
}

func (s *Server) getStrategy(c echo.Context) error {
	id, err := parseID(c.Param("id"))
	if err != nil {
		return err
	}
	strategy, err := s.store.GetStrategy(c.Request().Context(), id)
	if err != nil {
		return mapStoreError(err, "策略不存在")
	}
	return c.JSON(http.StatusOK, strategy)
}

func (s *Server) createStrategy(c echo.Context) error {
	var request strategyRequest
	if err := c.Bind(&request); err != nil {
		return badRequest("invalid_json", "请求格式错误")
	}
	strategy, err := strategyFromRequest(request, nil)
	if err != nil {
		return err
	}
	if err := s.store.CreateStrategy(c.Request().Context(), &strategy); err != nil {
		return mapStoreError(err, "策略不存在")
	}
	return c.JSON(http.StatusCreated, strategy)
}

func (s *Server) updateStrategy(c echo.Context) error {
	id, err := parseID(c.Param("id"))
	if err != nil {
		return err
	}
	existing, err := s.store.GetStrategy(c.Request().Context(), id)
	if err != nil {
		return mapStoreError(err, "策略不存在")
	}
	var request strategyRequest
	if err := c.Bind(&request); err != nil {
		return badRequest("invalid_json", "请求格式错误")
	}
	strategy, err := strategyFromRequest(request, &existing)
	if err != nil {
		return err
	}
	if err := s.store.UpdateStrategy(c.Request().Context(), &strategy); err != nil {
		return mapStoreError(err, "策略不存在")
	}
	return c.JSON(http.StatusOK, strategy)
}

func (s *Server) deleteStrategy(c echo.Context) error {
	id, err := parseID(c.Param("id"))
	if err != nil {
		return err
	}
	if err := s.store.DeleteStrategy(c.Request().Context(), id); err != nil {
		return mapStoreError(err, "策略不存在")
	}
	return c.NoContent(http.StatusNoContent)
}

func strategyFromRequest(request strategyRequest, existing *domain.Strategy) (domain.Strategy, error) {
	if request.Name == nil || request.IntervalMinDays == nil || request.IntervalMaxDays == nil ||
		request.TimeStartMinutes == nil || request.TimeEndMinutes == nil || request.SkipWeekends == nil ||
		request.AmountMinCents == nil || request.AmountMaxCents == nil || request.DailyLimit == nil {
		return domain.Strategy{}, badRequest("missing_fields", "策略字段均为必填项")
	}
	name := strings.TrimSpace(*request.Name)
	if utf8.RuneCountInString(name) < 1 || utf8.RuneCountInString(name) > 100 {
		return domain.Strategy{}, badRequest("invalid_strategy_name", "策略名称需为 1～100 个字符")
	}
	if *request.IntervalMinDays < 1 || *request.IntervalMaxDays < *request.IntervalMinDays || *request.IntervalMaxDays > 365 {
		return domain.Strategy{}, badRequest("invalid_interval", "间隔天数需在 1～365 之间，且最大值不能小于最小值")
	}
	if *request.TimeStartMinutes < 0 || *request.TimeEndMinutes > 1440 || *request.TimeEndMinutes <= *request.TimeStartMinutes {
		return domain.Strategy{}, badRequest("invalid_time_range", "执行时段无效")
	}
	if *request.AmountMinCents < 1 || *request.AmountMaxCents < *request.AmountMinCents || *request.AmountMaxCents > 100_000_000 {
		return domain.Strategy{}, badRequest("invalid_amount_range", "金额范围无效")
	}
	if *request.DailyLimit < 1 || *request.DailyLimit > 100 {
		return domain.Strategy{}, badRequest("invalid_daily_limit", "每日任务上限需在 1～100 之间")
	}

	strategy := domain.Strategy{}
	if existing != nil {
		strategy = *existing
	}
	strategy.Name = name
	strategy.IntervalMinDays = *request.IntervalMinDays
	strategy.IntervalMaxDays = *request.IntervalMaxDays
	strategy.TimeStartMinutes = *request.TimeStartMinutes
	strategy.TimeEndMinutes = *request.TimeEndMinutes
	strategy.SkipWeekends = *request.SkipWeekends
	strategy.AmountMinCents = *request.AmountMinCents
	strategy.AmountMaxCents = *request.AmountMaxCents
	strategy.DailyLimit = *request.DailyLimit
	return strategy, nil
}
