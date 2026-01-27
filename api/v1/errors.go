package v1

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// ========== 通用错误辅助函数 ==========

// errBadRequest 返回 400 错误
func errBadRequest(message string) *echo.HTTPError {
	return echo.NewHTTPError(http.StatusBadRequest, message)
}

// errForbidden 返回 403 错误
func errForbidden(message string) *echo.HTTPError {
	return echo.NewHTTPError(http.StatusForbidden, message)
}

// errInternal 返回 500 错误
func errInternal(message string) *echo.HTTPError {
	return echo.NewHTTPError(http.StatusInternalServerError, message)
}

// ========== 常用错误消息常量 ==========

const (
	// 请求相关
	msgRequestFormatError = "请求格式错误"

	// 权限相关
	msgRequireAdminRole = "需要管理员权限"
	msgNoAccess         = "无权访问"

	// 认证相关
	msgPasswordProcessFail = "密码处理失败"
)
