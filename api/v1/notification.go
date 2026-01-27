package v1

import (
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
)

// NotificationAPI 通知渠道 API
type NotificationAPI struct {
	store *store.Store
}

// NewNotificationAPI 创建通知渠道 API
func NewNotificationAPI(store *store.Store) *NotificationAPI {
	return &NotificationAPI{store: store}
}

// CreateNotificationRequest 创建通知渠道请求
type CreateNotificationRequest struct {
	Name      string                 `json:"name"`
	Type      string                 `json:"type"`
	Config    map[string]interface{} `json:"config"`
	IsEnabled bool                   `json:"is_enabled"`
}

// List 获取通知渠道列表
func (a *NotificationAPI) List(c echo.Context) error {
	userID := middleware.GetUserID(c)

	notifications, err := a.store.ListNotificationsByUserID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取通知渠道列表失败")
	}

	// 构建响应（包含解析后的 config）
	// 确保返回空数组而不是 null
	response := make([]*NotificationResponse, 0, len(notifications))
	for i := range notifications {
		response = append(response, toNotificationResponse(&notifications[i]))
	}

	return c.JSON(http.StatusOK, response)
}

// Create 创建通知渠道
func (a *NotificationAPI) Create(c echo.Context) error {
	userID := middleware.GetUserID(c)

	var req CreateNotificationRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	// 验证名称
	name, err := validateName(req.Name, "通知渠道名称")
	if err != nil {
		return err
	}
	req.Name = name

	// 验证类型
	notifType := model.NotificationType(req.Type)
	if notifType == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "通知渠道类型不能为空")
	}

	notification := &model.NotificationChannel{
		ID:        uuid.New().String(),
		UserID:    userID,
		Name:      req.Name,
		Type:      notifType,
		IsEnabled: req.IsEnabled,
	}

	// 设置配置
	if req.Config != nil {
		if err := notification.SetConfig(req.Config); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "配置格式错误")
		}
	}

	if err := a.store.CreateNotification(notification); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建通知渠道失败")
	}

	return c.JSON(http.StatusCreated, toNotificationResponse(notification))
}

// Update 更新通知渠道
func (a *NotificationAPI) Update(c echo.Context) error {
	userID := middleware.GetUserID(c)
	notifID := c.Param("id")

	notification, err := a.store.GetNotificationByID(notifID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "通知渠道不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取通知渠道失败")
	}

	// 验证所有权
	if notification.UserID != userID {
		return errForbidden(msgNoAccess)
	}

	var req CreateNotificationRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	// 更新字段
	if req.Name != "" {
		notification.Name = strings.TrimSpace(req.Name)
	}
	if req.Type != "" {
		notification.Type = model.NotificationType(req.Type)
	}
	notification.IsEnabled = req.IsEnabled
	if req.Config != nil {
		if err := notification.SetConfig(req.Config); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "配置格式错误")
		}
	}

	if err := a.store.UpdateNotification(notification); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新通知渠道失败")
	}

	return c.JSON(http.StatusOK, toNotificationResponse(notification))
}

// Delete 删除通知渠道
func (a *NotificationAPI) Delete(c echo.Context) error {
	userID := middleware.GetUserID(c)
	notifID := c.Param("id")

	notification, err := a.store.GetNotificationByID(notifID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "通知渠道不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取通知渠道失败")
	}

	// 验证所有权
	if notification.UserID != userID {
		return errForbidden(msgNoAccess)
	}

	if err := a.store.DeleteNotification(notifID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "删除通知渠道失败")
	}

	return c.NoContent(http.StatusNoContent)
}

// TestRequest 测试通知请求
type TestRequest struct {
	Message string `json:"message"`
}

// Test 测试通知渠道
func (a *NotificationAPI) Test(c echo.Context) error {
	userID := middleware.GetUserID(c)
	notifID := c.Param("id")

	// 直接通过 ID 查找通知渠道
	notification, err := a.store.GetNotificationByID(notifID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "通知渠道不存在")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "获取通知渠道失败")
	}

	// 验证所有权
	if notification.UserID != userID {
		return errForbidden(msgNoAccess)
	}

	// 获取测试消息
	var req TestRequest
	if err := c.Bind(&req); err != nil {
		req.Message = "这是一条测试通知，来自 NomadBankKeeper"
	}
	if req.Message == "" {
		req.Message = "这是一条测试通知，来自 NomadBankKeeper"
	}

	// 发送测试通知
	if err := sendNotification(notification, req.Message); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "测试通知已发送",
	})
}
