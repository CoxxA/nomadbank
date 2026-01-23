package model

import "time"

// TaskStatus 任务状态
type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"   // 待执行
	TaskStatusCompleted TaskStatus = "completed" // 已完成
	TaskStatusSkipped   TaskStatus = "skipped"   // 已跳过
)

// TransferTask 转账任务模型
type TransferTask struct {
	ID          string     `gorm:"primaryKey;size:36" json:"id"`
	UserID      string     `gorm:"index:idx_tasks_user_exec,priority:1;index:idx_tasks_user_status_exec,priority:1;size:36;not null" json:"user_id"`
	GroupName   string     `gorm:"index;size:50;default:''" json:"group_name"` // 分组名称，空字符串表示"全部银行"
	Cycle       int        `gorm:"not null" json:"cycle"`
	AnchorDate  time.Time  `gorm:"not null" json:"anchor_date"`
	ExecDate    time.Time  `gorm:"index:idx_tasks_user_exec,priority:2;index:idx_tasks_user_status_exec,priority:3;not null" json:"exec_date"`
	FromBankID  string     `gorm:"index;size:36;not null" json:"from_bank_id"`
	ToBankID    string     `gorm:"size:36;not null" json:"to_bank_id"`
	Amount      float64    `gorm:"not null" json:"amount"`
	Status      TaskStatus `gorm:"index:idx_tasks_user_status_exec,priority:2;size:20;default:pending" json:"status"`
	CompletedAt *time.Time `json:"completed_at"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`

	// 关联
	FromBank *Bank `gorm:"foreignKey:FromBankID" json:"from_bank,omitempty"`
	ToBank   *Bank `gorm:"foreignKey:ToBankID" json:"to_bank,omitempty"`
}

// TableName 表名
func (TransferTask) TableName() string {
	return "transfer_tasks"
}
