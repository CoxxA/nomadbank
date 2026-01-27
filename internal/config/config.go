package config

import (
	"log"
	"os"
	"strconv"
	"strings"
)

// 安全配置常量
const (
	// DefaultJWTSecret 默认 JWT 密钥（仅用于开发）
	DefaultJWTSecret = "nomadbank-secret-change-in-production"
	// MinJWTSecretLength 生产环境最小密钥长度
	MinJWTSecretLength = 32
)

// Config 应用配置
type Config struct {
	// 服务器配置
	Port int
	Mode string // dev, prod

	// 数据目录
	DataDir string

	// JWT 配置
	JWTSecret      string
	JWTExpireHours int

	// CORS 配置
	CORSOrigins []string // 允许的来源列表
}

// Load 从环境变量加载配置
func Load() *Config {
	cfg := &Config{
		Port:           getEnvInt("PORT", 8080),
		Mode:           getEnv("MODE", "dev"),
		DataDir:        getEnv("DATA_DIR", "./data"),
		JWTSecret:      getEnv("JWT_SECRET", DefaultJWTSecret),
		JWTExpireHours: getEnvInt("JWT_EXPIRE_HOURS", 168), // 7 天
		CORSOrigins:    getEnvList("CORS_ORIGINS", nil),
	}

	// 安全检查
	cfg.validateSecurity()

	return cfg
}

// validateSecurity 验证安全配置
func (c *Config) validateSecurity() {
	if !c.IsDev() {
		// 生产环境检查 JWT 密钥
		if c.JWTSecret == DefaultJWTSecret {
			log.Println("[安全警告] 生产环境使用了默认 JWT 密钥，请设置 JWT_SECRET 环境变量")
		} else if len(c.JWTSecret) < MinJWTSecretLength {
			log.Printf("[安全警告] JWT 密钥长度不足 %d 字符，建议使用更长的密钥\n", MinJWTSecretLength)
		}
	}
}

// IsDev 是否为开发模式
func (c *Config) IsDev() bool {
	return c.Mode == "dev"
}

// DBPath 数据库文件路径
func (c *Config) DBPath() string {
	return c.DataDir + "/nomadbank.db"
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvList(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		parts := strings.Split(value, ",")
		result := make([]string, 0, len(parts))
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				result = append(result, trimmed)
			}
		}
		if len(result) > 0 {
			return result
		}
	}
	return defaultValue
}
