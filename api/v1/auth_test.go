package v1

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestAuthRegister_FirstUserBecomesAdmin(t *testing.T) {
	env := newTestEnv(t)
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/auth/register", `{
		"username": "firstuser",
		"password": "password123"
	}`)
	c := env.echo.NewContext(req, rec)

	if err := api.Register(c); err != nil {
		t.Fatalf("register: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusCreated)

	var resp AuthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.User.Role != "admin" {
		t.Errorf("first user role = %q, want admin", resp.User.Role)
	}
	if resp.AccessToken == "" {
		t.Error("expected access token")
	}
}

func TestAuthRegister_SecondUserBecomesUser(t *testing.T) {
	env := newTestEnv(t)
	env.createAdminUser("admin-1", "admin", "password123")
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/auth/register", `{
		"username": "seconduser",
		"password": "password123"
	}`)
	c := env.echo.NewContext(req, rec)

	if err := api.Register(c); err != nil {
		t.Fatalf("register: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusCreated)

	var resp AuthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.User.Role != "user" {
		t.Errorf("second user role = %q, want user", resp.User.Role)
	}
}

func TestAuthRegister_DuplicateUsername(t *testing.T) {
	env := newTestEnv(t)
	env.createAdminUser("admin-1", "existinguser", "password123")
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/auth/register", `{
		"username": "existinguser",
		"password": "password123"
	}`)
	c := env.echo.NewContext(req, rec)

	err := api.Register(c)
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

func TestAuthRegister_InvalidUsername(t *testing.T) {
	env := newTestEnv(t)
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/auth/register", `{
		"username": "ab",
		"password": "password123"
	}`)
	c := env.echo.NewContext(req, rec)

	err := api.Register(c)
	if err == nil {
		t.Fatal("expected error for short username")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusBadRequest)
	}
}

func TestAuthRegister_InvalidPassword(t *testing.T) {
	env := newTestEnv(t)
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/auth/register", `{
		"username": "testuser",
		"password": "12345"
	}`)
	c := env.echo.NewContext(req, rec)

	err := api.Register(c)
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

func TestAuthLogin_Success(t *testing.T) {
	env := newTestEnv(t)
	env.createAdminUser("admin-1", "testuser", "password123")
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/auth/login", `{
		"username": "testuser",
		"password": "password123"
	}`)
	c := env.echo.NewContext(req, rec)

	if err := api.Login(c); err != nil {
		t.Fatalf("login: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var resp AuthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.AccessToken == "" {
		t.Error("expected access token")
	}
	if resp.User.Username != "testuser" {
		t.Errorf("username = %q, want testuser", resp.User.Username)
	}
}

func TestAuthLogin_WrongPassword(t *testing.T) {
	env := newTestEnv(t)
	env.createAdminUser("admin-1", "testuser", "password123")
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/auth/login", `{
		"username": "testuser",
		"password": "wrongpassword"
	}`)
	c := env.echo.NewContext(req, rec)

	err := api.Login(c)
	if err == nil {
		t.Fatal("expected error for wrong password")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusUnauthorized)
	}
}

func TestAuthLogin_UserNotFound(t *testing.T) {
	env := newTestEnv(t)
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPost, "/api/v1/auth/login", `{
		"username": "nonexistent",
		"password": "password123"
	}`)
	c := env.echo.NewContext(req, rec)

	err := api.Login(c)
	if err == nil {
		t.Fatal("expected error for non-existent user")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusUnauthorized)
	}
}

func TestAuthMe_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("admin-1", "testuser", "password123")
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/auth/me", "")
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.Me(c); err != nil {
		t.Fatalf("me: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var resp UserInfo
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Username != "testuser" {
		t.Errorf("username = %q, want testuser", resp.Username)
	}
}

func TestAuthMe_UserNotFound(t *testing.T) {
	env := newTestEnv(t)
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodGet, "/api/v1/auth/me", "")
	c := env.newContextWithUser(req, rec, "nonexistent-id")

	err := api.Me(c)
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

func TestAuthChangePassword_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("admin-1", "testuser", "oldpassword")
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/auth/password", `{
		"old_password": "oldpassword",
		"new_password": "newpassword123"
	}`)
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.ChangePassword(c); err != nil {
		t.Fatalf("change password: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	// 验证新密码可以登录
	req2, rec2 := env.newRequest(http.MethodPost, "/api/v1/auth/login", `{
		"username": "testuser",
		"password": "newpassword123"
	}`)
	c2 := env.echo.NewContext(req2, rec2)

	if err := api.Login(c2); err != nil {
		t.Fatalf("login with new password: %v", err)
	}
	assertStatus(t, rec2.Code, http.StatusOK)
}

func TestAuthChangePassword_WrongOldPassword(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("admin-1", "testuser", "oldpassword")
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/auth/password", `{
		"old_password": "wrongpassword",
		"new_password": "newpassword123"
	}`)
	c := env.newContextWithUser(req, rec, user.ID)

	err := api.ChangePassword(c)
	if err == nil {
		t.Fatal("expected error for wrong old password")
	}

	httpErr, ok := err.(*echo.HTTPError)
	if !ok {
		t.Fatalf("expected echo.HTTPError, got %T", err)
	}
	if httpErr.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", httpErr.Code, http.StatusBadRequest)
	}
}

func TestAuthUpdateProfile_Success(t *testing.T) {
	env := newTestEnv(t)
	user := env.createAdminUser("admin-1", "testuser", "password123")
	api := NewAuthAPI(env.store, env.config)

	req, rec := env.newRequest(http.MethodPut, "/api/v1/auth/profile", `{
		"nickname": "New Nickname",
		"avatar": "https://example.com/avatar.png"
	}`)
	c := env.newContextWithUser(req, rec, user.ID)

	if err := api.UpdateProfile(c); err != nil {
		t.Fatalf("update profile: %v", err)
	}

	assertStatus(t, rec.Code, http.StatusOK)

	var resp UserInfo
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Nickname != "New Nickname" {
		t.Errorf("nickname = %q, want New Nickname", resp.Nickname)
	}
	if resp.Avatar != "https://example.com/avatar.png" {
		t.Errorf("avatar = %q, want https://example.com/avatar.png", resp.Avatar)
	}
}
