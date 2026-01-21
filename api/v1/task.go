package v1

import (
	"math/rand"
	"net/http"
	"sort"
	"time"

	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// TaskAPI 任务 API
type TaskAPI struct {
	store *store.Store
}

// NewTaskAPI 创建任务 API
func NewTaskAPI(store *store.Store) *TaskAPI {
	return &TaskAPI{store: store}
}

// GenerateTasksRequest 生成任务请求
type GenerateTasksRequest struct {
	StrategyID string `json:"strategy_id"` // 策略 ID
	Group      string `json:"group"`       // 银行分组（空=全部）
	Cycles     int    `json:"cycles"`      // 周期数
}

// List 获取任务列表
func (a *TaskAPI) List(c echo.Context) error {
	userID := middleware.GetUserID(c)

	tasks, err := a.store.ListTasksByUserID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取任务列表失败")
	}

	response := make([]*TaskResponse, len(tasks))
	for i := range tasks {
		response[i] = toTaskResponse(&tasks[i])
	}

	return c.JSON(http.StatusOK, response)
}

// Generate 生成任务
func (a *TaskAPI) Generate(c echo.Context) error {
	userID := middleware.GetUserID(c)

	var req GenerateTasksRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求格式错误")
	}

	// 获取策略
	if req.StrategyID == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "请选择策略")
	}
	strategy, err := a.store.GetStrategyByID(req.StrategyID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "策略不存在")
	}

	// 获取银行列表（按分组筛选）
	var banks []model.Bank
	if req.Group != "" {
		banks, err = a.store.ListActiveBanksByGroup(userID, req.Group)
	} else {
		banks, err = a.store.ListActiveBanksByUserID(userID)
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取银行列表失败")
	}

	if len(banks) < 2 {
		return echo.NewHTTPError(http.StatusBadRequest, "至少需要 2 个活跃银行才能生成任务")
	}

	// 设置默认周期数
	if req.Cycles <= 0 {
		req.Cycles = 4
	}

	// 获取当前分组的已有任务的最大周期和最后执行日期
	// req.Group 为空字符串表示"全部银行"
	lastCycle, lastDate := a.store.GetLastTaskCycleAndDate(userID, req.Group)

	// 确定起始周期和起始日期
	startCycle := lastCycle + 1
	var startDate time.Time
	if lastCycle == 0 || lastDate.IsZero() || lastDate.Year() < 2000 {
		// 没有已有任务或日期无效，从明天开始
		startDate = time.Now().AddDate(0, 0, 1)
	} else {
		// 有已有任务，从最后日期往后间隔
		intervalDays := strategy.IntervalMin + rand.Intn(strategy.IntervalMax-strategy.IntervalMin+1)
		startDate = lastDate.AddDate(0, 0, intervalDays)
	}

	// 生成新任务（不删除旧任务）
	tasks := generateTasks(userID, req.Group, banks, strategy, req.Cycles, startCycle, startDate)

	if err := a.store.CreateTasks(tasks); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建任务失败")
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":     "任务生成成功",
		"count":       len(tasks),
		"start_cycle": startCycle,
		"end_cycle":   startCycle + req.Cycles - 1,
	})
}

// Complete 完成任务
func (a *TaskAPI) Complete(c echo.Context) error {
	userID := middleware.GetUserID(c)
	taskID := c.Param("id")

	task, err := a.store.GetTaskByID(taskID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "任务不存在")
	}

	if task.UserID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "无权访问")
	}

	now := time.Now()
	task.Status = model.TaskStatusCompleted
	task.CompletedAt = &now

	if err := a.store.UpdateTask(task); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新任务失败")
	}

	return c.JSON(http.StatusOK, toTaskResponse(task))
}

// DeleteAll 删除所有任务
func (a *TaskAPI) DeleteAll(c echo.Context) error {
	userID := middleware.GetUserID(c)

	if err := a.store.DeleteTasksByUserID(userID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "删除任务失败")
	}

	return c.NoContent(http.StatusNoContent)
}

// ========== 任务生成算法 ==========

// transferPair 转账对
type transferPair struct {
	from model.Bank
	to   model.Bank
}

