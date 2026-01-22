package v1

import (
	"errors"
	"net/http"
	"time"

	"github.com/CoxxA/nomadbank/internal/tasks"
	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
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

	service := tasks.NewService(a.store, nil)
	result, err := service.Generate(userID, tasks.GenerateInput{
		StrategyID: req.StrategyID,
		Group:      req.Group,
		Cycles:     req.Cycles,
	})
	if err != nil {
		switch {
		case errors.Is(err, tasks.ErrStrategyRequired),
			errors.Is(err, tasks.ErrStrategyNotFound),
			errors.Is(err, tasks.ErrNotEnoughBanks):
			return echo.NewHTTPError(http.StatusBadRequest, err.Error())
		default:
			return echo.NewHTTPError(http.StatusInternalServerError, "创建任务失败")
		}
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message":     "任务生成成功",
		"count":       result.Count,
		"start_cycle": result.StartCycle,
		"end_cycle":   result.EndCycle,
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
