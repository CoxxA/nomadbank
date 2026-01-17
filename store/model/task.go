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
	UserID      string     `gorm:"index;size:36;not null" json:"user_id"`
	Cycle       int        `gorm:"not null" json:"cycle"`
	AnchorDate  time.Time  `gorm:"not null" json:"anchor_date"`
	ExecDate    time.Time  `gorm:"index;not null" json:"exec_date"`
	FromBankID  string     `gorm:"index;size:36;not null" json:"from_bank_id"`
	ToBankID    string     `gorm:"size:36;not null" json:"to_bank_id"`
	Amount      float64    `gorm:"not null" json:"amount"`
	Status      TaskStatus `gorm:"size:20;index;default:pending" json:"status"`
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
