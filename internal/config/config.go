package config

import (
	"os"
	"strconv"
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
}

// Load 从环境变量加载配置
func Load() *Config {
	return &Config{
		Port:           getEnvInt("PORT", 8080),
		Mode:           getEnv("MODE", "dev"),
		DataDir:        getEnv("DATA_DIR", "./data"),
		JWTSecret:      getEnv("JWT_SECRET", "nomadbank-secret-change-in-production"),
		JWTExpireHours: getEnvInt("JWT_EXPIRE_HOURS", 168), // 7 天
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
