// Package consts 定义全局常量
package consts

// ========== 日期时间格式 ==========

const (
	// DateLayout 日期格式 (YYYY-MM-DD)
	DateLayout = "2006-01-02"
	// TimeLayout 时间格式 (HH:MM)
	TimeLayout = "15:04"
	// DateTimeLayout 日期时间格式
	DateTimeLayout = "2006-01-02 15:04:05"
)

// ========== 用户验证常量 ==========

const (
	// MinUsernameLength 用户名最小长度
	MinUsernameLength = 3
	// MaxUsernameLength 用户名最大长度
	MaxUsernameLength = 50
	// MinPasswordLength 密码最小长度
	MinPasswordLength = 6
	// MaxPasswordLength 密码最大长度
	MaxPasswordLength = 128
	// MaxNameLength 名称字段最大长度（银行名、策略名、通知渠道名等）
	MaxNameLength = 100
	// MaxNicknameLength 昵称最大长度
	MaxNicknameLength = 50
	// MaxURLLength URL 字段最大长度
	MaxURLLength = 500
	// MaxConfigLength 配置字段最大长度
	MaxConfigLength = 4096
)

// ========== 策略默认值 ==========

const (
	// DefaultStrategyIntervalMin 默认最小间隔天数
	DefaultStrategyIntervalMin = 30
	// DefaultStrategyIntervalMax 默认最大间隔天数
	DefaultStrategyIntervalMax = 60
	// DefaultStrategyTimeStart 默认开始时间
	DefaultStrategyTimeStart = "09:00"
	// DefaultStrategyTimeEnd 默认结束时间
	DefaultStrategyTimeEnd = "21:00"
	// DefaultStrategyAmountMin 策略默认最小金额
	DefaultStrategyAmountMin = 10.0
	// DefaultStrategyAmountMax 策略默认最大金额
	DefaultStrategyAmountMax = 30.0
	// DefaultStrategyDailyLimit 默认单日任务上限
	DefaultStrategyDailyLimit = 3

	// LongTermStrategyIntervalMin 长期保活策略最小间隔天数
	LongTermStrategyIntervalMin = 90
	// LongTermStrategyIntervalMax 长期保活策略最大间隔天数
	LongTermStrategyIntervalMax = 120
)

// ========== 银行默认值 ==========

const (
	// DefaultBankAmountMin 银行默认最小金额
	DefaultBankAmountMin = 10.0
	// DefaultBankAmountMax 银行默认最大金额
	DefaultBankAmountMax = 100.0
)

// ========== HTTP 配置 ==========

const (
	// NotificationTimeout 通知请求超时时间（秒）
	NotificationTimeout = 10
	// MaxIdleConns HTTP 客户端最大空闲连接数
	MaxIdleConns = 10
	// MaxIdleConnsPerHost 每个主机的最大空闲连接数
	MaxIdleConnsPerHost = 5
	// IdleConnTimeout 空闲连接超时时间（秒）
	IdleConnTimeout = 30
)

// ========== 通知消息 ==========

const (
	// DefaultTestMessage 默认测试通知消息
	DefaultTestMessage = "这是一条测试通知，来自 NomadBankKeeper"
)
