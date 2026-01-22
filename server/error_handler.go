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
