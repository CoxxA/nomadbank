# 开发指南

## 环境要求

- Go 1.26
- Node.js 24 与 npm 10+
- GNU Make 与 POSIX shell
- 可选：Docker 24+

## 启动开发环境

安装前端依赖：

```bash
cd frontend
npm install
```

分别启动后端与前端：

```bash
make run
```

```bash
cd frontend
npm run dev
```

后端使用 `./data/nomadbank-v2.db`。如需全新环境，停止程序后删除整个 `data` 目录。

## 验证命令

```bash
# Go 测试
make test-go

# 可选：竞态检测（需要平台支持 CGO 和 C 编译器）
make test-race

# 前端测试
make test-web

# 格式、静态检查、测试和生产构建
make verify
```

提交前应保证 `git status` 中没有生成器造成的意外差异。

## 代码边界

- HTTP 输入和响应只放在 `internal/httpapi`。
- SQL 只放在 `internal/sqlite`，所有调用都接收 `context.Context`。
- 任务规则只放在 `internal/task`，不得依赖 Echo 或 SQL。
- 前端 API、查询和页面与 feature 共置。
- `ui/` 只收纳至少被两个 feature 使用的组件。
- 不加入没有真实后端能力的按钮、类型或占位返回值。

## 数据库变更

v2 的初始 schema 位于 `internal/sqlite/schema.sql`。公开发布后的任何结构变化都必须：

1. 增加 schema 版本。
2. 提供可重复执行的向前迁移。
3. 在事务中执行。
4. 添加从上一发布版本升级的 fixture 测试。
5. 更新 `docs/upgrading.md` 和 CHANGELOG。

不得在应用启动时临时删除列或表，也不得用 GORM AutoMigrate 代替版本化迁移。

## API 契约

`docs/api/openapi.yaml` 是公开 API 的事实来源。修改接口时先运行 `cd frontend && npm run api:generate` 更新类型，再运行 `make api-check` 检查漂移，并同步更新集成测试。错误响应必须使用稳定的 `code`，不得让前端解析错误文本。
