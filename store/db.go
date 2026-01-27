package store

import (
	"os"
	"path/filepath"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/CoxxA/nomadbank/internal/consts"
	"github.com/CoxxA/nomadbank/store/model"
)

// NewDB 创建数据库连接
func NewDB(dbPath string, debug bool) (*gorm.DB, error) {
	// 确保数据目录存在
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	// 配置日志级别
	logLevel := logger.Silent
	if debug {
		logLevel = logger.Info
	}

	// 连接数据库
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, err
	}

	// 自动迁移
	if err := autoMigrate(db); err != nil {
		return nil, err
	}

	// 初始化系统数据
	if err := initSystemData(db); err != nil {
		return nil, err
	}

	return db, nil
}

// autoMigrate 自动迁移数据库表
func autoMigrate(db *gorm.DB) error {
	tables := []string{"bank_tags", "tags"}
	for _, table := range tables {
		if db.Migrator().HasTable(table) {
			if err := db.Migrator().DropTable(table); err != nil {
				return err
			}
		}
	}

	return db.AutoMigrate(
		&model.User{},
		&model.Bank{},
		&model.Strategy{},
		&model.TransferTask{},
		&model.NotificationChannel{},
	)
}

// initSystemData 初始化系统数据
func initSystemData(db *gorm.DB) error {
	return initSystemStrategies(db)
}

// initSystemStrategies 初始化系统策略
func initSystemStrategies(db *gorm.DB) error {
	// 检查是否已存在系统策略
	var count int64
	if err := db.Model(&model.Strategy{}).Where("is_system = ?", true).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	// 创建默认保活策略
	defaultStrategy := &model.Strategy{
		ID:          uuid.New().String(),
		UserID:      "", // 系统策略无所属用户
		Name:        "默认保活",
		IntervalMin: consts.DefaultStrategyIntervalMin,
		IntervalMax: consts.DefaultStrategyIntervalMax,
		TimeStart:   consts.DefaultStrategyTimeStart,
		TimeEnd:     consts.DefaultStrategyTimeEnd,
		SkipWeekend: false,
		AmountMin:   consts.DefaultStrategyAmountMin,
		AmountMax:   consts.DefaultStrategyAmountMax,
		DailyLimit:  consts.DefaultStrategyDailyLimit,
		IsSystem:    true,
	}

	// 创建长期保活策略
	longTermStrategy := &model.Strategy{
		ID:          uuid.New().String(),
		UserID:      "", // 系统策略无所属用户
		Name:        "长期保活",
		IntervalMin: consts.LongTermStrategyIntervalMin,
		IntervalMax: consts.LongTermStrategyIntervalMax,
		TimeStart:   consts.DefaultStrategyTimeStart,
		TimeEnd:     consts.DefaultStrategyTimeEnd,
		SkipWeekend: false,
		AmountMin:   consts.DefaultStrategyAmountMin,
		AmountMax:   consts.DefaultStrategyAmountMax,
		DailyLimit:  consts.DefaultStrategyDailyLimit,
		IsSystem:    true,
	}

	if err := db.Create(defaultStrategy).Error; err != nil {
		return err
	}
	if err := db.Create(longTermStrategy).Error; err != nil {
		return err
	}

	return nil
}
