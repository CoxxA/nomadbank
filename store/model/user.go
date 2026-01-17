package model

import "time"

// UserRole 用户角色
type UserRole string

const (
	UserRoleAdmin UserRole = "admin" // 管理员
	UserRoleUser  UserRole = "user"  // 普通用户
)

// User 用户模型
type User struct {
	ID           string    `gorm:"primaryKey;size:36" json:"id"`
	Username     string    `gorm:"uniqueIndex;size:50;not null" json:"username"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	Role         UserRole  `gorm:"size:20;not null;default:user" json:"role"`
	Nickname     string    `gorm:"size:100" json:"nickname"`
	Avatar       string    `gorm:"size:500" json:"avatar"` // URL 或 base64
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// TableName 表名
func (User) TableName() string {
	return "users"
}

// IsAdmin 是否是管理员
func (u *User) IsAdmin() bool {
	return u.Role == UserRoleAdmin
}
