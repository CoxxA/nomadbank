package web

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestRegisterRoutesDoesNotHideReservedPaths(t *testing.T) {
	e := echo.New()
	RegisterRoutes(e)

	for _, path := range []string{"/api", "/api/v1/unknown", "/health", "/health/unknown"} {
		request := httptest.NewRequest(http.MethodGet, path, nil)
		response := httptest.NewRecorder()
		e.ServeHTTP(response, request)

		if response.Code != http.StatusNotFound {
			t.Fatalf("expected %s to return 404, got %d", path, response.Code)
		}
	}
}
