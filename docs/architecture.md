# 架构说明

NomadBank 是一个模块化单体。浏览器、HTTP API、任务规划器和 SQLite 被打包为一个可执行文件，部署时不依赖外部服务。

## 设计目标

- 每个实例只服务一个所有者
- 默认使用同源部署和本地 SQLite
- 真实功能优先，不保留占位 API 或伪操作
- 业务算法可以脱离 HTTP 和数据库单独测试
- 仅在需要替换的边界引入接口

## 后端模块

```text
cmd/nomadbank/       依赖装配、信号处理和优雅退出
internal/auth/       初始化、密码和数据库会话
internal/config/     环境变量与命令行配置
internal/domain/     API 与业务模型
internal/httpapi/    Echo 路由、DTO、校验和错误映射
internal/sqlite/     schema、事务和所有 SQL
internal/task/       纯任务规划器与生成用例
web/                 嵌入并提供前端静态资源
```

HTTP Handler 只处理协议、输入校验和状态码。任务生成的事务协调位于 `internal/task`，SQL 只位于 `internal/sqlite`。CRUD 直接依赖具体 Store，小项目不为每张表建立形式化 Repository 接口。

## 数据模型

- `owner`：固定只有一行，保存用户名、密码哈希和时区
- `sessions`：保存随机会话 Token 的 SHA-256 哈希
- `accounts`：银行账户名称、分组和启用状态
- `strategies`：任务间隔、时段、金额和每日上限
- `task_batches`：一次生成操作的不可变摘要
- `tasks`：批次中的具体转账计划和完成状态

金额统一以整数分保存。时间按所有者时区规划，以 UTC Unix 时间戳持久化，以 RFC 3339 返回给客户端。

## 认证模型

首次初始化在事务中创建唯一 owner 和默认策略。登录生成 32 字节随机 Token，数据库只保存 Token 哈希，原 Token 通过 `HttpOnly`、`SameSite=Lax` Cookie 返回。

修改密码会删除全部会话并签发新会话。应用不使用 JWT、角色或浏览器可读访问令牌。

## 任务规划

每个周期会随机排列活跃账户并构成一个环。例如三个账户生成：

```text
A → B
B → C
C → A
```

因此每个账户每周期恰好转出一次、转入一次，不产生自转账。规划器同时应用：

- 策略间隔范围
- 每日任务上限
- 周末跳过规则
- 执行时间和金额范围
- 同一账户单日方向一致
- 反向转账至少间隔三天

规划器不访问数据库或全局时钟，随机源和当前时间都可以在测试中替换。

## 前端结构

```text
frontend/src/
  app/          路由、Provider 和应用外壳
  api/          Fetch 客户端和公开契约类型
  features/     session、dashboard、accounts、strategies、tasks
  lib/          日期和金额等领域格式化
  ui/           至少被多个页面使用的轻量组件
```

每个功能自行维护 API 函数和 Query Key。不存在全局业务 API 聚合层、全局 Zustand Store 或通用万能表格。

## 架构决策

长期有效的决策记录在 `docs/decisions/`。实施过程和临时计划应放在 GitHub Issue/PR，不作为长期架构文档提交。
