package v1

// BankWithNextTask 带下次任务信息的银行
type BankWithNextTaskResponse struct {
	BankResponse
	NextExecDate   *string  `json:"next_exec_date"`
	NextExecTime   *string  `json:"next_exec_time"`
	NextToBankID   *string  `json:"next_to_bank_id"`
	NextToBankName *string  `json:"next_to_bank_name"`
	NextAmount     *float64 `json:"next_amount"`
}

// CreateBankRequest 创建银行请求
type CreateBankRequest struct {
	Name       string  `json:"name"`
	AmountMin  float64 `json:"amount_min"`
	AmountMax  float64 `json:"amount_max"`
	StrategyID *string `json:"strategy_id"`
	GroupName  *string `json:"group_name"`
	IsActive   bool    `json:"is_active"`
}

// UpdateBankRequest 更新银行请求
type UpdateBankRequest struct {
	Name       string  `json:"name"`
	AmountMin  float64 `json:"amount_min"`
	AmountMax  float64 `json:"amount_max"`
	StrategyID *string `json:"strategy_id"`
	GroupName  *string `json:"group_name"`
	IsActive   bool    `json:"is_active"`
}