// generateTasks 生成转账任务
// groupName 为空字符串表示"全部银行"
func generateTasks(userID string, groupName string, banks []model.Bank, strategy *model.Strategy, cycles int, startCycle int, startDate time.Time) []model.TransferTask {
	var allTasks []model.TransferTask
	currentDate := startDate

	for i := 0; i < cycles; i++ {
		cycle := startCycle + i

		// 第一轮从当前日期开始，后续轮次间隔随机天数
		if i > 0 {
			intervalDays := strategy.IntervalMin + rand.Intn(strategy.IntervalMax-strategy.IntervalMin+1)
			currentDate = currentDate.AddDate(0, 0, intervalDays)
		}

		// 生成本周期的转账对（确保每个银行有进有出）
		pairs := generateBalancedPairs(banks)

		// 安排任务日期（集中化 + 遵守规则）
		cycleTasks := scheduleTasks(userID, groupName, cycle, pairs, currentDate, strategy)
		allTasks = append(allTasks, cycleTasks...)

		// 更新 currentDate 为本周期最后一个任务的日期
		if len(cycleTasks) > 0 {
			lastTask := cycleTasks[len(cycleTasks)-1]
			currentDate = lastTask.ExecDate
		}
	}

	return allTasks
}

// generateBalancedPairs 生成平衡的转账对（每个银行有进有出）
func generateBalancedPairs(banks []model.Bank) []transferPair {
	n := len(banks)
	if n < 2 {
		return nil
	}

	// 随机打乱银行顺序
	shuffled := make([]model.Bank, n)
	copy(shuffled, banks)
	rand.Shuffle(n, func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	var pairs []transferPair

	// 第一轮：偶数位置的银行转给奇数位置的银行
	// 例如：[A, B, C, D] -> A→B, C→D
	for i := 0; i < n-1; i += 2 {
		pairs = append(pairs, transferPair{
			from: shuffled[i],
			to:   shuffled[i+1],
		})
	}

	// 第二轮：奇数位置的银行转给下一个偶数位置的银行（循环）
	// 例如：[A, B, C, D] -> B→C, D→A
	for i := 1; i < n; i += 2 {
		nextIdx := (i + 1) % n
		pairs = append(pairs, transferPair{
			from: shuffled[i],
			to:   shuffled[nextIdx],
		})
	}

	// 如果银行数量是奇数，最后一个银行需要特殊处理
	if n%2 == 1 {
		// 最后一个银行出：转给第一个银行
		pairs = append(pairs, transferPair{
			from: shuffled[n-1],
			to:   shuffled[0],
		})
		// 最后一个银行入：从倒数第二个银行转入
		pairs = append(pairs, transferPair{
			from: shuffled[n-2],
			to:   shuffled[n-1],
		})
	}

	return pairs
}

// scheduleTasks 安排任务日期
// groupName 为空字符串表示"全部银行"
func scheduleTasks(userID string, groupName string, cycle int, pairs []transferPair, baseDate time.Time, strategy *model.Strategy) []model.TransferTask {
	var tasks []model.TransferTask

	// 记录每个银行在每天的转账方向
	// key: "bankID:date", value: "in" | "out"
	bankDayDirection := make(map[string]string)

	// 记录直接回流的最近时间
	// key: "fromID->toID", value: 最近的日期
	directFlowDate := make(map[string]time.Time)

	currentDate := baseDate
	dailyCount := 0

	for _, pair := range pairs {
		// 检查是否需要换天
		needNewDay := false

		// 检查单日上限
		if dailyCount >= strategy.DailyLimit {
			needNewDay = true
		}

		// 检查同一天内银行是否已有相反方向的转账
		fromKey := pair.from.ID + ":" + currentDate.Format("2006-01-02")
		toKey := pair.to.ID + ":" + currentDate.Format("2006-01-02")

		if dir, exists := bankDayDirection[fromKey]; exists && dir == "in" {
			needNewDay = true
		}
		if dir, exists := bankDayDirection[toKey]; exists && dir == "out" {
			needNewDay = true
		}

		// 检查直接回流是否需要间隔
		reverseKey := pair.to.ID + "->" + pair.from.ID
		if lastDate, exists := directFlowDate[reverseKey]; exists {
			minDate := lastDate.AddDate(0, 0, 3) // 间隔 3 天
			if currentDate.Before(minDate) {
				currentDate = minDate
				dailyCount = 0
				// 清空当天的方向记录
				bankDayDirection = clearDayRecords(bankDayDirection, currentDate)
			}
		}

		// 如果需要换天
		if needNewDay {
			currentDate = currentDate.AddDate(0, 0, 1)
			dailyCount = 0
		}

		// 跳过周末（如果策略要求）
		if strategy.SkipWeekend {
			currentDate = skipWeekend(currentDate)
		}

		// 更新记录
		fromKey = pair.from.ID + ":" + currentDate.Format("2006-01-02")
		toKey = pair.to.ID + ":" + currentDate.Format("2006-01-02")
		bankDayDirection[fromKey] = "out"
		bankDayDirection[toKey] = "in"

		flowKey := pair.from.ID + "->" + pair.to.ID
		directFlowDate[flowKey] = currentDate

		// 生成随机金额
		amount := generateRandomAmount(strategy.AmountMin, strategy.AmountMax)

		// 生成随机执行时间
		execTime := generateRandomTime(currentDate, strategy.TimeStart, strategy.TimeEnd)

		task := model.TransferTask{
			ID:         uuid.New().String(),
			UserID:     userID,
			GroupName:  groupName,
			Cycle:      cycle,
			AnchorDate: baseDate,
			ExecDate:   execTime,
			FromBankID: pair.from.ID,
			ToBankID:   pair.to.ID,
			Amount:     amount,
			Status:     model.TaskStatusPending,
		}
		tasks = append(tasks, task)
		dailyCount++
	}

	// 按执行时间排序
	sort.Slice(tasks, func(i, j int) bool {
		return tasks[i].ExecDate.Before(tasks[j].ExecDate)
	})

	return tasks
}

// clearDayRecords 清除非当天的记录
func clearDayRecords(records map[string]string, currentDate time.Time) map[string]string {
	currentDateStr := currentDate.Format("2006-01-02")
	newRecords := make(map[string]string)
	for key, value := range records {
		// 只保留当天的记录
		if len(key) > 10 && key[len(key)-10:] == currentDateStr {
			newRecords[key] = value
		}
	}
	return newRecords
}

// skipWeekend 跳过周末
func skipWeekend(date time.Time) time.Time {
	for date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
		date = date.AddDate(0, 0, 1)
	}
	return date
}

