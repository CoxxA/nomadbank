package config

import (
	"strings"
	"testing"
)

func TestLoadRejectsInvalidInteger(t *testing.T) {
	t.Setenv("PORT", "not-a-number")
	t.Setenv("SESSION_DAYS", "30")

	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "PORT") {
		t.Fatalf("expected invalid PORT error, got %v", err)
	}
}

func TestValidateRejectsInvalidOverrides(t *testing.T) {
	tests := []Config{
		{Port: 70_000, DataDir: "data", SessionDays: 30},
		{Port: 8080, DataDir: " ", SessionDays: 30},
		{Port: 8080, DataDir: "data", SessionDays: 0},
	}
	for _, config := range tests {
		if err := config.Validate(); err == nil {
			t.Fatalf("expected validation error for %#v", config)
		}
	}
}
