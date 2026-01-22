# API 错误响应统一设计

日期: 2026-01-22

## 目标
- 统一所有 API 的错误返回结构为 `{code, message, details}`。
- `code` 为 HTTP 状态码数字，`message` 为可读文案，`details` 仅在需要时填充。
- 成功响应保持原样不变，保证向后兼容。

## 范围
- 覆盖所有 Echo API 路由与中间件返回的错误。
- 覆盖 panic 与普通 error 的统一输出。

## 非目标
- 不引入业务码体系。
- 不强制改动各 API 现有成功响应结构。

## 统一响应结构
```
{
  "code": 400,
  "message": "请求格式错误",
  "details": {"field": "name", "reason": "required"}
}
```

## 方案概述
- 在 `server.New` 中设置全局 `HTTPErrorHandler`。
- 统一将 `echo.NewHTTPError` / panic / 普通 error 映射为标准结构。
- 生产环境隐藏内部错误细节，开发环境可在 `details` 中透出 `err.Error()`。

## 错误映射规则
1. `*echo.HTTPError`:
   - `code` 使用 `he.Code`。
   - `message`:
     - 如果 `he.Message` 为 `string` 或 `error`，直接使用其文本。
     - 如果为 `map`/`slice`/`struct`，写入 `details`，`message` 使用 `http.StatusText(code)`。
2. 普通 `error`:
   - `code = 500`。
   - `message = "服务器错误"` (或 `http.StatusText(500)`)。
   - `details`:
     - 生产环境为空。
     - 开发环境写入 `err.Error()`。
3. Bind/解析错误:
   - `code = 400`。
   - `message = "请求格式错误"`。
   - `details` 写入字段/类型/格式原因。

## 兼容性策略
- 保留现有错误中文文案（若以 `echo.NewHTTPError` 提供）。
- 仅新增 `code` 与可选 `details`，前端可按需解析。

## 实施计划
1. 新增 `server/error_handler.go`（或 `server/response/errors.go`），实现 `NewHTTPErrorHandler(cfg)`。
2. 在 `server.New` 中设置 `e.HTTPErrorHandler = NewHTTPErrorHandler(cfg)`。
3. 补充少量测试覆盖（针对错误输出格式）。

## 测试建议
- 请求体格式错误 → 返回 `{code: 400, message: 请求格式错误}`。
- 业务 `echo.NewHTTPError(404, "资源不存在")` → 返回 `{code:404, message:"资源不存在"}`。
- 普通 error → `{code:500, message:"服务器错误"}`。
- 开发模式下 details 包含错误文本。