// generateRandomAmount 生成随机金额（整数/1位小数/2位小数）
func generateRandomAmount(min, max float64) float64 {
	base := min + rand.Float64()*(max-min)

	// 随机选择精度：0=整数，1=1位小数，2=2位小数
	precision := rand.Intn(3)

	switch precision {
	case 0:
		return float64(int(base))
	case 1:
		return float64(int(base*10)) / 10
	default:
		return float64(int(base*100)) / 100
	}
}

// generateRandomTime 生成执行时段内的随机时间
func generateRandomTime(date time.Time, startTime, endTime string) time.Time {
	// 解析开始时间
	startHour, startMin := parseTime(startTime)
	endHour, endMin := parseTime(endTime)

	// 计算时间范围（分钟）
	startMinutes := startHour*60 + startMin
	endMinutes := endHour*60 + endMin

	if endMinutes <= startMinutes {
		endMinutes = startMinutes + 60 // 至少 1 小时
	}

	// 随机选择分钟
	randomMinutes := startMinutes + rand.Intn(endMinutes-startMinutes)
	hour := randomMinutes / 60
	minute := randomMinutes % 60

	return time.Date(date.Year(), date.Month(), date.Day(), hour, minute, rand.Intn(60), 0, date.Location())
}

// parseTime 解析时间字符串 "HH:MM"
func parseTime(timeStr string) (int, int) {
	hour, minute := 9, 0 // 默认值
	if len(timeStr) >= 5 {
		h, m := 0, 0
		if _, err := parseTimeFormat(timeStr, &h, &m); err == nil {
			hour, minute = h, m
		}
	}
	return hour, minute
}

// parseTimeFormat 解析 HH:MM 格式
func parseTimeFormat(s string, hour, minute *int) (bool, error) {
	t, err := time.Parse("15:04", s)
	if err != nil {
		return false, err
	}
	*hour = t.Hour()
	*minute = t.Minute()
	return true, nil
}
