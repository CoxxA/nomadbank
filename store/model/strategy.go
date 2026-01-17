package model

import "time"

// Strategy 保活策略模型
type Strategy struct {
	ID     string `gorm:"primaryKey;size:36" json:"id"`
	UserID string `gorm:"index;size:36" json:"user_id"` // 系统策略为空

	Name string `gorm:"size:255;not null" json:"name"`

	// 时间配置
	IntervalMin int    `gorm:"not null;default:30" json:"interval_min"`           // 最小间隔天数
	IntervalMax int    `gorm:"not null;default:60" json:"interval_max"`           // 最大间隔天数
	TimeStart   string `gorm:"size:5;not null;default:'09:00'" json:"time_start"` // 执行时段开始
	TimeEnd     string `gorm:"size:5;not null;default:'21:00'" json:"time_end"`   // 执行时段结束
	SkipWeekend bool   `gorm:"default:false" json:"skip_weekend"`                 // 是否避开周末

	// 金额配置
	AmountMin float64 `gorm:"not null;default:10" json:"amount_min"` // 最小金额
	AmountMax float64 `gorm:"not null;default:30" json:"amount_max"` // 最大金额

	// 任务配置
	DailyLimit int `gorm:"not null;default:3" json:"daily_limit"` // 单日任务上限

	// 元信息
	IsSystem  bool      `gorm:"default:false" json:"is_system"` // 是否系统预设
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// TableName 表名
func (Strategy) TableName() string {
	return "strategies"
}
