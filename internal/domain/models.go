package domain

import "time"

const MaxDisplayNameRunes = 80

type Owner struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Timezone    string `json:"timezone"`
}

type Account struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	GroupName string    `json:"group_name"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Strategy struct {
	ID               int64     `json:"id"`
	Name             string    `json:"name"`
	IntervalMinDays  int       `json:"interval_min_days"`
	IntervalMaxDays  int       `json:"interval_max_days"`
	TimeStartMinutes int       `json:"time_start_minutes"`
	TimeEndMinutes   int       `json:"time_end_minutes"`
	SkipWeekends     bool      `json:"skip_weekends"`
	AmountMinCents   int64     `json:"amount_min_cents"`
	AmountMaxCents   int64     `json:"amount_max_cents"`
	DailyLimit       int       `json:"daily_limit"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"
	TaskStatusCompleted TaskStatus = "completed"
)

type TaskBatch struct {
	ID           int64     `json:"id"`
	StrategyID   *int64    `json:"strategy_id"`
	StrategyName string    `json:"strategy_name"`
	GroupName    string    `json:"group_name"`
	CycleCount   int       `json:"cycle_count"`
	TaskCount    int       `json:"task_count"`
	CreatedAt    time.Time `json:"created_at"`
}

type Task struct {
	ID              int64      `json:"id"`
	BatchID         int64      `json:"batch_id"`
	CycleNo         int        `json:"cycle_no"`
	ScheduledAt     time.Time  `json:"scheduled_at"`
	FromAccountID   int64      `json:"from_account_id"`
	FromAccountName string     `json:"from_account_name"`
	ToAccountID     int64      `json:"to_account_id"`
	ToAccountName   string     `json:"to_account_name"`
	AmountCents     int64      `json:"amount_cents"`
	Status          TaskStatus `json:"status"`
	CompletedAt     *time.Time `json:"completed_at"`
	CreatedAt       time.Time  `json:"created_at"`
}

type TaskDraft struct {
	CycleNo       int
	ScheduledAt   time.Time
	FromAccountID int64
	ToAccountID   int64
	AmountCents   int64
}

type TaskPage struct {
	Items    []Task `json:"items"`
	Total    int64  `json:"total"`
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
}

type Dashboard struct {
	TotalAccounts  int64  `json:"total_accounts"`
	ActiveAccounts int64  `json:"active_accounts"`
	PendingTasks   int64  `json:"pending_tasks"`
	CompletedTasks int64  `json:"completed_tasks"`
	Strategies     int64  `json:"strategies"`
	Upcoming       []Task `json:"upcoming"`
	Recent         []Task `json:"recent"`
}
