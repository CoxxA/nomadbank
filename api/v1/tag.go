package v1

import (
	"net/http"
	"strings"

	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

// TagAPI 标签 API
type TagAPI struct {
	store *store.Store
}

// NewTagAPI 创建标签 API
func NewTagAPI(store *store.Store) *TagAPI {
	return &TagAPI{store: store}
}

// CreateTagRequest 创建标签请求
type CreateTagRequest struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

// List 获取标签列表
func (a *TagAPI) List(c echo.Context) error {
	userID := middleware.GetUserID(c)

	tags, err := a.store.ListTagsByUserID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取标签列表失败")
	}

	return c.JSON(http.StatusOK, tags)
}

// Create 创建标签
func (a *TagAPI) Create(c echo.Context) error {
	userID := middleware.GetUserID(c)

	var req CreateTagRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "请求格式错误")
	}

	// 验证名称
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "标签名称不能为空")
	}

	// 设置默认颜色
	if req.Color == "" {
		req.Color = "#3b82f6"
	}

	tag := &model.Tag{
		ID:     uuid.New().String(),
		UserID: userID,
		Name:   req.Name,
		Color:  req.Color,
	}

	if err := a.store.CreateTag(tag); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建标签失败")
	}

	return c.JSON(http.StatusCreated, tag)
}

// Delete 删除标签
func (a *TagAPI) Delete(c echo.Context) error {
	userID := middleware.GetUserID(c)
	tagID := c.Param("id")

	tags, err := a.store.ListTagsByUserID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取标签失败")
	}

	var found bool
	for _, t := range tags {
		if t.ID == tagID {
			found = true
			break
		}
	}

	if !found {
		return echo.NewHTTPError(http.StatusNotFound, "标签不存在")
	}

	if err := a.store.DeleteTag(tagID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "删除标签失败")
	}

	return c.NoContent(http.StatusNoContent)
}
