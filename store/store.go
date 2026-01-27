package store

import (
	"gorm.io/gorm"

	"github.com/CoxxA/nomadbank/store/model"
)

// Store 数据存储接口
type Store struct {
	db *gorm.DB
}

// New 创建 Store 实例
func New(db *gorm.DB) *Store {
	return &Store{db: db}
}

// Ping 检查数据库连接
func (s *Store) Ping() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}

// ========== User 操作 ==========

// CreateUser 创建用户
func (s *Store) CreateUser(user *model.User) error {
	return s.db.Create(user).Error
}

// GetUserByID 根据 ID 获取用户
func (s *Store) GetUserByID(id string) (*model.User, error) {
	var user model.User
	if err := s.db.First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByUsername 根据用户名获取用户
func (s *Store) GetUserByUsername(username string) (*model.User, error) {
	var user model.User
	if err := s.db.First(&user, "username = ?", username).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// ListUsers 获取所有用户
func (s *Store) ListUsers() ([]model.User, error) {
	users := make([]model.User, 0)
	if err := s.db.Order("created_at ASC").Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// UpdateUser 更新用户
func (s *Store) UpdateUser(user *model.User) error {
	return s.db.Save(user).Error
}

// DeleteUser 删除用户
func (s *Store) DeleteUser(id string) error {
	return s.db.Delete(&model.User{}, "id = ?", id).Error
}

// CountUsers 统计用户数量
func (s *Store) CountUsers() (int64, error) {
	var count int64
	if err := s.db.Model(&model.User{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

// ========== Strategy 操作 ==========

// CreateStrategy 创建策略
func (s *Store) CreateStrategy(strategy *model.Strategy) error {
	return s.db.Create(strategy).Error
}

// GetStrategyByID 根据 ID 获取策略
func (s *Store) GetStrategyByID(id string) (*model.Strategy, error) {
	var strategy model.Strategy
	if err := s.db.First(&strategy, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &strategy, nil
}

// ListStrategiesByUserID 获取用户的所有策略（包含系统策略）
func (s *Store) ListStrategiesByUserID(userID string) ([]model.Strategy, error) {
	strategies := make([]model.Strategy, 0)
	// 返回用户自己的策略 + 系统策略
	if err := s.db.Where("user_id = ? OR is_system = ?", userID, true).
		Order("is_system DESC, created_at ASC").
		Find(&strategies).Error; err != nil {
		return nil, err
	}
	return strategies, nil
}

// UpdateStrategy 更新策略
func (s *Store) UpdateStrategy(strategy *model.Strategy) error {
	return s.db.Save(strategy).Error
}

// DeleteStrategy 删除策略
func (s *Store) DeleteStrategy(id string) error {
	return s.db.Delete(&model.Strategy{}, "id = ?", id).Error
}

// ========== Notification 操作 ==========

// CreateNotification 创建通知渠道
func (s *Store) CreateNotification(notification *model.NotificationChannel) error {
	return s.db.Create(notification).Error
}

// GetNotificationByID 根据 ID 获取通知渠道
func (s *Store) GetNotificationByID(id string) (*model.NotificationChannel, error) {
	var notification model.NotificationChannel
	if err := s.db.First(&notification, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &notification, nil
}

// ListNotificationsByUserID 获取用户的所有通知渠道
func (s *Store) ListNotificationsByUserID(userID string) ([]model.NotificationChannel, error) {
	notifications := make([]model.NotificationChannel, 0)
	if err := s.db.Where("user_id = ?", userID).Find(&notifications).Error; err != nil {
		return nil, err
	}
	return notifications, nil
}

// UpdateNotification 更新通知渠道
func (s *Store) UpdateNotification(notification *model.NotificationChannel) error {
	return s.db.Save(notification).Error
}

// DeleteNotification 删除通知渠道
func (s *Store) DeleteNotification(id string) error {
	return s.db.Delete(&model.NotificationChannel{}, "id = ?", id).Error
}

// ========== 统计操作 ==========

// DashboardStats 仪表盘统计数据
type DashboardStats struct {
	TotalBanks         int64 `json:"total_banks"`
	ActiveBanks        int64 `json:"active_banks"`
	TotalTasks         int64 `json:"total_tasks"`
	PendingTasks       int64 `json:"pending_tasks"`
	CompletedTasks     int64 `json:"completed_tasks"`
	TotalStrategies    int64 `json:"total_strategies"`
	TotalNotifications int64 `json:"total_notifications"`
}

// GetDashboardStats 获取仪表盘统计数据
func (s *Store) GetDashboardStats(userID string) (*DashboardStats, error) {
	stats := &DashboardStats{}

	s.db.Model(&model.Bank{}).Where("user_id = ?", userID).Count(&stats.TotalBanks)
	s.db.Model(&model.Bank{}).Where("user_id = ? AND is_active = ?", userID, true).Count(&stats.ActiveBanks)
	s.db.Model(&model.TransferTask{}).Where("user_id = ?", userID).Count(&stats.TotalTasks)
	s.db.Model(&model.TransferTask{}).Where("user_id = ? AND status = ?", userID, model.TaskStatusPending).Count(&stats.PendingTasks)
	s.db.Model(&model.TransferTask{}).Where("user_id = ? AND status = ?", userID, model.TaskStatusCompleted).Count(&stats.CompletedTasks)
	// 策略数量包含系统策略
	s.db.Model(&model.Strategy{}).Where("user_id = ? OR is_system = ?", userID, true).Count(&stats.TotalStrategies)
	s.db.Model(&model.NotificationChannel{}).Where("user_id = ?", userID).Count(&stats.TotalNotifications)

	return stats, nil
}
