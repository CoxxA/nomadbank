package v1

import (
	"net/http"
	"strings"
	"time"

	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// BankAPI 银行 API
type BankAPI struct {
	store *store.Store
}

// NewBankAPI 创建银行 API
func NewBankAPI(store *store.Store) *BankAPI {
	return &BankAPI{store: store}
}

// BankWithNextTask 带下次任务信息的银行
type BankWithNextTask struct {
	model.Bank
	Tags           []model.Tag `json:"tags"`
	NextExecDate   *string     `json:"next_exec_date"`
	NextExecTime   *string     `json:"next_exec_time"`
	NextToBankID   *string     `json:"next_to_bank_id"`
	NextToBankName *string     `json:"next_to_bank_name"`
	NextAmount     *float64    `json:"next_amount"`
	LastExecDate   *string     `json:"last_exec_date"`
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

// List 获取银行列表（包含下次任务信息）
func (a *BankAPI) List(c echo.Context) error {
	userID := middleware.GetUserID(c)

	banks, err := a.store.ListBanksWithTagsByUserID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取银行列表失败")
	}

	// 获取所有待执行任务
	tasks, err := a.store.ListPendingTasksByUserID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取任务列表失败")
	}

	// 获取所有已完成任务的最后执行日期
	completedTasks, err := a.store.ListCompletedTasksByUserID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取已完成任务失败")
	}

	// 构建银行ID到名称的映射
	bankNameMap := make(map[string]string)
	for _, bank := range banks {
		bankNameMap[bank.ID] = bank.Name
	}

	// 构建银行ID到下次任务的映射（从待执行任务中找第一个作为转出方的任务）
	nextTaskMap := make(map[string]*model.TransferTask)
	for i := range tasks {
		task := &tasks[i]
		if _, exists := nextTaskMap[task.FromBankID]; !exists {
			nextTaskMap[task.FromBankID] = task
		}
	}

	// 构建银行ID到最后执行日期的映射
	lastExecMap := make(map[string]time.Time)
	for _, task := range completedTasks {
		if task.CompletedAt != nil {
			if existing, exists := lastExecMap[task.FromBankID]; !exists || task.CompletedAt.After(existing) {
				lastExecMap[task.FromBankID] = *task.CompletedAt
			}
		}
	}

	// 构建响应
	result := make([]BankWithNextTask, len(banks))
	for i, bank := range banks {
		result[i] = BankWithNextTask{
			Bank: bank.Bank,
			Tags: bank.Tags,
		}

		// 添加下次任务信息
		if task, exists := nextTaskMap[bank.ID]; exists {
			execDate := task.ExecDate.Format("2006-01-02")
			execTime := task.ExecDate.Format("15:04")
			toBankName := bankNameMap[task.ToBankID]
			result[i].NextExecDate = &execDate
			result[i].NextExecTime = &execTime
			result[i].NextToBankID = &task.ToBankID
			result[i].NextToBankName = &toBankName
			result[i].NextAmount = &task.Amount
		}

		// 添加最后执行日期
		if lastExec, exists := lastExecMap[bank.ID]; exists {
			lastExecStr := lastExec.Format("2006-01-02")
			result[i].LastExecDate = &lastExecStr
		}
	}

	return c.JSON(http.StatusOK, result)
}

// Create 创建银行
func (a *BankAPI) Create(c echo.Context) error {
	userID := middleware.GetUserID(c)

	var req CreateBankRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求格式错误")
	}

	// 验证名称
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "银行名称不能为空")
	}

	// 设置默认值
	if req.AmountMin <= 0 {
		req.AmountMin = 10
	}
	if req.AmountMax <= 0 {
		req.AmountMax = 100
	}
	if req.AmountMin > req.AmountMax {
		req.AmountMin, req.AmountMax = req.AmountMax, req.AmountMin
	}

	bank := &model.Bank{
		ID:         uuid.New().String(),
		UserID:     userID,
		Name:       req.Name,
		AmountMin:  req.AmountMin,
		AmountMax:  req.AmountMax,
		StrategyID: req.StrategyID,
		GroupName:  req.GroupName,
		IsActive:   req.IsActive,
	}

	if err := a.store.CreateBank(bank); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建银行失败")
	}

	return c.JSON(http.StatusCreated, bank)
}

// Get 获取银行详情
func (a *BankAPI) Get(c echo.Context) error {
	userID := middleware.GetUserID(c)
	bankID := c.Param("id")

	bank, err := a.store.GetBankByID(bankID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "银行不存在")
	}

	if bank.UserID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "无权访问")
	}

	return c.JSON(http.StatusOK, bank)
}

// Update 更新银行
func (a *BankAPI) Update(c echo.Context) error {
	userID := middleware.GetUserID(c)
	bankID := c.Param("id")

	bank, err := a.store.GetBankByID(bankID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "银行不存在")
	}

	if bank.UserID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "无权访问")
	}

	var req UpdateBankRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求格式错误")
	}

	// 验证名称
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "银行名称不能为空")
	}

	// 更新字段
	bank.Name = req.Name
	bank.AmountMin = req.AmountMin
	bank.AmountMax = req.AmountMax
	bank.StrategyID = req.StrategyID
	bank.GroupName = req.GroupName
	bank.IsActive = req.IsActive

	if err := a.store.UpdateBank(bank); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新银行失败")
	}

	return c.JSON(http.StatusOK, bank)
}

// Delete 删除银行
func (a *BankAPI) Delete(c echo.Context) error {
	userID := middleware.GetUserID(c)
	bankID := c.Param("id")

	bank, err := a.store.GetBankByID(bankID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "银行不存在")
	}

	if bank.UserID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "无权访问")
	}

	if err := a.store.DeleteBank(bankID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "删除银行失败")
	}

	return c.NoContent(http.StatusNoContent)
}
