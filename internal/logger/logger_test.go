package logger

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestLoggerLevels(t *testing.T) {
	tests := []struct {
		name      string
		level     Level
		minLevel  Level
		shouldLog bool
	}{
		{"debug at debug level", LevelDebug, LevelDebug, true},
		{"debug at info level", LevelDebug, LevelInfo, false},
		{"info at debug level", LevelInfo, LevelDebug, true},
		{"info at info level", LevelInfo, LevelInfo, true},
		{"info at warn level", LevelInfo, LevelWarn, false},
		{"warn at info level", LevelWarn, LevelInfo, true},
		{"error at info level", LevelError, LevelInfo, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			log := New()
			log.SetOutput(&buf)
			log.SetLevel(tt.minLevel)

			switch tt.level {
			case LevelDebug:
				log.Debug("test message")
			case LevelInfo:
				log.Info("test message")
			case LevelWarn:
				log.Warn("test message")
			case LevelError:
				log.Error("test message")
			}

			hasOutput := buf.Len() > 0
			if hasOutput != tt.shouldLog {
				t.Errorf("shouldLog = %v, got output = %v", tt.shouldLog, hasOutput)
			}
		})
	}
}

func TestLoggerWithFields(t *testing.T) {
	var buf bytes.Buffer
	log := New()
	log.SetOutput(&buf)
	log.SetLevel(LevelDebug)

	log.With("user_id", "123").Info("user action")

	var entry map[string]interface{}
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("failed to parse log entry: %v", err)
	}

	if entry["user_id"] != "123" {
		t.Errorf("user_id = %v, want 123", entry["user_id"])
	}
	if entry["msg"] != "user action" {
		t.Errorf("msg = %v, want 'user action'", entry["msg"])
	}
	if entry["level"] != "INFO" {
		t.Errorf("level = %v, want INFO", entry["level"])
	}
}

func TestLoggerWithMultipleFields(t *testing.T) {
	var buf bytes.Buffer
	log := New()
	log.SetOutput(&buf)
	log.SetLevel(LevelDebug)

	log.WithFields(map[string]interface{}{
		"request_id": "abc",
		"method":     "GET",
	}).Info("request handled")

	var entry map[string]interface{}
	if err := json.Unmarshal(buf.Bytes(), &entry); err != nil {
		t.Fatalf("failed to parse log entry: %v", err)
	}

	if entry["request_id"] != "abc" {
		t.Errorf("request_id = %v, want abc", entry["request_id"])
	}
	if entry["method"] != "GET" {
		t.Errorf("method = %v, want GET", entry["method"])
	}
}

func TestSetLevelFromMode(t *testing.T) {
	tests := []struct {
		mode     string
		expected Level
	}{
		{"dev", LevelDebug},
		{"development", LevelDebug},
		{"prod", LevelInfo},
		{"production", LevelInfo},
	}

	for _, tt := range tests {
		t.Run(tt.mode, func(t *testing.T) {
			log := New()
			log.SetLevelFromMode(tt.mode)

			if log.minLevel != tt.expected {
				t.Errorf("minLevel = %v, want %v", log.minLevel, tt.expected)
			}
		})
	}
}

func TestLevelString(t *testing.T) {
	tests := []struct {
		level    Level
		expected string
	}{
		{LevelDebug, "DEBUG"},
		{LevelInfo, "INFO"},
		{LevelWarn, "WARN"},
		{LevelError, "ERROR"},
		{Level(99), "UNKNOWN"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			if got := tt.level.String(); got != tt.expected {
				t.Errorf("String() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestLoggerFormatArgs(t *testing.T) {
	var buf bytes.Buffer
	log := New()
	log.SetOutput(&buf)

	log.Info("user %s created with id %d", "john", 42)

	output := buf.String()
	if !strings.Contains(output, "user john created with id 42") {
		t.Errorf("formatted message not found in output: %s", output)
	}
}
