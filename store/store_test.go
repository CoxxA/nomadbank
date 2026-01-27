package store

import (
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/CoxxA/nomadbank/store/model"
)

// setupTestDB 创建内存测试数据库
func setupTestDB(t *testing.T) *Store {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("打开测试数据库失败: %v", err)
	}

	// 自动迁移
	err = db.AutoMigrate(
		&model.User{},
		&model.Bank{},
		&model.Strategy{},
		&model.TransferTask{},
		&model.NotificationChannel{},
	)
	if err != nil {
		t.Fatalf("数据库迁移失败: %v", err)
	}

	return New(db)
}

// ========== User 测试 ==========

func TestCreateUser(t *testing.T) {
	store := setupTestDB(t)

	user := &model.User{
		ID:           uuid.New().String(),
		Username:     "testuser",
		PasswordHash: "hashedpassword",
		Role:         model.UserRoleUser,
		Nickname:     "Test User",
	}

	err := store.CreateUser(user)
	if err != nil {
		t.Fatalf("创建用户失败: %v", err)
	}

	// 验证用户已创建
	found, err := store.GetUserByID(user.ID)
	if err != nil {
		t.Fatalf("获取用户失败: %v", err)
	}
	if found.Username != user.Username {
		t.Errorf("用户名不匹配: got %s, want %s", found.Username, user.Username)
	}
}

func TestGetUserByUsername(t *testing.T) {
	store := setupTestDB(t)

	user := &model.User{
		ID:           uuid.New().String(),
		Username:     "findme",
		PasswordHash: "hashedpassword",
		Role:         model.UserRoleUser,
	}
	_ = store.CreateUser(user)

	// 测试查找存在的用户
	found, err := store.GetUserByUsername("findme")
	if err != nil {
		t.Fatalf("获取用户失败: %v", err)
	}
	if found.ID != user.ID {
		t.Errorf("用户 ID 不匹配: got %s, want %s", found.ID, user.ID)
	}

	// 测试查找不存在的用户
	_, err = store.GetUserByUsername("notexist")
	if err == nil {
		t.Error("应该返回错误，但没有")
	}
}

func TestUpdateUser(t *testing.T) {
	store := setupTestDB(t)

	user := &model.User{
		ID:           uuid.New().String(),
		Username:     "updateme",
		PasswordHash: "oldpassword",
		Role:         model.UserRoleUser,
		Nickname:     "Old Name",
	}
	_ = store.CreateUser(user)

	// 更新用户
	user.Nickname = "New Name"
	user.PasswordHash = "newpassword"
	err := store.UpdateUser(user)
	if err != nil {
		t.Fatalf("更新用户失败: %v", err)
	}

	// 验证更新
	found, _ := store.GetUserByID(user.ID)
	if found.Nickname != "New Name" {
		t.Errorf("昵称未更新: got %s, want %s", found.Nickname, "New Name")
	}
	if found.PasswordHash != "newpassword" {
		t.Errorf("密码未更新")
	}
}

func TestDeleteUser(t *testing.T) {
	store := setupTestDB(t)

	user := &model.User{
		ID:           uuid.New().String(),
		Username:     "deleteme",
		PasswordHash: "password",
		Role:         model.UserRoleUser,
	}
	_ = store.CreateUser(user)

	// 删除用户
	err := store.DeleteUser(user.ID)
	if err != nil {
		t.Fatalf("删除用户失败: %v", err)
	}

	// 验证已删除
	_, err = store.GetUserByID(user.ID)
	if err == nil {
		t.Error("用户应该已被删除")
	}
}

func TestCountUsers(t *testing.T) {
	store := setupTestDB(t)

	// 初始应该是 0
	count, err := store.CountUsers()
	if err != nil {
		t.Fatalf("统计用户失败: %v", err)
	}
	if count != 0 {
		t.Errorf("初始用户数应为 0: got %d", count)
	}

	// 创建用户后应该是 1
	user := &model.User{
		ID:           uuid.New().String(),
		Username:     "user1",
		PasswordHash: "password",
		Role:         model.UserRoleUser,
	}
	_ = store.CreateUser(user)

	count, _ = store.CountUsers()
	if count != 1 {
		t.Errorf("用户数应为 1: got %d", count)
	}
}

