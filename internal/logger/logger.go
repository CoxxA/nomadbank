package logger

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sync"
	"time"
)

// Level 日志级别
type Level int

const (
	LevelDebug Level = iota
	LevelInfo
	LevelWarn
	LevelError
)

func (l Level) String() string {
	switch l {
	case LevelDebug:
		return "DEBUG"
	case LevelInfo:
		return "INFO"
	case LevelWarn:
		return "WARN"
	case LevelError:
		return "ERROR"
	default:
		return "UNKNOWN"
	}
}

// Logger 结构化日志记录器
type Logger struct {
	mu       sync.Mutex
	out      io.Writer
	minLevel Level
	fields   map[string]interface{}
}

// New 创建新的日志记录器
func New() *Logger {
	return &Logger{
		out:      os.Stdout,
		minLevel: LevelInfo,
		fields:   make(map[string]interface{}),
	}
}

// SetOutput 设置输出目标
func (l *Logger) SetOutput(w io.Writer) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.out = w
}

// SetLevel 设置最低日志级别
func (l *Logger) SetLevel(level Level) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.minLevel = level
}

// SetLevelFromMode 根据运行模式设置日志级别
func (l *Logger) SetLevelFromMode(mode string) {
	if mode == "dev" || mode == "development" {
		l.SetLevel(LevelDebug)
	} else {
		l.SetLevel(LevelInfo)
	}
}

// With 添加字段，返回新的日志记录器
func (l *Logger) With(key string, value interface{}) *Logger {
	l.mu.Lock()
	defer l.mu.Unlock()

	newFields := make(map[string]interface{}, len(l.fields)+1)
	for k, v := range l.fields {
		newFields[k] = v
	}
	newFields[key] = value

	return &Logger{
		out:      l.out,
		minLevel: l.minLevel,
		fields:   newFields,
	}
}

// WithFields 添加多个字段
func (l *Logger) WithFields(fields map[string]interface{}) *Logger {
	l.mu.Lock()
	defer l.mu.Unlock()

	newFields := make(map[string]interface{}, len(l.fields)+len(fields))
	for k, v := range l.fields {
		newFields[k] = v
	}
	for k, v := range fields {
		newFields[k] = v
	}

	return &Logger{
		out:      l.out,
		minLevel: l.minLevel,
		fields:   newFields,
	}
}

// log 内部日志方法
func (l *Logger) log(level Level, msg string, args ...interface{}) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if level < l.minLevel {
		return
	}

	entry := map[string]interface{}{
		"time":  time.Now().Format(time.RFC3339),
		"level": level.String(),
		"msg":   fmt.Sprintf(msg, args...),
	}

	for k, v := range l.fields {
		entry[k] = v
	}

	data, err := json.Marshal(entry)
	if err != nil {
		fmt.Fprintf(l.out, `{"time":"%s","level":"ERROR","msg":"failed to marshal log entry: %v"}`+"\n",
			time.Now().Format(time.RFC3339), err)
		return
	}

	fmt.Fprintln(l.out, string(data))
}

// Debug 调试级别日志
func (l *Logger) Debug(msg string, args ...interface{}) {
	l.log(LevelDebug, msg, args...)
}

// Info 信息级别日志
func (l *Logger) Info(msg string, args ...interface{}) {
	l.log(LevelInfo, msg, args...)
}

// Warn 警告级别日志
func (l *Logger) Warn(msg string, args ...interface{}) {
	l.log(LevelWarn, msg, args...)
}

// Error 错误级别日志
func (l *Logger) Error(msg string, args ...interface{}) {
	l.log(LevelError, msg, args...)
}

// Fatal 致命错误日志（会退出程序）
func (l *Logger) Fatal(msg string, args ...interface{}) {
	l.log(LevelError, msg, args...)
	os.Exit(1)
}

// 全局默认日志记录器
var defaultLogger = New()

// Default 获取默认日志记录器
func Default() *Logger {
	return defaultLogger
}

// SetDefault 设置默认日志记录器
func SetDefault(l *Logger) {
	defaultLogger = l
}

// 全局便捷方法
func Debug(msg string, args ...interface{}) { defaultLogger.Debug(msg, args...) }
func Info(msg string, args ...interface{})  { defaultLogger.Info(msg, args...) }
func Warn(msg string, args ...interface{})  { defaultLogger.Warn(msg, args...) }
func Error(msg string, args ...interface{}) { defaultLogger.Error(msg, args...) }
func Fatal(msg string, args ...interface{}) { defaultLogger.Fatal(msg, args...) }

// With 使用默认日志记录器添加字段
func With(key string, value interface{}) *Logger {
	return defaultLogger.With(key, value)
}

// WithFields 使用默认日志记录器添加多个字段
func WithFields(fields map[string]interface{}) *Logger {
	return defaultLogger.WithFields(fields)
}
