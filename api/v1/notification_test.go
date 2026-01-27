package v1

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/store/model"
)

func TestNotificationList_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")

	notification := &model.NotificationChannel{
		ID:        "notif-1",
		UserID:    user.ID,
		Name:      "Test Channel",
		Type:      model.NotificationTypeBark,
		IsEnabled: true,
	}
	_ = notification.SetConfig(map[string]interface{}{
		"device_key": "test-key",
	})
	if err := env.store.CreateNotification(notification); err != nil {
		t.Fatalf("create notification: %v", err)
	}

	api := NewNotificationAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/notifications", "")
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.List(c); err != nil {
		t.Fatalf("list: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var notifications []*NotificationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &notifications); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(notifications) != 1 {
		t.Errorf("notifications count = %d, want 1", len(notifications))
	}
}

func TestNotificationList_EmptyReturnsArray(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewNotificationAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/notifications", "")
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.List(c); err != nil {
		t.Fatalf("list: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	// 验证返回的是空数组而不是 null
	if rec.Body.String() != "[]" && rec.Body.String() != "[]\n" {
		t.Errorf("expected empty array, got %q", rec.Body.String())
	}
}

func TestNotificationCreate_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewNotificationAPI(env.store)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/notifications", `{
		"name": "My Bark",
		"type": "bark",
		"config": {
			"device_key": "abc123"
		},
		"is_enabled": true
	}`)
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.Create(c); err != nil {
		t.Fatalf("create: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusCreated)

	var notif NotificationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &notif); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if notif.Name != "My Bark" {
		t.Errorf("name = %q, want My Bark", notif.Name)
	}
	if notif.Type != model.NotificationTypeBark {
		t.Errorf("type = %q, want bark", notif.Type)
	}
	if !notif.IsEnabled {
		t.Error("expected is_enabled = true")
	}
}

func TestNotificationCreate_InvalidName(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewNotificationAPI(env.store)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/notifications", `{
		"name": "",
		"type": "bark"
	}`)
	c := env.newContextWithUser(req, rec, user.ID)

	err := api.Create(c)
	if err == nil {
		t.Fatal("expected error for empty name")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusBadRequest)
	}
}

func TestNotificationCreate_EmptyType(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewNotificationAPI(env.store)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/notifications", `{
		"name": "Test",
		"type": ""
	}`)
	c := env.newContextWithUser(req, rec, user.ID)

	err := api.Create(c)
	if err == nil {
		t.Fatal("expected error for empty type")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusBadRequest)
	}
}

func TestNotificationUpdate_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")

	notification := &model.NotificationChannel{
		ID:        "notif-1",
		UserID:    user.ID,
		Name:      "Old Name",
		Type:      model.NotificationTypeBark,
		IsEnabled: false,
	}
	if err := env.store.CreateNotification(notification); err != nil {
		t.Fatalf("create notification: %v", err)
	}

	api := NewNotificationAPI(env.store)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/notifications/"+notification.ID, `{
		"name": "New Name",
		"is_enabled": true,
		"config": {
			"device_key": "new-key"
		}
	}`)
	c := env.newContextWithUser(req, rec, user.ID)
	c.SetParamNames("id")
	c.SetParamValues(notification.ID)

	if err := api.Update(c); err != nil {
		t.Fatalf("update: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var resp NotificationResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Name != "New Name" {
		t.Errorf("name = %q, want New Name", resp.Name)
	}
	if !resp.IsEnabled {
		t.Error("expected is_enabled = true")
	}
}

func TestNotificationUpdate_NotFound(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewNotificationAPI(env.store)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/notifications/nonexistent", `{
		"name": "Test"
	}`)
	c := env.newContextWithUser(req, rec, user.ID)
	c.SetParamNames("id")
	c.SetParamValues("nonexistent")

	err := api.Update(c)
	if err == nil {
		t.Fatal("expected error for non-existent notification")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusNotFound)
	}
}

func TestNotificationUpdate_OtherUserNotification(t *testing.T) {
	env := newTestEnv(t)
	user1 := env.createAdminUser("user-1", "user1", "password123")
	user2 := env.createNormalUser("user-2", "user2", "password123")

	notification := &model.NotificationChannel{
		ID:        "notif-1",
		UserID:    user1.ID,
		Name:      "User1 Notification",
		Type:      model.NotificationTypeBark,
		IsEnabled: true,
	}
	if err := env.store.CreateNotification(notification); err != nil {
		t.Fatalf("create notification: %v", err)
	}

	api := NewNotificationAPI(env.store)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/notifications/"+notification.ID, `{
		"name": "Hacked"
	}`)
	c := env.newContextWithUser(req, rec, user2.ID)
	c.SetParamNames("id")
	c.SetParamValues(notification.ID)

	err := api.Update(c)
	if err == nil {
		t.Fatal("expected error when updating other user's notification")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusForbidden)
	}
}

func TestNotificationDelete_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")

	notification := &model.NotificationChannel{
		ID:        "notif-1",
		UserID:    user.ID,
		Name:      "To Delete",
		Type:      model.NotificationTypeBark,
		IsEnabled: true,
	}
	if err := env.store.CreateNotification(notification); err != nil {
		t.Fatalf("create notification: %v", err)
	}

	api := NewNotificationAPI(env.store)

	req, rec := env.newRequest(http.MethodDelete, "/api/v1/notifications/"+notification.ID, "")
	c := env.newContextWithUser(req, rec, user.ID)
	c.SetParamNames("id")
	c.SetParamValues(notification.ID)

	if err := api.Delete(c); err != nil {
		t.Fatalf("delete: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusNoContent)

	// 验证通知渠道已删除
	_, err := env.store.GetNotificationByID(notification.ID)
	if err == nil {
		t.Error("expected notification to be deleted")
	}
}

func TestNotificationDelete_NotFound(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("user-1", "testuser", "password123")
	api := NewNotificationAPI(env.store)

	req, rec := env.newRequest(http.MethodDelete, "/api/v1/notifications/nonexistent", "")
	c := env.newContextWithUser(req, rec, user.ID)
	c.SetParamNames("id")
	c.SetParamValues("nonexistent")

	err := api.Delete(c)
	if err == nil {
		t.Fatal("expected error for non-existent notification")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusNotFound)
	}
}

func TestNotificationDelete_OtherUserNotification(t *testing.T) {
	env := newTestEnv(t)
	user1 := env.createAdminUser("user-1", "user1", "password123")
	user2 := env.createNormalUser("user-2", "user2", "password123")

	notification := &model.NotificationChannel{
		ID:        "notif-1",
		UserID:    user1.ID,
		Name:      "User1 Notification",
		Type:      model.NotificationTypeBark,
		IsEnabled: true,
	}
	if err := env.store.CreateNotification(notification); err != nil {
		t.Fatalf("create notification: %v", err)
	}

	api := NewNotificationAPI(env.store)

	req, rec := env.newRequest(http.MethodDelete, "/api/v1/notifications/"+notification.ID, "")
	c := env.newContextWithUser(req, rec, user2.ID)
	c.SetParamNames("id")
	c.SetParamValues(notification.ID)

	err := api.Delete(c)
	if err == nil {
		t.Fatal("expected error when deleting other user's notification")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusForbidden)
	}
}
