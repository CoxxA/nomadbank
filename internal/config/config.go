package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Config struct {
	Port        int
	DataDir     string
	SessionDays int
}

func Load() (Config, error) {
	port, err := envInt("PORT", 8080)
	if err != nil {
		return Config{}, err
	}
	sessionDays, err := envInt("SESSION_DAYS", 30)
	if err != nil {
		return Config{}, err
	}
	config := Config{
		Port:        port,
		DataDir:     envString("DATA_DIR", "./data"),
		SessionDays: sessionDays,
	}
	if err := config.Validate(); err != nil {
		return Config{}, err
	}
	return config, nil
}

func (c Config) Validate() error {
	if c.Port < 1 || c.Port > 65535 {
		return fmt.Errorf("PORT 必须在 1 到 65535 之间")
	}
	if strings.TrimSpace(c.DataDir) == "" {
		return fmt.Errorf("DATA_DIR 不能为空")
	}
	if c.SessionDays < 1 || c.SessionDays > 365 {
		return fmt.Errorf("SESSION_DAYS 必须在 1 到 365 之间")
	}
	return nil
}

func (c Config) DBPath() string {
	return filepath.Join(c.DataDir, "nomadbank-v2.db")
}

func (c Config) Address() string {
	return fmt.Sprintf(":%d", c.Port)
}

func envString(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envInt(key string, fallback int) (int, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("%s 必须是整数: %q", key, value)
	}
	return parsed, nil
}
