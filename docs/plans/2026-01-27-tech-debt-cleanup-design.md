# 技术债务清理设计文档

**日期**: 2026-01-27
**状态**: 已完成（第七阶段 - 最终）

## 概述

本文档记录 NomadBank 项目的技术债务分析结果和改进计划。经过深入分析，发现后端 17 个主要问题，前端 10 个主要问题。

---

## 一、后端技术债务

### 高优先级 (P0)

| # | 问题 | 位置 | 风险 | 状态 |
|---|------|------|------|------|
| 1 | 忽略错误 - `existing, _ := ...` | `auth.go:74`, `user.go:118` | 数据不一致 | ✅ 已修复 |
| 2 | 存储层零测试覆盖 | `store/` 全部 | 回归问题 | ✅ 已修复 |

### 中优先级 (P1)

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| 3 | 硬编码配置值 | 密码长度、策略默认值、系统策略 | ✅ 已修复 |
| 4 | 重复验证逻辑 | 17+ 处 `TrimSpace`，3 处密码验证 | ✅ 已修复 |
| 5 | 重复错误响应 | 40 处 `NewHTTPError(500)` | ✅ 已修复 |
| 6 | NotificationAPI 低效查询 | 线性查找而非直接查询 | ✅ 已修复 |
| 7 | 缺失时间格式验证 | `strategy.go` TimeStart/TimeEnd | ✅ 已修复 |
| 8 | HTTP 客户端重复创建 | `notification.go` | ✅ 已修复 |

### 低优先级 (P2/P3)

| # | 问题 | 状态 |
|---|------|------|
| 9 | CORS 配置安全 | ✅ 已修复 |
| 10 | JWT 密钥安全 | ✅ 已修复 |
| 11 | 响应数据一致性 (null vs []) | ✅ 已修复 |
| 12 | 日期时间处理缺陷 | ✅ 已修复 |
| 13 | 输入大小限制缺失 | ✅ 已修复 |

---

## 二、前端技术债务

### 高优先级

| # | 问题 | 位置 | 影响 | 状态 |
|---|------|------|------|------|
| 1 | 测试覆盖接近 0% | 仅 2 个测试文件 | 无法保证重构安全 | ✅ 已修复（39 个测试）|
| 2 | 错误处理不一致 | 14+ 处空 catch | 难以调试 | ✅ 已修复 |
| 3 | API 方法重复 | `notification/api.ts` 6 个重复 | 维护困难 | ✅ 已修复 |
| 4 | 死代码 `handle-server-error.ts` | 使用已弃用的 axios | 混乱 | ✅ 已修复 |

### 中优先级

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| 5 | 类型安全问题 | `Record<string, unknown>` 过度使用 | ✅ 已改进（通知配置类型）|
| 6 | N+1 查询问题 | `api.ts` 全量加载后前端过滤 | 低优先级（后端分页已实现）|
| 7 | CRUD 逻辑重复 | 策略、通知、银行页面 | 低优先级（可接受的重复）|
| 8 | 查询键管理不一致 | 混用字符串和 queryKeys 对象 | ✅ 已修复 |

### 低优先级

| # | 问题 | 状态 |
|---|------|------|
| 9 | 未使用的 axios 依赖 | ✅ 已修复 |
| 10 | 控制台调试输出 | ✅ 已检查（已有 DEV 条件判断）|
| 11 | 不必要的重渲染 | ✅ 已分析（无明显问题）|

---

## 三、已完成的改进

### 2026-01-27 第一阶段

1. **修复后端忽略错误** ✅
   - `auth.go:74` 和 `user.go:118` 现在正确区分"用户不存在"和数据库错误
   - 添加了 `errors.Is(err, gorm.ErrRecordNotFound)` 检查

2. **清理前端死代码** ✅
   - 重写 `handle-server-error.ts`，移除 axios 依赖
   - 创建新的 `handleApiError` 函数，支持 Fetch API
   - 删除 `notification/api.ts` 中的 6 个重复方法
   - 删除 `bank/api.ts` 中未使用的 `list` 方法

3. **统一错误处理** ✅
   - 前端所有页面（accounts, tasks, notifications, dashboard）使用 `handleApiError`
   - 开发环境打印错误详情，便于调试

4. **修复 NotificationAPI 查询** ✅
   - 添加 `GetNotificationByID` 存储方法
   - Update、Delete、Test 方法现在直接查询而非列表遍历
   - 添加了所有权验证

5. **统一查询键管理** ✅
   - 添加基础查询键（`banksBase`, `tasksBase` 等）
   - `useRefreshQueries` 全部使用 `queryKeys` 对象

### 2026-01-27 第二阶段

6. **后端存储层测试** ✅
   - 创建 `store/store_test.go`（13 个测试用例）
   - 覆盖 User、Strategy、Notification、DashboardStats 模块
   - 使用内存 SQLite 数据库进行隔离测试

7. **提取重复验证逻辑** ✅
   - 创建 `api/v1/validation.go` 集中验证函数
   - `validateUsername()` - 用户名验证并规范化
   - `validatePassword()` - 密码长度验证
   - `normalizeAmountRange()` - 金额范围规范化
   - `normalizeIntervalRange()` - 间隔范围规范化
   - `validateTimeFormat()` - HH:MM 时间格式验证
   - `validateTimeRange()` - 时间范围逻辑验证

8. **策略时间格式验证** ✅
   - `strategy.go` Create/Update 函数添加时间格式验证
   - 验证 TimeStart/TimeEnd 格式（HH:MM）
   - 验证开始时间早于结束时间

9. **移除前端 axios 依赖** ✅
   - 更新 `main.tsx` 使用 `ApiError` 替代 `AxiosError`
   - 从 `package.json` 移除 axios（减少 23 个包）
   - 错误处理保持一致性