func TestListUsers(t *testing.T) {
	store := setupTestDB(t)

	// 创建多个用户
	for i := 0; i < 3; i++ {
		user := &model.User{
			ID:           uuid.New().String(),
			Username:     "user" + string(rune('a'+i)),
			PasswordHash: "password",
			Role:         model.UserRoleUser,
		}
		_ = store.CreateUser(user)
	}

	users, err := store.ListUsers()
	if err != nil {
		t.Fatalf("获取用户列表失败: %v", err)
	}
	if len(users) != 3 {
		t.Errorf("用户数量不匹配: got %d, want 3", len(users))
	}
}

// ========== Strategy 测试 ==========

func TestCreateStrategy(t *testing.T) {
	store := setupTestDB(t)

	strategy := &model.Strategy{
		ID:          uuid.New().String(),
		UserID:      "user123",
		Name:        "测试策略",
		IntervalMin: 30,
		IntervalMax: 60,
		TimeStart:   "09:00",
		TimeEnd:     "18:00",
		AmountMin:   10,
		AmountMax:   100,
		DailyLimit:  5,
		IsSystem:    false,
	}

	err := store.CreateStrategy(strategy)
	if err != nil {
		t.Fatalf("创建策略失败: %v", err)
	}

	found, err := store.GetStrategyByID(strategy.ID)
	if err != nil {
		t.Fatalf("获取策略失败: %v", err)
	}
	if found.Name != strategy.Name {
		t.Errorf("策略名称不匹配: got %s, want %s", found.Name, strategy.Name)
	}
}

func TestListStrategiesByUserID(t *testing.T) {
	store := setupTestDB(t)

	userID := "user123"

	// 创建系统策略
	systemStrategy := &model.Strategy{
		ID:       uuid.New().String(),
		UserID:   "",
		Name:     "系统策略",
		IsSystem: true,
	}
	_ = store.CreateStrategy(systemStrategy)

	// 创建用户策略
	userStrategy := &model.Strategy{
		ID:       uuid.New().String(),
		UserID:   userID,
		Name:     "用户策略",
		IsSystem: false,
	}
	_ = store.CreateStrategy(userStrategy)

	// 创建其他用户的策略
	otherStrategy := &model.Strategy{
		ID:       uuid.New().String(),
		UserID:   "other_user",
		Name:     "其他用户策略",
		IsSystem: false,
	}
	_ = store.CreateStrategy(otherStrategy)

	// 获取用户策略列表（应包含系统策略和用户自己的策略）
	strategies, err := store.ListStrategiesByUserID(userID)
	if err != nil {
		t.Fatalf("获取策略列表失败: %v", err)
	}

	if len(strategies) != 2 {
		t.Errorf("策略数量不匹配: got %d, want 2", len(strategies))
	}

	// 验证系统策略在前
	if !strategies[0].IsSystem {
		t.Error("系统策略应该排在前面")
	}
}

// ========== Notification 测试 ==========

func TestCreateNotification(t *testing.T) {
	store := setupTestDB(t)

	notification := &model.NotificationChannel{
		ID:        uuid.New().String(),
		UserID:    "user123",
		Name:      "测试通知",
		Type:      model.NotificationTypeBark,
		Config:    `{"device_key": "test"}`,
		IsEnabled: true,
	}

	err := store.CreateNotification(notification)
	if err != nil {
		t.Fatalf("创建通知渠道失败: %v", err)
	}

	found, err := store.GetNotificationByID(notification.ID)
	if err != nil {
		t.Fatalf("获取通知渠道失败: %v", err)
	}
	if found.Name != notification.Name {
		t.Errorf("通知渠道名称不匹配: got %s, want %s", found.Name, notification.Name)
	}
}

func TestGetNotificationByID_NotFound(t *testing.T) {
	store := setupTestDB(t)

	_, err := store.GetNotificationByID("nonexistent")
	if err == nil {
		t.Error("应该返回错误，但没有")
	}
}

