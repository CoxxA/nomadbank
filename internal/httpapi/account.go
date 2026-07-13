package httpapi

import (
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v4"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
)

type accountRequest struct {
	Name      *string `json:"name"`
	GroupName *string `json:"group_name"`
	Active    *bool   `json:"active"`
}

func (s *Server) listAccounts(c echo.Context) error {
	accounts, err := s.store.ListAccounts(c.Request().Context(), false, "")
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, accounts)
}

func (s *Server) getAccount(c echo.Context) error {
	id, err := parseID(c.Param("id"))
	if err != nil {
		return err
	}
	account, err := s.store.GetAccount(c.Request().Context(), id)
	if err != nil {
		return mapStoreError(err, "账户不存在")
	}
	return c.JSON(http.StatusOK, account)
}

func (s *Server) createAccount(c echo.Context) error {
	var request accountRequest
	if err := c.Bind(&request); err != nil {
		return badRequest("invalid_json", "请求格式错误")
	}
	account, err := accountFromRequest(request, nil)
	if err != nil {
		return err
	}
	if err := s.store.CreateAccount(c.Request().Context(), &account); err != nil {
		return mapStoreError(err, "账户不存在")
	}
	return c.JSON(http.StatusCreated, account)
}

func (s *Server) updateAccount(c echo.Context) error {
	id, err := parseID(c.Param("id"))
	if err != nil {
		return err
	}
	existing, err := s.store.GetAccount(c.Request().Context(), id)
	if err != nil {
		return mapStoreError(err, "账户不存在")
	}
	var request accountRequest
	if err := c.Bind(&request); err != nil {
		return badRequest("invalid_json", "请求格式错误")
	}
	account, err := accountFromRequest(request, &existing)
	if err != nil {
		return err
	}
	if err := s.store.UpdateAccount(c.Request().Context(), &account); err != nil {
		return mapStoreError(err, "账户不存在")
	}
	return c.JSON(http.StatusOK, account)
}

func (s *Server) deleteAccount(c echo.Context) error {
	id, err := parseID(c.Param("id"))
	if err != nil {
		return err
	}
	if err := s.store.DeleteAccount(c.Request().Context(), id); err != nil {
		return mapStoreError(err, "账户不存在")
	}
	return c.NoContent(http.StatusNoContent)
}

func accountFromRequest(request accountRequest, existing *domain.Account) (domain.Account, error) {
	if request.Name == nil || request.GroupName == nil || request.Active == nil {
		return domain.Account{}, badRequest("missing_fields", "name、group_name 和 active 均为必填项")
	}
	name := strings.TrimSpace(*request.Name)
	groupName := strings.TrimSpace(*request.GroupName)
	if utf8.RuneCountInString(name) < 1 || utf8.RuneCountInString(name) > 100 {
		return domain.Account{}, badRequest("invalid_account_name", "账户名称需为 1～100 个字符")
	}
	if utf8.RuneCountInString(groupName) > 50 {
		return domain.Account{}, badRequest("invalid_group_name", "分组名称不能超过 50 个字符")
	}
	account := domain.Account{Name: name, GroupName: groupName, Active: *request.Active}
	if existing != nil {
		account = *existing
		account.Name = name
		account.GroupName = groupName
		account.Active = *request.Active
	}
	return account, nil
}

func parseID(value string) (int64, error) {
	id, err := strconv.ParseInt(value, 10, 64)
	if err != nil || id <= 0 {
		return 0, badRequest("invalid_id", "ID 无效")
	}
	return id, nil
}
