package v1

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
)

// ========== 通用错误辅助函数 ==========

// errBadRequest 返回 400 错误
func errBadRequest(message string) *echo.HTTPError {
	return echo.NewHTTPError(http.StatusBadRequest, message)
}

// errUnauthorized 返回 401 错误
func errUnauthorized(message string) *echo.HTTPError {
	return echo.NewHTTPError(http.StatusUnauthorized, message)
}

// errForbidden 返回 403 错误
func errForbidden(message string) *echo.HTTPError {
	return echo.NewHTTPError(http.StatusForbidden, message)
}

// errNotFound 返回 404 错误
func errNotFound(resource string) *echo.HTTPError {
	return echo.NewHTTPError(http.StatusNotFound, fmt.Sprintf("%s不存在", resource))
}

// errInternal 返回 500 错误
func errInternal(message string) *echo.HTTPError {
	return echo.NewHTTPError(http.StatusInternalServerError, message)
}

// ========== 资源操作错误辅助函数 ==========

// errListFailed 获取列表失败
func errListFailed(resource string) *echo.HTTPError {
	return errInternal(fmt.Sprintf("获取%s列表失败", resource))
}

// errGetFailed 获取详情失败
func errGetFailed(resource string) *echo.HTTPError {
	return errInternal(fmt.Sprintf("获取%s失败", resource))
}

// errCreateFailed 创建失败
func errCreateFailed(resource string) *echo.HTTPError {
	return errInternal(fmt.Sprintf("创建%s失败", resource))
}

// errUpdateFailed 更新失败
func errUpdateFailed(resource string) *echo.HTTPError {
	return errInternal(fmt.Sprintf("更新%s失败", resource))
}

// errDeleteFailed 删除失败
func errDeleteFailed(resource string) *echo.HTTPError {
	return errInternal(fmt.Sprintf("删除%s失败", resource))
}

// ========== 常用错误消息常量 ==========

const (
	// 请求相关
	msgRequestFormatError = "请求格式错误"
	msgInvalidID          = "无效的 ID"

	// 权限相关
	msgRequireAdminRole = "需要管理员权限"
	msgNoAccess         = "无权访问"

	// 认证相关
	msgPasswordProcessFail = "密码处理失败"
	msgLoginFailed         = "用户名或密码错误"
	msgUsernameTaken       = "用户名已存在"

	// 资源名称
	resourceUser         = "用户"
	resourceBank         = "银行"
	resourceStrategy     = "策略"
	resourceTask         = "任务"
	resourceNotification = "通知渠道"
)
