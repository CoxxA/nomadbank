package model

import (
	"encoding/json"
	"time"
)

// NotificationType 通知渠道类型
type NotificationType string

const (
	NotificationTypeBark     NotificationType = "bark"
	NotificationTypeTelegram NotificationType = "telegram"
	NotificationTypeWebhook  NotificationType = "webhook"
)

// NotificationChannel 通知渠道模型
type NotificationChannel struct {
	ID        string           `gorm:"primaryKey;size:36" json:"id"`
	UserID    string           `gorm:"index;size:36;not null" json:"user_id"`
	Name      string           `gorm:"size:255;not null" json:"name"`
	Type      NotificationType `gorm:"size:20;not null" json:"type"`
	Config    string           `gorm:"type:text" json:"-"` // JSON 存储配置
	IsEnabled bool             `gorm:"default:true" json:"is_enabled"`
	CreatedAt time.Time        `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time        `gorm:"autoUpdateTime" json:"updated_at"`
}

// TableName 表名
func (NotificationChannel) TableName() string {
	return "notification_channels"
}

// GetConfig 解析配置 JSON
func (n *NotificationChannel) GetConfig() map[string]interface{} {
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(n.Config), &config); err != nil {
		return make(map[string]interface{})
	}
	return config
}

// SetConfig 设置配置 JSON
func (n *NotificationChannel) SetConfig(config map[string]interface{}) error {
	data, err := json.Marshal(config)
	if err != nil {
		return err
	}
	n.Config = string(data)
	return nil
}
