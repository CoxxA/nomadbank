package v1

import (
	"fmt"
	"strconv"

	"github.com/labstack/echo/v4"
)

type PageResult[T any] struct {
	Items    []T   `json:"items"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
}

const (
	defaultPage     = 1
	defaultPageSize = 20
	maxPageSize     = 100
)

func parsePageParams(c echo.Context) (int, int, error) {
	page := defaultPage
	pageSize := defaultPageSize

	if v := c.QueryParam("page"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 1 {
			return 0, 0, fmt.Errorf("invalid page")
		}
		page = parsed
	}
	if v := c.QueryParam("page_size"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil || parsed < 1 {
			return 0, 0, fmt.Errorf("invalid page_size")
		}
		if parsed > maxPageSize {
			parsed = maxPageSize
		}
		pageSize = parsed
	}
	return page, pageSize, nil
}
