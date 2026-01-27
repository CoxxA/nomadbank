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
