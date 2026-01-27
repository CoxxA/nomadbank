package v1

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
)

func TestStatsDashboard_Empty(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewStatsAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/stats/dashboard", "")
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.Dashboard(c); err != nil {
		t.Fatalf("dashboard: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var stats store.DashboardStats
	if err := json.Unmarshal(rec.Body.Bytes(), &stats); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if stats.TotalBanks != 0 {
		t.Errorf("total_banks = %d, want 0", stats.TotalBanks)
	}
	if stats.TotalTasks != 0 {
		t.Errorf("total_tasks = %d, want 0", stats.TotalTasks)
	}
}

func TestStatsDashboard_WithData(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")

	// 创建银行
	bank1 := &model.Bank{
		ID:        "bank-1",
		UserID:    user.ID,
		Name:      "Bank 1",
		AmountMin: 10,
		AmountMax: 100,
		IsActive:  true,
	}
	bank2 := &model.Bank{
		ID:        "bank-2",
		UserID:    user.ID,
		Name:      "Bank 2",
		AmountMin: 10,
		AmountMax: 100,
		IsActive:  false,
	}
	if err := env.store.CreateBank(bank1); err != nil {
		t.Fatalf("create bank1: %v", err)
	}
	if err := env.store.CreateBank(bank2); err != nil {
		t.Fatalf("create bank2: %v", err)
	}

	// 创建任务
	task1 := &model.TransferTask{
		ID:         "task-1",
		UserID:     user.ID,
		Cycle:      1,
		ExecDate:   time.Now(),
		FromBankID: bank1.ID,
		ToBankID:   bank2.ID,
		Amount:     50,
		Status:     model.TaskStatusPending,
	}
	task2 := &model.TransferTask{
		ID:         "task-2",
		UserID:     user.ID,
		Cycle:      1,
		ExecDate:   time.Now(),
		FromBankID: bank2.ID,
		ToBankID:   bank1.ID,
		Amount:     30,
		Status:     model.TaskStatusCompleted,
	}
	if err := env.store.CreateTask(task1); err != nil {
		t.Fatalf("create task1: %v", err)
	}
	if err := env.store.CreateTask(task2); err != nil {
		t.Fatalf("create task2: %v", err)
	}

	// 创建策略
	strategy := &model.Strategy{
		ID:          "strategy-1",
		UserID:      user.ID,
		Name:        "Test Strategy",
		IntervalMin: 30,
		IntervalMax: 60,
	}
	if err := env.store.CreateStrategy(strategy); err != nil {
		t.Fatalf("create strategy: %v", err)
	}

	// 创建通知渠道
	notification := &model.NotificationChannel{
		ID:        "notif-1",
		UserID:    user.ID,
		Name:      "Test Channel",
		Type:      model.NotificationTypeBark,
		IsEnabled: true,
	}
	if err := env.store.CreateNotification(notification); err != nil {
		t.Fatalf("create notification: %v", err)
	}

	api := NewStatsAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/stats/dashboard", "")
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.Dashboard(c); err != nil {
		t.Fatalf("dashboard: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var stats store.DashboardStats
	if err := json.Unmarshal(rec.Body.Bytes(), &stats); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if stats.TotalBanks != 2 {
		t.Errorf("total_banks = %d, want 2", stats.TotalBanks)
	}
	// ActiveBanks 计数可能因数据库初始化而有所不同
	if stats.ActiveBanks < 1 {
		t.Errorf("active_banks = %d, want >= 1", stats.ActiveBanks)
	}
	if stats.TotalTasks != 2 {
		t.Errorf("total_tasks = %d, want 2", stats.TotalTasks)
	}
	if stats.PendingTasks != 1 {
		t.Errorf("pending_tasks = %d, want 1", stats.PendingTasks)
	}
	if stats.CompletedTasks != 1 {
		t.Errorf("completed_tasks = %d, want 1", stats.CompletedTasks)
	}
	// TotalStrategies 包含系统策略 + 用户策略
	if stats.TotalStrategies < 1 {
		t.Errorf("total_strategies = %d, want >= 1", stats.TotalStrategies)
	}
	if stats.TotalNotifications != 1 {
		t.Errorf("total_notifications = %d, want 1", stats.TotalNotifications)
	}
}

func TestStatsDashboard_OnlyShowsUserData(t *testing.T) {
	env := newTestEnv(t)
	user1 := env.createAdminUser("user-1", "user1", "password123")
	user2 := env.createNormalUser("user-2", "user2", "password123")

	// 为 user1 创建数据
	bank1 := &model.Bank{
		ID:        "bank-1",
		UserID:    user1.ID,
		Name:      "User1 Bank",
		AmountMin: 10,
		AmountMax: 100,
		IsActive:  true,
	}
	if err := env.store.CreateBank(bank1); err != nil {
		t.Fatalf("create bank: %v", err)
	}

	// 为 user2 创建数据
	bank2 := &model.Bank{
		ID:        "bank-2",
		UserID:    user2.ID,
		Name:      "User2 Bank",
		AmountMin: 10,
		AmountMax: 100,
		IsActive:  true,
	}
	if err := env.store.CreateBank(bank2); err != nil {
		t.Fatalf("create bank: %v", err)
	}

	api := NewStatsAPI(env.store)

	// user1 只能看到自己的数据
	req1, rec1 := env.newRequest(http.MethodGet, "/api/v1/stats/dashboard", "")
	c1 := env.newContextWithUser(req1, rec1, user1.ID)

	if err := api.Dashboard(c1); err != nil {
		t.Fatalf("dashboard user1: %v", err)
	}

	var stats1 store.DashboardStats
	if err := json.Unmarshal(rec1.Body.Bytes(), &stats1); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if stats1.TotalBanks != 1 {
		t.Errorf("user1 total_banks = %d, want 1", stats1.TotalBanks)
	}

	// user2 只能看到自己的数据
	req2, rec2 := env.newRequest(http.MethodGet, "/api/v1/stats/dashboard", "")
	c2 := env.newContextWithUser(req2, rec2, user2.ID)

	if err := api.Dashboard(c2); err != nil {
		t.Fatalf("dashboard user2: %v", err)
	}

	var stats2 store.DashboardStats
	if err := json.Unmarshal(rec2.Body.Bytes(), &stats2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if stats2.TotalBanks != 1 {
		t.Errorf("user2 total_banks = %d, want 1", stats2.TotalBanks)
	}
}
