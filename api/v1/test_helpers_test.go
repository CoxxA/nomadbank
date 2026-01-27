package v1

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"

	"github.com/CoxxA/nomadbank/internal/config"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
)

// testEnv 测试环境
type testEnv struct {
	store  *store.Store
	config *config.Config
	echo   *echo.Echo
	t      *testing.T
}

// newTestEnv 创建测试环境
func newTestEnv(t *testing.T) *testEnv {
	t.Helper()
	db, err := store.NewDB(filepath.Join(t.TempDir(), "test.db"), false)
	if err != nil {
		t.Fatalf("new db: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("get db: %v", err)
	}
	t.Cleanup(func() {
		if closeErr := sqlDB.Close(); closeErr != nil {
			t.Errorf("close db: %v", closeErr)
		}
	})

	return &testEnv{
		store: store.New(db),
		config: &config.Config{
			JWTSecret:      "test-secret",
			JWTExpireHours: 24,
		},
		echo: echo.New(),
		t:    t,
	}
}

// createAdminUser 创建管理员用户
func (e *testEnv) createAdminUser(id, username, password string) *model.User {
	e.t.Helper()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		e.t.Fatalf("hash password: %v", err)
	}
	user := &model.User{
		ID:           id,
		Username:     username,
		PasswordHash: string(hashedPassword),
		Role:         model.UserRoleAdmin,
		Nickname:     username,
	}
	if err := e.store.CreateUser(user); err != nil {
		e.t.Fatalf("create admin user: %v", err)
	}
	return user
}

// createNormalUser 创建普通用户
func (e *testEnv) createNormalUser(id, username, password string) *model.User {
	e.t.Helper()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		e.t.Fatalf("hash password: %v", err)
	}
	user := &model.User{
		ID:           id,
		Username:     username,
		PasswordHash: string(hashedPassword),
		Role:         model.UserRoleUser,
		Nickname:     username,
	}
	if err := e.store.CreateUser(user); err != nil {
		e.t.Fatalf("create normal user: %v", err)
	}
	return user
}

// newRequest 创建新请求
func (e *testEnv) newRequest(method, path string, body string) (*http.Request, *httptest.ResponseRecorder) {
	e.t.Helper()
	var bodyReader io.Reader
	if body != "" {
		bodyReader = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, path, bodyReader)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	return req, httptest.NewRecorder()
}

// newContextWithUser 创建带用户 ID 的 Context
func (e *testEnv) newContextWithUser(req *http.Request, rec *httptest.ResponseRecorder, userID string) echo.Context {
	e.t.Helper()
	c := e.echo.NewContext(req, rec)
	c.Set("user_id", userID)
	return c
}

// assertStatus 断言 HTTP 状态码
func assertStatus(t *testing.T, got, want int) {
	t.Helper()
	if got != want {
		t.Errorf("status = %d, want %d", got, want)
	}
}

// assertJSON 断言 JSON 响应
func assertJSON(t *testing.T, body []byte, key string, want interface{}) {
	t.Helper()
	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		t.Fatalf("unmarshal json: %v", err)
	}
	got := data[key]
	if got != want {
		t.Errorf("json[%q] = %v, want %v", key, got, want)
	}
}

// assertContains 断言字符串包含
func assertContains(t *testing.T, s, substr string) {
	t.Helper()
	if !strings.Contains(s, substr) {
		t.Errorf("string %q does not contain %q", s, substr)
	}
}
