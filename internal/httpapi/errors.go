package httpapi

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/v2/internal/sqlite"
)

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type APIError struct {
	Status  int
	Code    string
	Message string
}

func (e *APIError) Error() string {
	return e.Message
}

func apiError(status int, code, message string) error {
	return &APIError{Status: status, Code: code, Message: message}
}

func badRequest(code, message string) error {
	return apiError(http.StatusBadRequest, code, message)
}

func notFound(message string) error {
	return apiError(http.StatusNotFound, "not_found", message)
}

func conflict(code, message string) error {
	return apiError(http.StatusConflict, code, message)
}

func unauthorized() error {
	return apiError(http.StatusUnauthorized, "unauthorized", "请先登录")
}

func mapStoreError(err error, notFoundMessage string) error {
	switch {
	case errors.Is(err, sqlite.ErrNotFound):
		return notFound(notFoundMessage)
	case errors.Is(err, sqlite.ErrConflict):
		return conflict("conflict", "名称已经存在")
	case errors.Is(err, sqlite.ErrInUse):
		return conflict("resource_in_use", "该记录已被任务引用，不能删除")
	default:
		return err
	}
}

func errorHandler(err error, c echo.Context) {
	if c.Response().Committed {
		return
	}
	var appError *APIError
	if errors.As(err, &appError) {
		_ = c.JSON(appError.Status, ErrorResponse{Code: appError.Code, Message: appError.Message})
		return
	}
	var echoError *echo.HTTPError
	if errors.As(err, &echoError) {
		message, ok := echoError.Message.(string)
		if !ok {
			message = http.StatusText(echoError.Code)
		}
		_ = c.JSON(echoError.Code, ErrorResponse{Code: "http_error", Message: message})
		return
	}
	c.Logger().Error(err)
	_ = c.JSON(http.StatusInternalServerError, ErrorResponse{
		Code:    "internal_error",
		Message: "服务器内部错误",
	})
}
