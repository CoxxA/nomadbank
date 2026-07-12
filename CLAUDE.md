# 仓库开发说明

本项目的开发约定不绑定特定 AI 工具。

开始修改前请阅读：

- `CONTRIBUTING.md`：贡献流程和验证要求
- `docs/architecture.md`：模块边界和长期设计
- `docs/development.md`：开发环境、测试和数据库变更规则
- `docs/api/openapi.yaml`：公开 API 契约
- `docs/decisions/`：已接受的架构决策

核心原则：

1. NomadBank 是单实例、单所有者的个人自托管工具。
2. 只实现真实可用的功能，不加入占位按钮或伪 API。
3. HTTP、SQL 和任务规划分别位于 `internal/httpapi`、`internal/sqlite` 和 `internal/task`。
4. API 变更必须同步 OpenAPI、前端类型和集成测试。
5. 提交前运行 `make verify`。
