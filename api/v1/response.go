package v1

import (
	"time"

	"github.com/CoxxA/nomadbank/internal/consts"
	"github.com/CoxxA/nomadbank/store/model"
)

func formatDate(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.Format(consts.DateLayout)
}

func formatDatePtr(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := formatDate(*value)
	return &formatted
}

type StrategyResponse struct {
	ID          string  `json:"id"`
	UserID      string  `json:"user_id"`
	Name        string  `json:"name"`
	IntervalMin int     `json:"interval_min"`
	IntervalMax int     `json:"interval_max"`
	TimeStart   string  `json:"time_start"`
	TimeEnd     string  `json:"time_end"`
	SkipWeekend bool    `json:"skip_weekend"`
	AmountMin   float64 `json:"amount_min"`
	AmountMax   float64 `json:"amount_max"`
	DailyLimit  int     `json:"daily_limit"`
	IsSystem    bool    `json:"is_system"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

func toStrategyResponse(strategy *model.Strategy) *StrategyResponse {
	if strategy == nil {
		return nil
	}
	return &StrategyResponse{
		ID:          strategy.ID,
		UserID:      strategy.UserID,
		Name:        strategy.Name,
		IntervalMin: strategy.IntervalMin,
		IntervalMax: strategy.IntervalMax,
		TimeStart:   strategy.TimeStart,
		TimeEnd:     strategy.TimeEnd,
		SkipWeekend: strategy.SkipWeekend,
		AmountMin:   strategy.AmountMin,
		AmountMax:   strategy.AmountMax,
		DailyLimit:  strategy.DailyLimit,
		IsSystem:    strategy.IsSystem,
		CreatedAt:   formatDate(strategy.CreatedAt),
		UpdatedAt:   formatDate(strategy.UpdatedAt),
	}
}

type BankResponse struct {
	ID         string            `json:"id"`
	UserID     string            `json:"user_id"`
	Name       string            `json:"name"`
	AmountMin  float64           `json:"amount_min"`
	AmountMax  float64           `json:"amount_max"`
	StrategyID *string           `json:"strategy_id"`
	GroupName  *string           `json:"group_name"`
	IsActive   bool              `json:"is_active"`
	CreatedAt  string            `json:"created_at"`
	UpdatedAt  string            `json:"updated_at"`
	Strategy   *StrategyResponse `json:"strategy,omitempty"`
}

func toBankResponse(bank *model.Bank) *BankResponse {
	if bank == nil {
		return nil
	}
	return &BankResponse{
		ID:         bank.ID,
		UserID:     bank.UserID,
		Name:       bank.Name,
		AmountMin:  bank.AmountMin,
		AmountMax:  bank.AmountMax,
		StrategyID: bank.StrategyID,
		GroupName:  bank.GroupName,
		IsActive:   bank.IsActive,
		CreatedAt:  formatDate(bank.CreatedAt),
		UpdatedAt:  formatDate(bank.UpdatedAt),
		Strategy:   toStrategyResponse(bank.Strategy),
	}
}

type TaskResponse struct {
	ID          string           `json:"id"`
	UserID      string           `json:"user_id"`
	GroupName   string           `json:"group_name"`
	Cycle       int              `json:"cycle"`
	AnchorDate  string           `json:"anchor_date"`
	ExecDate    string           `json:"exec_date"`
	ExecTime    string           `json:"exec_time,omitempty"`
	FromBankID  string           `json:"from_bank_id"`
	ToBankID    string           `json:"to_bank_id"`
	Amount      float64          `json:"amount"`
	Status      model.TaskStatus `json:"status"`
	CompletedAt *string          `json:"completed_at"`
	CreatedAt   string           `json:"created_at"`
	FromBank    *BankResponse    `json:"from_bank,omitempty"`
	ToBank      *BankResponse    `json:"to_bank,omitempty"`
}

func toTaskResponse(task *model.TransferTask) *TaskResponse {
	if task == nil {
		return nil
	}
	execDate := formatDate(task.ExecDate)
	execTime := ""
	if execDate != "" {
		execTime = task.ExecDate.Format(consts.TimeLayout)
	}
	return &TaskResponse{
		ID:          task.ID,
		UserID:      task.UserID,
		GroupName:   task.GroupName,
		Cycle:       task.Cycle,
		AnchorDate:  formatDate(task.AnchorDate),
		ExecDate:    execDate,
		ExecTime:    execTime,
		FromBankID:  task.FromBankID,
		ToBankID:    task.ToBankID,
		Amount:      task.Amount,
		Status:      task.Status,
		CompletedAt: formatDatePtr(task.CompletedAt),
		CreatedAt:   formatDate(task.CreatedAt),
		FromBank:    toBankResponse(task.FromBank),
		ToBank:      toBankResponse(task.ToBank),
	}
}

type NotificationResponse struct {
	ID        string                 `json:"id"`
	UserID    string                 `json:"user_id"`
	Name      string                 `json:"name"`
	Type      model.NotificationType `json:"type"`
	Config    map[string]interface{} `json:"config"`
	IsEnabled bool                   `json:"is_enabled"`
	CreatedAt string                 `json:"created_at"`
	UpdatedAt string                 `json:"updated_at"`
}

func toNotificationResponse(notification *model.NotificationChannel) *NotificationResponse {
	if notification == nil {
		return nil
	}
	return &NotificationResponse{
		ID:        notification.ID,
		UserID:    notification.UserID,
		Name:      notification.Name,
		Type:      notification.Type,
		Config:    notification.GetConfig(),
		IsEnabled: notification.IsEnabled,
		CreatedAt: formatDate(notification.CreatedAt),
		UpdatedAt: formatDate(notification.UpdatedAt),
	}
}
