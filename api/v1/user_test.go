package v1

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestUserInitialized_NoUsers(t *testing.T) {
	env := newTestEnv(t)
	api := NewUserAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/system/initialized", "")
	c := env.echo.NewContext(req, rec)

	if err := api.Initialized(c); err != nil {
		t.Fatalf("initialized: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var resp SystemStatus
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Initialized {
		t.Error("expected initialized = false")
	}
	if resp.UserCount != 0 {
		t.Errorf("user_count = %d, want 0", resp.UserCount)
	}
}

func TestUserInitialized_HasUsers(t *testing.T) {
	env := newTestEnv(t)
	env.createAdminUser("admin-1", "admin", "password123")
	api := NewUserAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/system/initialized", "")
	c := env.echo.NewContext(req, rec)

	if err := api.Initialized(c); err != nil {
		t.Fatalf("initialized: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var resp SystemStatus
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !resp.Initialized {
		t.Error("expected initialized = true")
	}
	if resp.UserCount != 1 {
		t.Errorf("user_count = %d, want 1", resp.UserCount)
	}
}

func TestUserList_AsAdmin(t *testing.T) {
	env := newTestEnv(t)
	admin := env.createAdminUser("admin-1", "admin", "password123")
	env.createNormalUser("user-1", "user1", "password123")
	api := NewUserAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/users", "")
	c := env.newContextWithUser(req, rec, admin.ID)

	if err := api.List(c); err != nil {
		t.Fatalf("list: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var users []*UserResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &users); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(users) != 2 {
		t.Errorf("users count = %d, want 2", len(users))
	}
}

func TestUserList_AsNormalUser(t *testing.T) {
	env := newTestEnv(t)
	env.createAdminUser("admin-1", "admin", "password123")
	user := env.createNormalUser("user-1", "user1", "password123")
	api := NewUserAPI(env.store)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/users", "")
	c := env.newContextWithUser(req, rec, user.ID)

	err := api.List(c)
	if err == nil {
		t.Fatal("expected error for non-admin user")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusForbidden {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusForbidden)
	}
}

func TestUserCreate_AsAdmin(t *testing.T) {
	env := newTestEnv(t)
	admin := env.createAdminUser("admin-1", "admin", "password123")
	api := NewUserAPI(env.store)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/users", `{
		"username": "newuser",
		"password": "password123",
		"role": "user",
		"nickname": "New User"
	}`)
	c := env.newContextWithUser(req, rec, admin.ID)

	if err := api.Create(c); err != nil {
		t.Fatalf("create: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusCreated)

	var user UserResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &user); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if user.Username != "newuser" {
		t.Errorf("username = %q, want newuser", user.Username)
	}
	if user.Role != "user" {
		t.Errorf("role = %q, want user", user.Role)
	}
}

func TestUserCreate_DuplicateUsername(t *testing.T) {
	env := newTestEnv(t)
	admin := env.createAdminUser("admin-1", "admin", "password123")
	env.createNormalUser("user-1", "existinguser", "password123")
	api := NewUserAPI(env.store)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/users", `{
		"username": "existinguser",
		"password": "password123"
	}`)
	c := env.newContextWithUser(req, rec, admin.ID)

	err := api.Create(c)
	if err == nil {
		t.Fatal("expected error for duplicate username")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusConflict {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusConflict)
	}
}

func TestUserUpdate_AsAdmin(t *testing.T) {
	env := newTestEnv(t)
	admin := env.createAdminUser("admin-1", "admin", "password123")
	user := env.createNormalUser("user-1", "user1", "password123")
	api := NewUserAPI(env.store)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/users/"+user.ID, `{
		"nickname": "Updated Nickname",
		"role": "admin"
	}`)
	c := env.newContextWithUser(req, rec, admin.ID)
	c.SetParamNames("id")
	c.SetParamValues(user.ID)

	if err := api.Update(c); err != nil {
		t.Fatalf("update: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var resp UserResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Nickname != "Updated Nickname" {
		t.Errorf("nickname = %q, want Updated Nickname", resp.Nickname)
	}
	if resp.Role != "admin" {
		t.Errorf("role = %q, want admin", resp.Role)
	}
}

func TestUserUpdate_NotFound(t *testing.T) {
	env := newTestEnv(t)
	admin := env.createAdminUser("admin-1", "admin", "password123")
	api := NewUserAPI(env.store)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/users/nonexistent", `{
		"nickname": "Updated"
	}`)
	c := env.newContextWithUser(req, rec, admin.ID)
	c.SetParamNames("id")
	c.SetParamValues("nonexistent")

	err := api.Update(c)
	if err == nil {
		t.Fatal("expected error for non-existent user")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusNotFound)
	}
}

func TestUserDelete_AsAdmin(t *testing.T) {
	env := newTestEnv(t)
	admin := env.createAdminUser("admin-1", "admin", "password123")
	user := env.createNormalUser("user-1", "user1", "password123")
	api := NewUserAPI(env.store)

	req, rec := env.newRequest(http.MethodDelete, "/api/v1/users/"+user.ID, "")
	c := env.newContextWithUser(req, rec, admin.ID)
	c.SetParamNames("id")
	c.SetParamValues(user.ID)

	if err := api.Delete(c); err != nil {
		t.Fatalf("delete: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusNoContent)

	// 验证用户已删除
	_, err := env.store.GetUserByID(user.ID)
	if err == nil {
		t.Error("expected user to be deleted")
	}
}

func TestUserDelete_CannotDeleteSelf(t *testing.T) {
	env := newTestEnv(t)
	admin := env.createAdminUser("admin-1", "admin", "password123")
	api := NewUserAPI(env.store)

	req, rec := env.newRequest(http.MethodDelete, "/api/v1/users/"+admin.ID, "")
	c := env.newContextWithUser(req, rec, admin.ID)
	c.SetParamNames("id")
	c.SetParamValues(admin.ID)

	err := api.Delete(c)
	if err == nil {
		t.Fatal("expected error when deleting self")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusBadRequest)
	}
}

func TestUserResetPassword_AsAdmin(t *testing.T) {
	env := newTestEnv(t)
	admin := env.createAdminUser("admin-1", "admin", "password123")
	user := env.createNormalUser("user-1", "user1", "oldpassword")
	api := NewUserAPI(env.store)
	authAPI := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/users/"+user.ID+"/password", `{
		"password": "newpassword123"
	}`)
	c := env.newContextWithUser(req, rec, admin.ID)
	c.SetParamNames("id")
	c.SetParamValues(user.ID)

	if err := api.ResetPassword(c); err != nil {
		t.Fatalf("reset password: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	// 验证新密码可以登录
	req2, rec2 := env.newRequest(http.MethodPost, "/api/v1/auth/login", `{
		"username": "user1",
		"password": "newpassword123"
	}`)
	c2 := env.echo.NewContext(req2, rec2)

	if err := authAPI.Login(c2); err != nil {
		t.Fatalf("login with new password: %v", err)
	}
	assertStatus(t, rec2.Code, http.StatusOK)
}

func TestUserResetPassword_InvalidPassword(t *testing.T) {
	env := newTestEnv(t)
	admin := env.createAdminUser("admin-1", "admin", "password123")
	user := env.createNormalUser("user-1", "user1", "oldpassword")
	api := NewUserAPI(env.store)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/users/"+user.ID+"/password", `{
		"password": "short"
	}`)
	c := env.newContextWithUser(req, rec, admin.ID)
	c.SetParamNames("id")
	c.SetParamValues(user.ID)

	err := api.ResetPassword(c)
	if err == nil {
		t.Fatal("expected error for short password")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusBadRequest)
	}
}
