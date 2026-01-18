package store

import (
	"time"

	"github.com/CoxxA/nomadbank/store/model"
	"gorm.io/gorm"
)

// Store 数据存储接口
type Store struct {
	db *gorm.DB
}

// New 创建 Store 实例
func New(db *gorm.DB) *Store {
	return &Store{db: db}
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
	var users []model.User
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

// ========== Bank 操作 ==========

// CreateBank 创建银行
func (s *Store) CreateBank(bank *model.Bank) error {
	return s.db.Create(bank).Error
}

// GetBankByID 根据 ID 获取银行
func (s *Store) GetBankByID(id string) (*model.Bank, error) {
	var bank model.Bank
	if err := s.db.Preload("Strategy").First(&bank, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &bank, nil
}

// ListBanksByUserID 获取用户的所有银行
func (s *Store) ListBanksByUserID(userID string) ([]model.Bank, error) {
	var banks []model.Bank
	if err := s.db.Preload("Strategy").Where("user_id = ?", userID).Find(&banks).Error; err != nil {
		return nil, err
	}
	return banks, nil
}

// ListActiveBanksByUserID 获取用户的活跃银行
func (s *Store) ListActiveBanksByUserID(userID string) ([]model.Bank, error) {
	var banks []model.Bank
	if err := s.db.Where("user_id = ? AND is_active = ?", userID, true).Find(&banks).Error; err != nil {
		return nil, err
	}
	return banks, nil
}

// UpdateBank 更新银行
func (s *Store) UpdateBank(bank *model.Bank) error {
	return s.db.Save(bank).Error
}

// DeleteBank 删除银行
func (s *Store) DeleteBank(id string) error {
	return s.db.Delete(&model.Bank{}, "id = ?", id).Error
}

// ListActiveBanksByIDs 根据 ID 列表获取活跃银行
func (s *Store) ListActiveBanksByIDs(userID string, bankIDs []string) ([]model.Bank, error) {
	var banks []model.Bank
	if err := s.db.Where("user_id = ? AND is_active = ? AND id IN ?", userID, true, bankIDs).Find(&banks).Error; err != nil {
		return nil, err
	}
	return banks, nil
}

// ListActiveBanksByTagID 根据标签获取活跃银行
func (s *Store) ListActiveBanksByTagID(userID string, tagID string) ([]model.Bank, error) {
	var banks []model.Bank
	if err := s.db.Joins("JOIN bank_tags ON bank_tags.bank_id = banks.id").
		Where("banks.user_id = ? AND banks.is_active = ? AND bank_tags.tag_id = ?", userID, true, tagID).
		Find(&banks).Error; err != nil {
		return nil, err
	}
	return banks, nil
}

// ListActiveBanksByGroup 根据分组获取活跃银行
func (s *Store) ListActiveBanksByGroup(userID string, groupName string) ([]model.Bank, error) {
	var banks []model.Bank
	if err := s.db.Where("user_id = ? AND is_active = ? AND group_name = ?", userID, true, groupName).Find(&banks).Error; err != nil {
		return nil, err
	}
	return banks, nil
}

// BankWithTags 带标签的银行
type BankWithTags struct {
	model.Bank
	Tags []model.Tag `json:"tags"`
}

// ListBanksWithTagsByUserID 获取用户的所有银行（包含标签）
func (s *Store) ListBanksWithTagsByUserID(userID string) ([]BankWithTags, error) {
	var banks []model.Bank
	if err := s.db.Where("user_id = ?", userID).Find(&banks).Error; err != nil {
		return nil, err
	}

	// 获取所有银行ID
	bankIDs := make([]string, len(banks))
	for i, bank := range banks {
		bankIDs[i] = bank.ID
	}

	// 获取所有银行的标签关联
	var bankTags []model.BankTag
	if len(bankIDs) > 0 {
		s.db.Where("bank_id IN ?", bankIDs).Find(&bankTags)
	}

	// 获取所有涉及的标签
	tagIDs := make([]string, 0)
	for _, bt := range bankTags {
		tagIDs = append(tagIDs, bt.TagID)
	}
	var tags []model.Tag
	if len(tagIDs) > 0 {
		s.db.Where("id IN ?", tagIDs).Find(&tags)
	}

	// 构建标签ID到标签的映射
	tagMap := make(map[string]model.Tag)
	for _, tag := range tags {
		tagMap[tag.ID] = tag
	}

	// 构建银行ID到标签列表的映射
	bankTagsMap := make(map[string][]model.Tag)
	for _, bt := range bankTags {
		if tag, exists := tagMap[bt.TagID]; exists {
			bankTagsMap[bt.BankID] = append(bankTagsMap[bt.BankID], tag)
		}
	}

	// 构建结果
	result := make([]BankWithTags, len(banks))
	for i, bank := range banks {
		result[i] = BankWithTags{
			Bank: bank,
			Tags: bankTagsMap[bank.ID],
		}
		if result[i].Tags == nil {
			result[i].Tags = []model.Tag{}
		}
	}

	return result, nil
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
	var strategies []model.Strategy
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

// ========== Task 操作 ==========

// CreateTask 创建任务
func (s *Store) CreateTask(task *model.TransferTask) error {
	return s.db.Create(task).Error
}

// CreateTasks 批量创建任务
func (s *Store) CreateTasks(tasks []model.TransferTask) error {
	return s.db.Create(&tasks).Error
}

// GetTaskByID 根据 ID 获取任务
func (s *Store) GetTaskByID(id string) (*model.TransferTask, error) {
	var task model.TransferTask
	if err := s.db.Preload("FromBank").Preload("ToBank").First(&task, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

// ListTasksByUserID 获取用户的所有任务
func (s *Store) ListTasksByUserID(userID string) ([]model.TransferTask, error) {
	var tasks []model.TransferTask
	if err := s.db.Preload("FromBank").Preload("ToBank").
		Where("user_id = ?", userID).
		Order("exec_date ASC").
		Find(&tasks).Error; err != nil {
		return nil, err
	}
	return tasks, nil
}

// ListPendingTasksByUserID 获取用户的待执行任务
func (s *Store) ListPendingTasksByUserID(userID string) ([]model.TransferTask, error) {
	var tasks []model.TransferTask
	if err := s.db.Preload("FromBank").Preload("ToBank").
		Where("user_id = ? AND status = ?", userID, model.TaskStatusPending).
		Order("exec_date ASC").
		Find(&tasks).Error; err != nil {
		return nil, err
	}
	return tasks, nil
}

// ListCompletedTasksByUserID 获取用户的已完成任务
func (s *Store) ListCompletedTasksByUserID(userID string) ([]model.TransferTask, error) {
	var tasks []model.TransferTask
	if err := s.db.Where("user_id = ? AND status = ?", userID, model.TaskStatusCompleted).
		Order("completed_at DESC").
		Find(&tasks).Error; err != nil {
		return nil, err
	}
	return tasks, nil
}

// UpdateTask 更新任务
func (s *Store) UpdateTask(task *model.TransferTask) error {
	return s.db.Save(task).Error
}

// DeleteTasksByUserID 删除用户的所有任务
func (s *Store) DeleteTasksByUserID(userID string) error {
	return s.db.Delete(&model.TransferTask{}, "user_id = ?", userID).Error
}

// GetLastTaskCycleAndDate 获取指定分组的最大周期和该周期的最后执行日期
// groupName 为空字符串表示"全部银行"
func (s *Store) GetLastTaskCycleAndDate(userID string, groupName string) (int, time.Time) {
	// 直接获取该分组最后一条任务（按周期降序、日期降序）
	var task model.TransferTask
	err := s.db.Where("user_id = ? AND group_name = ?", userID, groupName).
		Order("cycle DESC, exec_date DESC").
		First(&task).Error

	if err != nil {
		return 0, time.Time{}
	}

	return task.Cycle, task.ExecDate
}

// ========== Notification 操作 ==========

// CreateNotification 创建通知渠道
func (s *Store) CreateNotification(notification *model.NotificationChannel) error {
	return s.db.Create(notification).Error
}

// ListNotificationsByUserID 获取用户的所有通知渠道
func (s *Store) ListNotificationsByUserID(userID string) ([]model.NotificationChannel, error) {
	var notifications []model.NotificationChannel
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

// ========== Tag 操作 ==========

// CreateTag 创建标签
func (s *Store) CreateTag(tag *model.Tag) error {
	return s.db.Create(tag).Error
}

// ListTagsByUserID 获取用户的所有标签
func (s *Store) ListTagsByUserID(userID string) ([]model.Tag, error) {
	var tags []model.Tag
	if err := s.db.Where("user_id = ?", userID).Find(&tags).Error; err != nil {
		return nil, err
	}
	return tags, nil
}

// DeleteTag 删除标签
func (s *Store) DeleteTag(id string) error {
	return s.db.Delete(&model.Tag{}, "id = ?", id).Error
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
