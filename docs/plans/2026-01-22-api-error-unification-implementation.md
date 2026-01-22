# API Error Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为所有 API 错误响应提供统一 `{code, message, details}` 输出，并保持成功响应不变。

**Architecture:** 新增全局 `HTTPErrorHandler`，集中处理 `echo.NewHTTPError`、panic 与普通 error；在 `server.New` 里注册 handler；以 `omitempty` 控制 `details` 是否出现。

**Tech Stack:** Go, Echo, net/http, testing/httptest

---

### Task 1: 添加错误处理器测试

**Files:**
- Create: `server/error_handler_test.go`

**Step 1: Write the failing test**

```go
package server

import (
    "encoding/json"
    "errors"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/CoxxA/nomadbank/internal/config"
    "github.com/labstack/echo/v4"
)

type errorPayload struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Details interface{} `json:"details,omitempty"`
}

func newTestContext() (echo.Context, *httptest.ResponseRecorder) {
    e := echo.New()
    req := httptest.NewRequest(http.MethodGet, "/", nil)
    rec := httptest.NewRecorder()
    return e.NewContext(req, rec), rec
}

func decodeBody(t *testing.T, rec *httptest.ResponseRecorder) map[string]interface{} {
    t.Helper()
    var body map[string]interface{}
    if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
        t.Fatalf("decode json: %v", err)
    }
    return body
}

func TestHTTPErrorHandler_StringMessage(t *testing.T) {
    cfg := &config.Config{Mode: "prod"}
    handler := NewHTTPErrorHandler(cfg)

    c, rec := newTestContext()
    handler(echo.NewHTTPError(http.StatusBadRequest, "请求格式错误"), c)

    if rec.Code != http.StatusBadRequest {
        t.Fatalf("status = %d", rec.Code)
    }

    body := decodeBody(t, rec)
    if int(body["code"].(float64)) != http.StatusBadRequest {
        t.Fatalf("code = %v", body["code"])
    }
    if body["message"].(string) != "请求格式错误" {
        t.Fatalf("message = %v", body["message"])
    }
    if _, ok := body["details"]; ok {
        t.Fatalf("details should be omitted")
    }
}

func TestHTTPErrorHandler_MapDetails(t *testing.T) {
    cfg := &config.Config{Mode: "prod"}
    handler := NewHTTPErrorHandler(cfg)

    c, rec := newTestContext()
    handler(echo.NewHTTPError(http.StatusBadRequest, map[string]string{
        "field":  "name",
        "reason": "required",
    }), c)

    if rec.Code != http.StatusBadRequest {
        t.Fatalf("status = %d", rec.Code)
    }

    body := decodeBody(t, rec)
    if body["message"].(string) != "请求格式错误" {
        t.Fatalf("message = %v", body["message"])
    }
    details, ok := body["details"].(map[string]interface{})
    if !ok {
        t.Fatalf("details missing")
    }
    if details["field"].(string) != "name" {
        t.Fatalf("details.field = %v", details["field"])
    }
}

func TestHTTPErrorHandler_GenericError_Prod(t *testing.T) {
    cfg := &config.Config{Mode: "prod"}
    handler := NewHTTPErrorHandler(cfg)

    c, rec := newTestContext()
    handler(errors.New("boom"), c)

    if rec.Code != http.StatusInternalServerError {
        t.Fatalf("status = %d", rec.Code)
    }

    body := decodeBody(t, rec)
    if int(body["code"].(float64)) != http.StatusInternalServerError {
        t.Fatalf("code = %v", body["code"])
    }
    if body["message"].(string) != "服务器错误" {
        t.Fatalf("message = %v", body["message"])
    }
    if _, ok := body["details"]; ok {
        t.Fatalf("details should be omitted in prod")
    }
}

func TestHTTPErrorHandler_GenericError_Dev(t *testing.T) {
    cfg := &config.Config{Mode: "dev"}
    handler := NewHTTPErrorHandler(cfg)

    c, rec := newTestContext()
    handler(errors.New("boom"), c)

    body := decodeBody(t, rec)
    if body["message"].(string) != "服务器错误" {
        t.Fatalf("message = %v", body["message"])
    }
    if body["details"].(string) != "boom" {
        t.Fatalf("details = %v", body["details"])
    }
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./server -run TestHTTPErrorHandler`  
Expected: FAIL (undefined: `NewHTTPErrorHandler`)

**Step 3: Commit**

```bash
git add server/error_handler_test.go
git commit -m "test: add HTTP error handler tests"
```

---

### Task 2: 实现统一错误处理器并接入 Server

**Files:**
- Create: `server/error_handler.go`
- Modify: `server/server.go`

**Step 1: Write minimal implementation**

```go
package server

import (
    "net/http"

    "github.com/CoxxA/nomadbank/internal/config"
    "github.com/labstack/echo/v4"
)

type errorResponse struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Details interface{} `json:"details,omitempty"`
}

func NewHTTPErrorHandler(cfg *config.Config) echo.HTTPErrorHandler {
    return func(err error, c echo.Context) {
        if c.Response().Committed {
            return
        }

        code := http.StatusInternalServerError
        message := "服务器错误"
        var details interface{}

        if he, ok := err.(*echo.HTTPError); ok {
            code = he.Code
            switch v := he.Message.(type) {
            case string:
                message = v
            case error:
                message = v.Error()
            default:
                details = v
                message = defaultMessageForCode(code)
            }

            if details == nil && cfg != nil && cfg.IsDev() && he.Internal != nil {
                details = he.Internal.Error()
            }
        } else if cfg != nil && cfg.IsDev() {
            details = err.Error()
        }

        if details == nil && code == http.StatusInternalServerError {
            message = "服务器错误"
        }

        if err := c.JSON(code, errorResponse{
            Code:    code,
            Message: message,
            Details: details,
        }); err != nil {
            c.Logger().Error(err)
        }
    }
}

func defaultMessageForCode(code int) string {
    if code == http.StatusBadRequest {
        return "请求格式错误"
    }
    if code == http.StatusInternalServerError {
        return "服务器错误"
    }
    if text := http.StatusText(code); text != "" {
        return text
    }
    return "服务器错误"
}
```

In `server/server.go` inside `New`, set:

```go
e.HTTPErrorHandler = NewHTTPErrorHandler(cfg)
```

**Step 2: Run tests**

Run: `go test ./server -run TestHTTPErrorHandler`  
Expected: PASS

(Optional full suite) If `go test ./...` fails due to missing `web/dist`, run:
```
cd frontend
npm ci --no-audit --no-fund
npm run build
```
Then run: `go test ./...` (Expected: PASS)

**Step 3: Commit**

```bash
git add server/error_handler.go server/server.go
git commit -m "feat: unify API error responses"
```

---

### Task 3: 验证集成效果（手动）

**Files:**
- No code changes

**Step 1: Run quick manual check**

Run: `go test ./...`  
Expected: PASS

**Step 2: Commit**

No commit required.
