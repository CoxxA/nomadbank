package v1

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
)

// BankAPI 银行 API
type BankAPI struct {
	store *store.Store
}

// NewBankAPI 创建银行 API
func NewBankAPI(store *store.Store) *BankAPI {
	return &BankAPI{store: store}
}

// Groups 获取银行分组列表
func (a *BankAPI) Groups(c echo.Context) error {
	userID := middleware.GetUserID(c)

	groups, err := a.store.ListBankGroups(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取分组列表失败")
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"groups": groups,
	})
}

// List 获取银行列表（包含下次任务信息）
func (a *BankAPI) List(c echo.Context) error {
	userID := middleware.GetUserID(c)

	page, pageSize, err := parsePageParams(c)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "分页参数错误")
	}

	status := strings.TrimSpace(c.QueryParam("status"))
	group := strings.TrimSpace(c.QueryParam("group"))
	query := strings.TrimSpace(c.QueryParam("q"))

	filter := store.BankListFilter{
		Status: status,
		Group:  group,
		Query:  query,
	}

	total, err := a.store.CountBanksByUserID(userID, filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取银行列表失败")
	}

	banks, err := a.store.ListBanksByUserIDPaged(userID, filter, page, pageSize)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取银行列表失败")
	}

	bankIDs := make([]string, 0, len(banks))
	for i := range banks {
		bankIDs = append(bankIDs, banks[i].ID)
	}

	// 获取当前页银行的待执行任务
	tasks, err := a.store.ListPendingTasksByFromBankIDs(userID, bankIDs)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取任务列表失败")
	}

	// 构建银行ID到下次任务的映射（从待执行任务中找第一个作为转出方的任务）
	nextTaskMap := make(map[string]*model.TransferTask)
	for i := range tasks {
		task := &tasks[i]
		if _, exists := nextTaskMap[task.FromBankID]; !exists {
			nextTaskMap[task.FromBankID] = task
		}
	}

	// 构建响应
	result := make([]BankWithNextTaskResponse, 0, len(banks))
	for i := range banks {
		bank := banks[i]
		response := BankWithNextTaskResponse{}
		if bankResponse := toBankResponse(&bank); bankResponse != nil {
			response.BankResponse = *bankResponse
		}

		// 添加下次任务信息
		if task, exists := nextTaskMap[bank.ID]; exists {
			execDate := task.ExecDate.Format(dateLayout)
			execTime := task.ExecDate.Format(timeLayout)
			toBankName := ""
			if task.ToBank != nil {
				toBankName = task.ToBank.Name
			}
			response.NextExecDate = &execDate
			response.NextExecTime = &execTime
			response.NextToBankID = &task.ToBankID
			response.NextToBankName = &toBankName
			response.NextAmount = &task.Amount
		}

		result = append(result, response)
	}

	return c.JSON(http.StatusOK, PageResult[BankWithNextTaskResponse]{
		Items:    result,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// Create 创建银行
func (a *BankAPI) Create(c echo.Context) error {
	userID := middleware.GetUserID(c)

	var req CreateBankRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	// 验证名称
	name, err := validateName(req.Name, "银行名称")
	if err != nil {
		return err
	}
	req.Name = name

	// 设置默认值
	if req.AmountMin <= 0 {
		req.AmountMin = DefaultBankAmountMin
	}
	if req.AmountMax <= 0 {
		req.AmountMax = DefaultBankAmountMax
	}
	req.AmountMin, req.AmountMax = normalizeAmountRange(req.AmountMin, req.AmountMax)

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

	return c.JSON(http.StatusCreated, toBankResponse(bank))
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
		return errForbidden(msgNoAccess)
	}

	return c.JSON(http.StatusOK, toBankResponse(bank))
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
		return errForbidden(msgNoAccess)
	}

	var req UpdateBankRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	// 验证名称
	name, err := validateName(req.Name, "银行名称")
	if err != nil {
		return err
	}
	req.Name = name

	// 更新字段
	bank.Name = req.Name
	bank.AmountMin, bank.AmountMax = normalizeAmountRange(req.AmountMin, req.AmountMax)
	bank.StrategyID = req.StrategyID
	bank.GroupName = req.GroupName
	bank.IsActive = req.IsActive

	if err := a.store.UpdateBank(bank); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新银行失败")
	}

	return c.JSON(http.StatusOK, toBankResponse(bank))
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
		return errForbidden(msgNoAccess)
	}

	if err := a.store.DeleteBank(bankID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "删除银行失败")
	}

	return c.NoContent(http.StatusNoContent)
}
