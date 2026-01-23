package v1

// GenerateTasksRequest 生成任务请求
type GenerateTasksRequest struct {
	StrategyID string `json:"strategy_id"` // 策略 ID
	Group      string `json:"group"`       // 银行分组（空=全部）
	Cycles     int    `json:"cycles"`      // 周期数
}
