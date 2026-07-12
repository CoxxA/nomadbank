package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/v2/internal/config"
	"github.com/CoxxA/nomadbank/v2/internal/domain"
	"github.com/CoxxA/nomadbank/v2/internal/sqlite"
)

func TestSingleOwnerFlow(t *testing.T) {
	server := newTestServer(t)

	status := performRequest(t, server.Echo(), http.MethodGet, "/api/v1/setup", nil, "")
	if status.Code != http.StatusOK || !bytes.Contains(status.Body.Bytes(), []byte(`"initialized":false`)) {
		t.Fatalf("unexpected setup status: %d %s", status.Code, status.Body.String())
	}

	setup := performRequest(t, server.Echo(), http.MethodPost, "/api/v1/setup", map[string]any{
		"username":     "owner",
		"password":     "very-safe-password",
		"display_name": "Nomad",
		"timezone":     "Asia/Shanghai",
	}, "")
	if setup.Code != http.StatusCreated {
		t.Fatalf("setup failed: %d %s", setup.Code, setup.Body.String())
	}
	cookie := setup.Header().Get("Set-Cookie")
	if cookie == "" {
		t.Fatal("setup did not set a session cookie")
	}
	if !strings.Contains(cookie, "HttpOnly") || !strings.Contains(cookie, "SameSite=Lax") {
		t.Fatalf("session cookie is missing security attributes: %s", cookie)
	}
	secondSetup := performRequest(t, server.Echo(), http.MethodPost, "/api/v1/setup", map[string]any{
		"username": "other-owner",
		"password": "another-safe-password",
		"timezone": "UTC",
	}, "")
	if secondSetup.Code != http.StatusConflict {
		t.Fatalf("expected second setup to conflict, got %d", secondSetup.Code)
	}

	for _, name := range []string{"账户 A", "账户 B", "账户 C"} {
		response := performRequest(t, server.Echo(), http.MethodPost, "/api/v1/accounts", map[string]any{
			"name":       name,
			"group_name": "主账户",
			"active":     true,
		}, cookie)
		if response.Code != http.StatusCreated {
			t.Fatalf("create account failed: %d %s", response.Code, response.Body.String())
		}
	}

	strategiesResponse := performRequest(t, server.Echo(), http.MethodGet, "/api/v1/strategies", nil, cookie)
	if strategiesResponse.Code != http.StatusOK {
		t.Fatalf("list strategies failed: %d %s", strategiesResponse.Code, strategiesResponse.Body.String())
	}
	var strategies []domain.Strategy
	if err := json.Unmarshal(strategiesResponse.Body.Bytes(), &strategies); err != nil {
		t.Fatal(err)
	}
	if len(strategies) != 1 {
		t.Fatalf("expected default strategy, got %d", len(strategies))
	}

	batch := performRequest(t, server.Echo(), http.MethodPost, "/api/v1/task-batches", map[string]any{
		"strategy_id": strategies[0].ID,
		"group_name":  "主账户",
		"cycles":      1,
	}, cookie)
	if batch.Code != http.StatusCreated {
		t.Fatalf("create task batch failed: %d %s", batch.Code, batch.Body.String())
	}

	tasksResponse := performRequest(t, server.Echo(), http.MethodGet, "/api/v1/tasks", nil, cookie)
	if tasksResponse.Code != http.StatusOK {
		t.Fatalf("list tasks failed: %d %s", tasksResponse.Code, tasksResponse.Body.String())
	}
	var page domain.TaskPage
	if err := json.Unmarshal(tasksResponse.Body.Bytes(), &page); err != nil {
		t.Fatal(err)
	}
	if page.Total != 3 || len(page.Items) != 3 {
		t.Fatalf("expected 3 tasks, got total=%d items=%d", page.Total, len(page.Items))
	}

	complete := performRequest(
		t,
		server.Echo(),
		http.MethodPost,
		"/api/v1/tasks/"+strconv.FormatInt(page.Items[0].ID, 10)+"/complete",
		nil,
		cookie,
	)
	if complete.Code != http.StatusOK {
		t.Fatalf("complete task failed: %d %s", complete.Code, complete.Body.String())
	}
	var completedTask domain.Task
	if err := json.Unmarshal(complete.Body.Bytes(), &completedTask); err != nil {
		t.Fatal(err)
	}
	repeatedComplete := performRequest(
		t,
		server.Echo(),
		http.MethodPost,
		"/api/v1/tasks/"+strconv.FormatInt(page.Items[0].ID, 10)+"/complete",
		nil,
		cookie,
	)
	var repeatedTask domain.Task
	if err := json.Unmarshal(repeatedComplete.Body.Bytes(), &repeatedTask); err != nil {
		t.Fatal(err)
	}
	if completedTask.CompletedAt == nil || repeatedTask.CompletedAt == nil ||
		!completedTask.CompletedAt.Equal(*repeatedTask.CompletedAt) {
		t.Fatal("completing a task again changed its completion time")
	}

	dashboard := performRequest(t, server.Echo(), http.MethodGet, "/api/v1/dashboard", nil, cookie)
	if dashboard.Code != http.StatusOK || !bytes.Contains(dashboard.Body.Bytes(), []byte(`"completed_tasks":1`)) {
		t.Fatalf("unexpected dashboard: %d %s", dashboard.Code, dashboard.Body.String())
	}

	logout := performRequest(t, server.Echo(), http.MethodDelete, "/api/v1/session", nil, cookie)
	if logout.Code != http.StatusNoContent {
		t.Fatalf("logout failed: %d %s", logout.Code, logout.Body.String())
	}
	unauthorized := performRequest(t, server.Echo(), http.MethodGet, "/api/v1/accounts", nil, cookie)
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthorized after logout, got %d", unauthorized.Code)
	}
}

