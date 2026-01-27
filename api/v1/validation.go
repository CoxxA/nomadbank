package v1

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/internal/consts"
)

// validateUsername 验证用户名
// 返回处理后的用户名和可能的错误
func validateUsername(username string) (string, error) {
	username = strings.TrimSpace(username)
	if len(username) < consts.MinUsernameLength {
		return "", echo.NewHTTPError(http.StatusBadRequest, "用户名至少 3 个字符")
	}
	if len(username) > consts.MaxUsernameLength {
		return "", echo.NewHTTPError(http.StatusBadRequest, "用户名不能超过 50 个字符")
	}
	return username, nil
}

// validatePassword 验证密码
func validatePassword(password string) error {
	if len(password) < consts.MinPasswordLength {
		return echo.NewHTTPError(http.StatusBadRequest, "密码至少 6 个字符")
	}
	if len(password) > consts.MaxPasswordLength {
		return echo.NewHTTPError(http.StatusBadRequest, "密码不能超过 128 个字符")
	}
	return nil
}

// validateName 验证名称字段（银行名、策略名等）
func validateName(name string, fieldName string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", echo.NewHTTPError(http.StatusBadRequest, fieldName+"不能为空")
	}
	if len(name) > consts.MaxNameLength {
		return "", echo.NewHTTPError(http.StatusBadRequest, fieldName+"不能超过 100 个字符")
	}
	return name, nil
}

// validateNickname 验证昵称
func validateNickname(nickname string) (string, error) {
	nickname = strings.TrimSpace(nickname)
	if len(nickname) > consts.MaxNicknameLength {
		return "", echo.NewHTTPError(http.StatusBadRequest, "昵称不能超过 50 个字符")
	}
	return nickname, nil
}

// normalizeAmountRange 规范化金额范围，确保 min <= max
// 如果 min > max，则交换两者
func normalizeAmountRange(min, max float64) (float64, float64) {
	if min > max {
		return max, min
	}
	return min, max
}

// normalizeIntervalRange 规范化间隔范围，确保 min <= max
func normalizeIntervalRange(min, max int) (int, int) {
	if min > max {
		return max, min
	}
	return min, max
}

// timeRegexp HH:MM 时间格式正则
var timeRegexp = regexp.MustCompile(`^([01]?[0-9]|2[0-3]):[0-5][0-9]$`)

// validateTimeFormat 验证时间格式 (HH:MM)
func validateTimeFormat(timeStr string) error {
	if timeStr == "" {
		return nil // 空字符串是允许的（使用默认值）
	}
	if !timeRegexp.MatchString(timeStr) {
		return echo.NewHTTPError(http.StatusBadRequest, "时间格式无效，应为 HH:MM")
	}
	return nil
}

// validateTimeRange 验证时间范围
func validateTimeRange(start, end string) error {
	if err := validateTimeFormat(start); err != nil {
		return err
	}
	if err := validateTimeFormat(end); err != nil {
		return err
	}
	// 如果都有值，检查 start < end
	if start != "" && end != "" && start >= end {
		return echo.NewHTTPError(http.StatusBadRequest, "开始时间必须早于结束时间")
	}
	return nil
}
