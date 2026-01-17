package model

import "time"

// Bank 银行账户模型
type Bank struct {
	ID         string    `gorm:"primaryKey;size:36" json:"id"`
	UserID     string    `gorm:"index;size:36;not null" json:"user_id"`
	Name       string    `gorm:"size:255;not null" json:"name"`
	AmountMin  float64   `gorm:"default:10" json:"amount_min"`
	AmountMax  float64   `gorm:"default:100" json:"amount_max"`
	StrategyID *string   `gorm:"size:36" json:"strategy_id"`
	GroupName  *string   `gorm:"size:100" json:"group_name"`
	IsActive   bool      `gorm:"default:true" json:"is_active"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// 关联
	Strategy *Strategy `gorm:"foreignKey:StrategyID" json:"strategy,omitempty"`
}

// TableName 表名
func (Bank) TableName() string {
	return "banks"
}
