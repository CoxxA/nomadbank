package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
	"github.com/CoxxA/nomadbank/v2/internal/sqlite"
	taskservice "github.com/CoxxA/nomadbank/v2/internal/task"
)

type createTaskBatchRequest struct {
	StrategyID int64  `json:"strategy_id"`
	GroupName  string `json:"group_name"`
	Cycles     int    `json:"cycles"`
}

func (s *Server) listTaskBatches(c echo.Context) error {
	batches, err := s.store.ListTaskBatches(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, batches)
}

func (s *Server) createTaskBatch(c echo.Context) error {
	var request createTaskBatchRequest
	if err := c.Bind(&request); err != nil {
		return badRequest("invalid_json", "请求格式错误")
	}
	if request.StrategyID <= 0 {
		return badRequest("invalid_strategy", "请选择策略")
	}
	result, err := s.taskService.Generate(c.Request().Context(), taskservice.GenerateInput{
		StrategyID: request.StrategyID,
		GroupName:  request.GroupName,
		Cycles:     request.Cycles,
	})
	if err != nil {
		switch {
		case errors.Is(err, taskservice.ErrNotEnoughAccounts):
			return badRequest("not_enough_accounts", err.Error())
		case errors.Is(err, taskservice.ErrInvalidCycles):
			return badRequest("invalid_cycles", err.Error())
		case errors.Is(err, sqlite.ErrNotFound):
			return notFound("策略不存在")
		default:
			return err
		}
	}
	return c.JSON(http.StatusCreated, result)
}

func (s *Server) deleteTaskBatch(c echo.Context) error {
	id, err := parseID(c.Param("id"))
	if err != nil {
		return err
	}
	if err := s.store.DeleteTaskBatch(c.Request().Context(), id); err != nil {
		return mapStoreError(err, "任务批次不存在")
	}
	return c.NoContent(http.StatusNoContent)
}

func (s *Server) listTasks(c echo.Context) error {
	page, err := positiveQueryInt(c.QueryParam("page"), 1, 1, 100_000)
	if err != nil {
		return badRequest("invalid_page", "分页参数无效")
	}
	pageSize, err := positiveQueryInt(c.QueryParam("page_size"), 20, 1, 100)
	if err != nil {
		return badRequest("invalid_page_size", "每页数量需在 1～100 之间")
	}
	status := domain.TaskStatus(strings.TrimSpace(c.QueryParam("status")))
	if status != "" && status != domain.TaskStatusPending && status != domain.TaskStatusCompleted {
		return badRequest("invalid_status", "任务状态无效")
	}
	batchID := int64(0)
	if value := strings.TrimSpace(c.QueryParam("batch_id")); value != "" {
		batchID, err = strconv.ParseInt(value, 10, 64)
		if err != nil || batchID <= 0 {
			return badRequest("invalid_batch_id", "任务批次 ID 无效")
		}
	}
	result, err := s.store.ListTasks(c.Request().Context(), sqlite.TaskFilter{
		Status:   status,
		BatchID:  batchID,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, result)
}

func (s *Server) completeTask(c echo.Context) error {
	id, err := parseID(c.Param("id"))
	if err != nil {
		return err
	}
	task, err := s.store.CompleteTask(c.Request().Context(), id, time.Now())
	if err != nil {
		return mapStoreError(err, "任务不存在")
	}
	return c.JSON(http.StatusOK, task)
}

func (s *Server) dashboard(c echo.Context) error {
	result, err := s.store.Dashboard(c.Request().Context())
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, result)
}

func positiveQueryInt(value string, fallback, minimum, maximum int) (int, error) {
	if strings.TrimSpace(value) == "" {
		return fallback, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < minimum || parsed > maximum {
		return 0, errors.New("无效整数")
	}
	return parsed, nil
}
