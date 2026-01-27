package v1

import (
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/CoxxA/nomadbank/server/middleware"
	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
)

// UserAPI 用户管理 API
type UserAPI struct {
	store *store.Store
}

// NewUserAPI 创建用户管理 API
func NewUserAPI(store *store.Store) *UserAPI {
	return &UserAPI{store: store}
}

// SystemStatus 系统状态响应
type SystemStatus struct {
	Initialized bool  `json:"initialized"`
	UserCount   int64 `json:"user_count"`
}

// Initialized 检查系统是否已初始化（是否有用户）
func (a *UserAPI) Initialized(c echo.Context) error {
	count, err := a.store.CountUsers()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "查询失败")
	}

	return c.JSON(http.StatusOK, &SystemStatus{
		Initialized: count > 0,
		UserCount:   count,
	})
}

// UserResponse 用户响应（不包含密码）
type UserResponse struct {
	ID        string         `json:"id"`
	Username  string         `json:"username"`
	Role      model.UserRole `json:"role"`
	Nickname  string         `json:"nickname"`
	Avatar    string         `json:"avatar"`
	CreatedAt string         `json:"created_at"`
}

func toUserResponse(user *model.User) *UserResponse {
	return &UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Role:      user.Role,
		Nickname:  user.Nickname,
		Avatar:    user.Avatar,
		CreatedAt: formatDate(user.CreatedAt),
	}
}

// List 获取用户列表（管理员）
func (a *UserAPI) List(c echo.Context) error {
	// 检查是否是管理员
	if !a.isAdmin(c) {
		return errForbidden(msgRequireAdminRole)
	}

	users, err := a.store.ListUsers()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "获取用户列表失败")
	}

	// 转换响应
	response := make([]*UserResponse, len(users))
	for i := range users {
		response[i] = toUserResponse(&users[i])
	}

	return c.JSON(http.StatusOK, response)
}

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	Username string         `json:"username"`
	Password string         `json:"password"`
	Role     model.UserRole `json:"role"`
	Nickname string         `json:"nickname"`
}

// Create 创建用户（管理员）
func (a *UserAPI) Create(c echo.Context) error {
	// 检查是否是管理员
	if !a.isAdmin(c) {
		return errForbidden(msgRequireAdminRole)
	}

	var req CreateUserRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	// 验证用户名
	username, err := validateUsername(req.Username)
	if err != nil {
		return err
	}
	req.Username = username

	// 验证密码
	if err := validatePassword(req.Password); err != nil {
		return err
	}

	// 检查用户名是否已存在
	existing, err := a.store.GetUserByUsername(req.Username)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		// 数据库错误，非"用户不存在"
		return echo.NewHTTPError(http.StatusInternalServerError, "检查用户名失败")
	}
	if existing != nil {
		return echo.NewHTTPError(http.StatusConflict, "用户名已存在")
	}

	// 哈希密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return errInternal(msgPasswordProcessFail)
	}

	// 设置默认角色
	role := req.Role
	if role == "" {
		role = model.UserRoleUser
	}

	// 创建用户
	user := &model.User{
		ID:           uuid.New().String(),
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		Role:         role,
		Nickname:     req.Nickname,
	}

	if err := a.store.CreateUser(user); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建用户失败")
	}

	return c.JSON(http.StatusCreated, toUserResponse(user))
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	Role     model.UserRole `json:"role"`
	Nickname string         `json:"nickname"`
	Avatar   string         `json:"avatar"`
}

// Update 更新用户（管理员）
func (a *UserAPI) Update(c echo.Context) error {
	// 检查是否是管理员
	if !a.isAdmin(c) {
		return errForbidden(msgRequireAdminRole)
	}

	userID := c.Param("id")
	user, err := a.store.GetUserByID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "用户不存在")
	}

	var req UpdateUserRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	// 更新字段
	if req.Role != "" {
		user.Role = req.Role
	}
	if req.Nickname != "" {
		user.Nickname = req.Nickname
	}
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}

	if err := a.store.UpdateUser(user); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "更新用户失败")
	}

	return c.JSON(http.StatusOK, toUserResponse(user))
}

// Delete 删除用户（管理员）
func (a *UserAPI) Delete(c echo.Context) error {
	// 检查是否是管理员
	if !a.isAdmin(c) {
		return errForbidden(msgRequireAdminRole)
	}

	currentUserID := middleware.GetUserID(c)
	userID := c.Param("id")

	// 不能删除自己
	if userID == currentUserID {
		return echo.NewHTTPError(http.StatusBadRequest, "不能删除自己")
	}

	// 检查用户是否存在
	_, err := a.store.GetUserByID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "用户不存在")
	}

	if err := a.store.DeleteUser(userID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "删除用户失败")
	}

	return c.NoContent(http.StatusNoContent)
}

// ResetPasswordRequest 重置密码请求
type ResetPasswordRequest struct {
	Password string `json:"password"`
}

// ResetPassword 重置用户密码（管理员）
func (a *UserAPI) ResetPassword(c echo.Context) error {
	// 检查是否是管理员
	if !a.isAdmin(c) {
		return errForbidden(msgRequireAdminRole)
	}

	userID := c.Param("id")
	user, err := a.store.GetUserByID(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "用户不存在")
	}

	var req ResetPasswordRequest
	if err := c.Bind(&req); err != nil {
		return errBadRequest(msgRequestFormatError)
	}

	if err := validatePassword(req.Password); err != nil {
		return err
	}

	// 哈希新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return errInternal(msgPasswordProcessFail)
	}

	user.PasswordHash = string(hashedPassword)
	if err := a.store.UpdateUser(user); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "重置密码失败")
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "密码已重置"})
}

// isAdmin 检查当前用户是否是管理员
func (a *UserAPI) isAdmin(c echo.Context) bool {
	userID := middleware.GetUserID(c)
	user, err := a.store.GetUserByID(userID)
	if err != nil {
		return false
	}
	return user.IsAdmin()
}