func TestListNotificationsByUserID(t *testing.T) {
	store := setupTestDB(t)

	userID := "user123"

	// 创建用户的通知渠道
	for i := 0; i < 2; i++ {
		notification := &model.NotificationChannel{
			ID:        uuid.New().String(),
			UserID:    userID,
			Name:      "通知" + string(rune('A'+i)),
			Type:      model.NotificationTypeBark,
			IsEnabled: true,
		}
		_ = store.CreateNotification(notification)
	}

	// 创建其他用户的通知渠道
	otherNotification := &model.NotificationChannel{
		ID:        uuid.New().String(),
		UserID:    "other_user",
		Name:      "其他用户通知",
		Type:      model.NotificationTypeTelegram,
		IsEnabled: true,
	}
	_ = store.CreateNotification(otherNotification)

	// 获取用户的通知渠道列表
	notifications, err := store.ListNotificationsByUserID(userID)
	if err != nil {
		t.Fatalf("获取通知渠道列表失败: %v", err)
	}

	if len(notifications) != 2 {
		t.Errorf("通知渠道数量不匹配: got %d, want 2", len(notifications))
	}
}

func TestDeleteNotification(t *testing.T) {
	store := setupTestDB(t)

	notification := &model.NotificationChannel{
		ID:        uuid.New().String(),
		UserID:    "user123",
		Name:      "待删除通知",
		Type:      model.NotificationTypeBark,
		IsEnabled: true,
	}
	_ = store.CreateNotification(notification)

	// 删除通知渠道
	err := store.DeleteNotification(notification.ID)
	if err != nil {
		t.Fatalf("删除通知渠道失败: %v", err)
	}

	// 验证已删除
	_, err = store.GetNotificationByID(notification.ID)
	if err == nil {
		t.Error("通知渠道应该已被删除")
	}
}

// ========== DashboardStats 测试 ==========

func TestGetDashboardStats(t *testing.T) {
	store := setupTestDB(t)

	userID := "user123"

	// 创建测试数据
	// 银行（2 个活跃，1 个停用）
	for i := 0; i < 2; i++ {
		bank := &model.Bank{
			ID:       uuid.New().String(),
			UserID:   userID,
			Name:     "银行" + string(rune('A'+i)),
			IsActive: true,
		}
		_ = store.db.Create(bank).Error
	}
	// 创建停用的银行，然后更新为停用状态
	inactiveBankID := uuid.New().String()
	inactiveBank := &model.Bank{
		ID:     inactiveBankID,
		UserID: userID,
		Name:   "停用银行",
	}
	_ = store.db.Create(inactiveBank).Error
	// 更新为停用状态
	_ = store.db.Model(&model.Bank{}).Where("id = ?", inactiveBankID).Update("is_active", false).Error

	// 任务
	for i := 0; i < 5; i++ {
		task := &model.TransferTask{
			ID:     uuid.New().String(),
			UserID: userID,
			Status: model.TaskStatusPending,
		}
		if i < 2 {
			task.Status = model.TaskStatusCompleted
		}
		_ = store.db.Create(task).Error
	}

	// 策略
	strategy := &model.Strategy{
		ID:     uuid.New().String(),
		UserID: userID,
		Name:   "用户策略",
	}
	_ = store.CreateStrategy(strategy)

	// 通知渠道
	notification := &model.NotificationChannel{
		ID:     uuid.New().String(),
		UserID: userID,
		Name:   "通知",
		Type:   model.NotificationTypeBark,
	}
	_ = store.CreateNotification(notification)

	// 获取统计数据
	stats, err := store.GetDashboardStats(userID)
	if err != nil {
		t.Fatalf("获取统计数据失败: %v", err)
	}

	if stats.TotalBanks != 3 {
		t.Errorf("总银行数不匹配: got %d, want 3", stats.TotalBanks)
	}
	if stats.ActiveBanks != 2 {
		t.Errorf("活跃银行数不匹配: got %d, want 2", stats.ActiveBanks)
	}
	if stats.TotalTasks != 5 {
		t.Errorf("总任务数不匹配: got %d, want 5", stats.TotalTasks)
	}
	if stats.CompletedTasks != 2 {
		t.Errorf("已完成任务数不匹配: got %d, want 2", stats.CompletedTasks)
	}
	if stats.PendingTasks != 3 {
		t.Errorf("待处理任务数不匹配: got %d, want 3", stats.PendingTasks)
	}
	if stats.TotalStrategies != 1 {
		t.Errorf("策略数不匹配: got %d, want 1", stats.TotalStrategies)
	}
	if stats.TotalNotifications != 1 {
		t.Errorf("通知渠道数不匹配: got %d, want 1", stats.TotalNotifications)
	}
}