### 2026-01-27 第三阶段

10. **HTTP 客户端复用** ✅
    - 创建共享的 `notificationHTTPClient` 包级变量
    - 配置连接池（MaxIdleConns=10, MaxIdleConnsPerHost=5）
    - `sendBarkNotification` 和 `sendTelegramNotification` 使用共享客户端

11. **输入大小限制** ✅
    - 添加 Echo BodyLimit 中间件（限制 1MB）
    - 添加字段长度常量：MaxUsernameLength、MaxPasswordLength、MaxNameLength 等
    - 更新验证函数：`validateUsername` 检查最大长度
    - 新增 `validateName`、`validateNickname` 验证函数
    - 更新 API 处理器使用新验证函数

12. **统一空数组响应** ✅
    - 所有存储层列表函数使用 `make([]T, 0)` 替代 `var slice []T`
    - 确保 JSON 响应返回 `[]` 而非 `null`
    - 影响文件：`store.go`、`bank_queries.go`、`task_queries.go`

### 2026-01-27 第四阶段

13. **提取硬编码配置值** ✅
    - 在 `validation.go` 添加策略默认值常量
      - `DefaultIntervalMin/Max`、`DefaultTimeStart/End`
      - `DefaultStrategyAmountMin/Max`、`DefaultDailyLimit`
      - `DefaultBankAmountMin/Max`
    - 在 `store/db.go` 添加系统策略常量
      - 默认保活策略和长期保活策略配置
    - 更新 `strategy.go` 和 `bank_handlers.go` 使用常量

14. **统一日期时间格式** ✅
    - 在 `response.go` 定义 `dateLayout` 和 `timeLayout` 常量
    - 更新 `bank_handlers.go` 使用共享常量
    - 确保日期格式一致性

15. **前端调试输出检查** ✅
    - 确认所有 `console.log/error` 已使用 `import.meta.env.DEV` 条件判断
    - 生产环境不输出调试信息

### 2026-01-27 第五阶段

16. **改进 CORS 安全配置** ✅
    - 在 `config.go` 添加 `CORSOrigins` 配置字段
    - 创建 `CORSMiddlewareWithOrigins()` 函数支持可配置来源
    - 生产环境使用配置的来源列表，开发环境允许所有
    - 支持通过 `CORS_ORIGINS` 环境变量配置（逗号分隔）

17. **增强 JWT 安全配置** ✅
    - 添加安全常量 `DefaultJWTSecret`、`MinJWTSecretLength`
    - 创建 `validateSecurity()` 方法在启动时检查安全配置
    - 生产环境使用默认密钥时输出警告
    - 密钥长度不足时输出警告

18. **优化重复错误响应模式** ✅
    - 创建 `api/v1/errors.go` 文件
    - 添加错误辅助函数：
      - `errBadRequest()` - 400 错误
      - `errUnauthorized()` - 401 错误
      - `errForbidden()` - 403 错误
      - `errNotFound()` - 404 错误
      - `errConflict()` - 409 错误
      - `errInternal()` - 500 错误
    - 添加常用错误消息常量：
      - `msgRequestFormatError` - "请求格式错误"
      - `msgRequireAdminRole` - "需要管理员权限"
      - `msgNoAccess` - "无权访问"
      - `msgPasswordProcessFail` - "密码处理失败"
    - 更新所有 API 处理器使用新的错误辅助函数

---

### 2026-01-27 第七阶段（最终）

19. **前端关键路径测试** ✅
    - 创建 `lib/__tests__/cookies.test.ts`（6 个测试）
      - Cookie 读写删除操作测试
    - 创建 `lib/__tests__/utils.test.ts`（15 个测试）
      - `cn()` 类名合并测试
      - `getPageNumbers()` 分页逻辑测试
      - `getDateKey()`/`parseDateKey()` 日期处理测试
    - 创建 `stores/__tests__/auth-store.test.ts`（15 个测试）
      - 认证状态管理测试
      - 登录/登出流程测试
      - Token 管理测试
    - 测试总数从 2 增加到 39 个

20. **改进前端类型安全** ✅
    - 在 `domains/notification/types.ts` 添加具体配置接口：
      - `BarkConfig` - Bark 通知配置
      - `TelegramConfig` - Telegram 通知配置
      - `WebhookConfig` - Webhook 通知配置
    - 添加 `NotificationConfig` 联合类型
    - 添加 `ConfigForType<T>` 条件类型
    - TypeScript 编译检查通过

21. **前端重渲染分析** ✅
    - 分析 CalendarView 组件：已使用 `useMemo` 优化
    - 分析数据获取：TanStack Query 处理缓存
    - 分析状态管理：Zustand 高效管理
    - 结论：代码已合理优化，无明显性能问题
    - 进一步优化需要实际性能分析数据

---

## 四、待处理项目

### 后续建议（非技术债务）

1. **端到端测试** - 如需更高测试覆盖
2. **性能监控** - 如用户反馈性能问题

---

## 五、验收标准

- [x] 后端无忽略错误
- [x] 前端 API 无重复方法
- [x] 错误处理统一
- [x] 存储层有基础测试
- [x] 验证逻辑集中管理
- [x] 前端无 axios 依赖
- [x] HTTP 客户端复用
- [x] 输入大小限制
- [x] 响应数据一致性（空数组）
- [x] 硬编码配置值提取
- [x] 日期时间格式统一
- [x] CORS 安全配置
- [x] JWT 安全配置
- [x] 错误响应模式统一
- [x] 前端关键路径测试（39 个测试）
- [x] 前端类型安全改进
- [x] 前端重渲染分析
- [x] 代码通过编译检查
- [x] 所有测试通过（后端 + 前端）