func TestAuthRateLimiterDoesNotTrustForwardedFor(t *testing.T) {
	server := newTestServer(t)
	rateLimited := false
	for attempt := 1; attempt <= 20; attempt++ {
		request := httptest.NewRequest(
			http.MethodPost,
			"/api/v1/session",
			strings.NewReader(`{"username":"owner","password":"wrong-password"}`),
		)
		request.RemoteAddr = "192.0.2.10:1234"
		request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		request.Header.Set(echo.HeaderXForwardedFor, "203.0.113."+strconv.Itoa(attempt))
		response := httptest.NewRecorder()
		server.Echo().ServeHTTP(response, request)
		if response.Code == http.StatusTooManyRequests {
			rateLimited = true
			break
		}
	}
	if !rateLimited {
		t.Fatal("spoofed X-Forwarded-For values bypassed the authentication rate limit")
	}
}

func TestRequiredFieldsAndDisplayNameLimit(t *testing.T) {
	server := newTestServer(t)

	longSetup := performRequest(t, server.Echo(), http.MethodPost, "/api/v1/setup", map[string]any{
		"username":     "owner",
		"password":     "very-safe-password",
		"display_name": strings.Repeat("名", 81),
		"timezone":     "UTC",
	}, "")
	if longSetup.Code != http.StatusBadRequest {
		t.Fatalf("expected long setup display name to fail, got %d", longSetup.Code)
	}

	setup := performRequest(t, server.Echo(), http.MethodPost, "/api/v1/setup", map[string]any{
		"username": "owner",
		"password": "very-safe-password",
	}, "")
	if setup.Code != http.StatusCreated {
		t.Fatalf("setup failed: %d %s", setup.Code, setup.Body.String())
	}
	if !bytes.Contains(setup.Body.Bytes(), []byte(`"timezone":"Asia/Shanghai"`)) {
		t.Fatalf("setup did not apply the default timezone: %s", setup.Body.String())
	}
	cookie := setup.Header().Get("Set-Cookie")

	tests := []struct {
		name   string
		method string
		path   string
		body   map[string]any
	}{
		{
			name:   "owner timezone",
			method: http.MethodPut,
			path:   "/api/v1/me",
			body:   map[string]any{"display_name": "Nomad"},
		},
		{
			name:   "account active",
			method: http.MethodPost,
			path:   "/api/v1/accounts",
			body:   map[string]any{"name": "Account", "group_name": ""},
		},
		{
			name:   "strategy skip_weekends",
			method: http.MethodPost,
			path:   "/api/v1/strategies",
			body: map[string]any{
				"name":               "Strategy",
				"interval_min_days":  10,
				"interval_max_days":  20,
				"time_start_minutes": 540,
				"time_end_minutes":   1080,
				"amount_min_cents":   100,
				"amount_max_cents":   200,
				"daily_limit":        2,
			},
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := performRequest(t, server.Echo(), test.method, test.path, test.body, cookie)
			if response.Code != http.StatusBadRequest {
				t.Fatalf("expected missing field to fail, got %d: %s", response.Code, response.Body.String())
			}
		})
	}

	longUpdate := performRequest(t, server.Echo(), http.MethodPut, "/api/v1/me", map[string]any{
		"display_name": strings.Repeat("名", 81),
		"timezone":     "UTC",
	}, cookie)
	if longUpdate.Code != http.StatusBadRequest {
		t.Fatalf("expected long profile display name to fail, got %d", longUpdate.Code)
	}
}

func TestServerHasHTTPTimeouts(t *testing.T) {
	server := newTestServer(t)
	httpServer := server.Echo().Server
	if httpServer.ReadHeaderTimeout <= 0 || httpServer.ReadTimeout <= 0 ||
		httpServer.WriteTimeout <= 0 || httpServer.IdleTimeout <= 0 {
		t.Fatal("HTTP server timeouts must all be configured")
	}
}

func newTestServer(t *testing.T) *Server {
	t.Helper()
	store, err := sqlite.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := store.Close(); err != nil {
			t.Errorf("close database: %v", err)
		}
	})
	return New(config.Config{Port: 8080, SessionDays: 30}, store)
}

func performRequest(
	t *testing.T,
	e *echo.Echo,
	method string,
	path string,
	body any,
	cookie string,
) *httptest.ResponseRecorder {
	t.Helper()
	var encoded []byte
	if body != nil {
		var err error
		encoded, err = json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
	}
	request := httptest.NewRequest(method, path, bytes.NewReader(encoded))
	request.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	if cookie != "" {
		request.Header.Set(echo.HeaderCookie, cookie)
	}
	response := httptest.NewRecorder()
	e.ServeHTTP(response, request)
	return response
}
