package v1

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/internal/consts"
	"github.com/CoxxA/nomadbank/store/model"
)

func TestStrategyList_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")

	// 创建一个用户策略
	strategy := &model.Strategy{
		ID:          "strategy-1",
		UserID:      user.ID,
		Name:        "Test Strategy",
		IntervalMin: 30,
		IntervalMax: 60,
		TimeStart:   "09:00",
		TimeEnd:     "18:00",
		AmountMin:   10,
		AmountMax:   100,
		DailyLimit:  3,
		IsSystem:    false,
	}
	if err := env.store.CreateStrategy(strategy); err != nil {
		t.Fatalf("create strategy: %v", err)
	}

	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/strategies", "")
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.List(c); err != nil {
		t.Fatalf("list: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var strategies []*StrategyResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &strategies); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	// 应该包含系统策略 + 用户策略
	// 注意：数据库初始化时会创建系统策略
	if len(strategies) < 1 {
		t.Errorf("strategies count = %d, want >= 1", len(strategies))
	}
	// 验证用户策略在列表中
	found := false
	for _, s := range strategies {
		if s.Name == "Test Strategy" {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected user strategy in list")
	}
}

func TestStrategyList_ReturnsSystemStrategies(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/strategies", "")
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.List(c); err != nil {
		t.Fatalf("list: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var strategies []*StrategyResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &strategies); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	// 数据库初始化时会创建系统策略
	// 即使用户没有自定义策略，也应该有系统策略
	if len(strategies) == 0 {
		t.Error("expected at least system strategies")
	}
	// 验证有系统策略
	hasSystem := false
	for _, s := range strategies {
		if s.IsSystem {
			hasSystem = true
			break
		}
	}
	if !hasSystem {
		t.Error("expected system strategies in list")
	}
}

func TestStrategyCreate_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/strategies", `{
		"name": "New Strategy",
		"interval_min": 30,
		"interval_max": 60,
		"time_start": "09:00",
		"time_end": "18:00",
		"skip_weekend": true,
		"amount_min": 10,
		"amount_max": 100,
		"daily_limit": 5
	}`)
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.Create(c); err != nil {
		t.Fatalf("create: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusCreated)

	var strategy StrategyResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &strategy); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if strategy.Name != "New Strategy" {
		t.Errorf("name = %q, want New Strategy", strategy.Name)
	}
	if !strategy.SkipWeekend {
		t.Error("expected skip_weekend = true")
	}
}

func TestStrategyCreate_WithDefaults(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewStrategyAPI(env.store)

	// 只提供名称，其他使用默认值
	req, rec := env.newRequest(http.MethodPost, "/api/v1/strategies", `{
		"name": "Default Strategy"
	}`)
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.Create(c); err != nil {
		t.Fatalf("create: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusCreated)

	var strategy StrategyResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &strategy); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if strategy.IntervalMin != consts.DefaultStrategyIntervalMin {
		t.Errorf("interval_min = %d, want %d", strategy.IntervalMin, consts.DefaultStrategyIntervalMin)
	}
	if strategy.IntervalMax != consts.DefaultStrategyIntervalMax {
		t.Errorf("interval_max = %d, want %d", strategy.IntervalMax, consts.DefaultStrategyIntervalMax)
	}
}

func TestStrategyCreate_InvalidName(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/strategies", `{
		"name": ""
	}`)
	c := env.newContextWithUser(req, rec, user.ID)

	err := api.Create(c)
	if err == nil {
		t.Fatal("expected error for empty name")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusBadRequest)
	}
}

func TestStrategyCreate_InvalidTimeFormat(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/strategies", `{
		"name": "Test",
		"time_start": "invalid"
	}`)
	c := env.newContextWithUser(req, rec, user.ID)

	err := api.Create(c)
	if err == nil {
		t.Fatal("expected error for invalid time format")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusBadRequest)
	}
}

func TestStrategyGet_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")

	strategy := &model.Strategy{
		ID:          "strategy-1",
		UserID:      user.ID,
		Name:        "Test Strategy",
		IntervalMin: 30,
		IntervalMax: 60,
		TimeStart:   "09:00",
		TimeEnd:     "18:00",
	}
	if err := env.store.CreateStrategy(strategy); err != nil {
		t.Fatalf("create strategy: %v", err)
	}

	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/strategies/"+strategy.ID, "")
	c := env.newContextWithUser(req, rec, user.ID)
	c.SetParamNames("id")
	c.SetParamValues(strategy.ID)

	if err := api.Get(c); err != nil {
		t.Fatalf("get: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var resp StrategyResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Name != "Test Strategy" {
		t.Errorf("name = %q, want Test Strategy", resp.Name)
	}
}

func TestStrategyGet_NotFound(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/strategies/nonexistent", "")
	c := env.newContextWithUser(req, rec, user.ID)
	c.SetParamNames("id")
	c.SetParamValues("nonexistent")

	err := api.Get(c)
	if err == nil {
		t.Fatal("expected error for non-existent strategy")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusNotFound)
	}
}

func TestStrategyGet_OtherUserStrategy(t *testing.T) {
	env := newTestEnv(t)
	user1 := env.createAdminUser("user-1", "user1", "password123")
	user2 := env.createNormalUser("user-2", "user2", "password123")

	strategy := &model.Strategy{
		ID:          "strategy-1",
		UserID:      user1.ID,
		Name:        "User1 Strategy",
		IntervalMin: 30,
		IntervalMax: 60,
		IsSystem:    false,
	}
	if err := env.store.CreateStrategy(strategy); err != nil {
		t.Fatalf("create strategy: %v", err)
	}

	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/strategies/"+strategy.ID, "")
	c := env.newContextWithUser(req, rec, user2.ID)
	c.SetParamNames("id")
	c.SetParamValues(strategy.ID)

	err := api.Get(c)
	if err == nil {
		t.Fatal("expected error when accessing other user's strategy")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusForbidden)
	}
}

func TestStrategyUpdate_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")

	strategy := &model.Strategy{
		ID:          "strategy-1",
		UserID:      user.ID,
		Name:        "Old Name",
		IntervalMin: 30,
		IntervalMax: 60,
		TimeStart:   "09:00",
		TimeEnd:     "18:00",
		IsSystem:    false,
	}
	if err := env.store.CreateStrategy(strategy); err != nil {
		t.Fatalf("create strategy: %v", err)
	}

	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/strategies/"+strategy.ID, `{
		"name": "New Name",
		"interval_min": 15,
		"interval_max": 45
	}`)
	c := env.newContextWithUser(req, rec, user.ID)
	c.SetParamNames("id")
	c.SetParamValues(strategy.ID)

	if err := api.Update(c); err != nil {
		t.Fatalf("update: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var resp StrategyResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Name != "New Name" {
		t.Errorf("name = %q, want New Name", resp.Name)
	}
	if resp.IntervalMin != 15 {
		t.Errorf("interval_min = %d, want 15", resp.IntervalMin)
	}
}

func TestStrategyUpdate_SystemStrategy(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")

	strategy := &model.Strategy{
		ID:          "strategy-1",
		UserID:      "",
		Name:        "System Strategy",
		IntervalMin: 30,
		IntervalMax: 60,
		IsSystem:    true,
	}
	if err := env.store.CreateStrategy(strategy); err != nil {
		t.Fatalf("create strategy: %v", err)
	}

	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/strategies/"+strategy.ID, `{
		"name": "Modified"
	}`)
	c := env.newContextWithUser(req, rec, user.ID)
	c.SetParamNames("id")
	c.SetParamValues(strategy.ID)

	err := api.Update(c)
	if err == nil {
		t.Fatal("expected error when updating system strategy")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusForbidden)
	}
}

func TestStrategyDelete_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")

	strategy := &model.Strategy{
		ID:          "strategy-1",
		UserID:      user.ID,
		Name:        "To Delete",
		IntervalMin: 30,
		IntervalMax: 60,
		IsSystem:    false,
	}
	if err := env.store.CreateStrategy(strategy); err != nil {
		t.Fatalf("create strategy: %v", err)
	}

	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodDelete, "/api/v1/strategies/"+strategy.ID, "")
	c := env.newContextWithUser(req, rec, user.ID)
	c.SetParamNames("id")
	c.SetParamValues(strategy.ID)

	if err := api.Delete(c); err != nil {
		t.Fatalf("delete: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusNoContent)

	// 验证策略已删除
	_, err := env.store.GetStrategyByID(strategy.ID)
	if err == nil {
		t.Error("expected strategy to be deleted")
	}
}

func TestStrategyDelete_SystemStrategy(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")

	strategy := &model.Strategy{
		ID:          "strategy-1",
		UserID:      "",
		Name:        "System Strategy",
		IntervalMin: 30,
		IntervalMax: 60,
		IsSystem:    true,
	}
	if err := env.store.CreateStrategy(strategy); err != nil {
		t.Fatalf("create strategy: %v", err)
	}

	api := NewStrategyAPI(env.store)

	req, rec := env.newRequest(http.MethodDelete, "/api/v1/strategies/"+strategy.ID, "")
	c := env.newContextWithUser(req, rec, user.ID)
	c.SetParamNames("id")
	c.SetParamValues(strategy.ID)

	err := api.Delete(c)
	if err == nil {
		t.Fatal("expected error when deleting system strategy")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusForbidden)
	}
}
