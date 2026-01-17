package model

import "time"

// Tag 标签模型
type Tag struct {
	ID        string    `gorm:"primaryKey;size:36" json:"id"`
	UserID    string    `gorm:"index;size:36;not null" json:"user_id"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	Color     string    `gorm:"size:20;default:#3b82f6" json:"color"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// TableName 表名
func (Tag) TableName() string {
	return "tags"
}

// BankTag 银行-标签关联表
type BankTag struct {
	BankID string `gorm:"primaryKey;size:36" json:"bank_id"`
	TagID  string `gorm:"primaryKey;size:36" json:"tag_id"`
}

// TableName 表名
func (BankTag) TableName() string {
	return "bank_tags"
}
