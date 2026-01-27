package store

import (
	"time"

	"github.com/CoxxA/nomadbank/store/model"
)

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
	tasks := make([]model.TransferTask, 0)
	if err := s.db.Preload("FromBank").Preload("ToBank").
		Where("user_id = ?", userID).
		Order("exec_date ASC").
		Find(&tasks).Error; err != nil {
		return nil, err
	}
	return tasks, nil
}

func (s *Store) ListTasksByUserIDPaged(
	userID string,
	filter TaskListFilter,
	page int,
	pageSize int,
) ([]model.TransferTask, error) {
	tasks := make([]model.TransferTask, 0)
	offset := (page - 1) * pageSize
	query := s.applyTaskFilters(s.db.Preload("FromBank").Preload("ToBank").Model(&model.TransferTask{}), userID, filter)
	if err := query.Order("exec_date ASC, id ASC").Offset(offset).Limit(pageSize).Find(&tasks).Error; err != nil {
		return nil, err
	}
	return tasks, nil
}

func (s *Store) CountTasksByUserID(userID string, filter TaskListFilter) (int64, error) {
	var count int64
	query := s.applyTaskFilters(s.db.Model(&model.TransferTask{}), userID, filter)
	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (s *Store) ListTaskCycles(userID string) ([]int, error) {
	cycles := make([]int, 0)
	if err := s.db.Model(&model.TransferTask{}).
		Where("user_id = ?", userID).
		Distinct().
		Order("cycle ASC").
		Pluck("cycle", &cycles).Error; err != nil {
		return nil, err
	}
	return cycles, nil
}

func (s *Store) ListPendingTasksByFromBankIDs(userID string, bankIDs []string) ([]model.TransferTask, error) {
	tasks := make([]model.TransferTask, 0)
	if len(bankIDs) == 0 {
		return tasks, nil
	}
	if err := s.db.Preload("ToBank").
		Where("user_id = ? AND status = ? AND from_bank_id IN ?", userID, model.TaskStatusPending, bankIDs).
		Order("exec_date ASC, id ASC").
		Find(&tasks).Error; err != nil {
		return nil, err
	}
	return tasks, nil
}

// ListPendingTasksByUserID 获取用户的待执行任务
func (s *Store) ListPendingTasksByUserID(userID string) ([]model.TransferTask, error) {
	tasks := make([]model.TransferTask, 0)
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
	tasks := make([]model.TransferTask, 0)
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
