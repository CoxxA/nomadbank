# 更新日志

本项目的重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Changed

- 后续变更将在此处记录，并在发布时由 GitHub 自动生成 Release Notes。

## [2.0.0] - 2026-07-12

### Added

- 单用户、单实例的个人自托管工作流。
- SQLite 本地存储、数据库会话与 HttpOnly Cookie 登录。
- 账户、保活策略、任务批次、任务完成状态和仪表盘。
- Linux、macOS、Windows 发布包，以及多架构 GHCR 容器镜像。
- 校验和、SPDX SBOM、构建来源证明和一键正式发布流程。

### Changed

- 将后端重写为 Go、Echo 与原生 SQLite 的单体应用。
- 将前端重写为精简的 React 应用，并嵌入 Go 二进制。
- 金额改为整数分存储，主键改为整数，任务按批次生成。
- 重写公开 API、容器构建、部署说明和维护文档。

### Removed

- 多用户、管理员、公开注册、角色权限及业务表中的 `user_id`。
- JWT、GORM、UUID 主键及外部 PostgreSQL、Redis 等运行时依赖。
- 尚未真正实现的通知、导入、延期、跳过和伪批量操作。
- v0.x 数据库兼容；v2 使用独立的 `nomadbank-v2.db`。

## [0.1.0] - 2026-01-27

### Added

- 首个实验版本，包含多用户认证、银行账户、策略、任务与通知配置。

[Unreleased]: https://github.com/CoxxA/nomadbank/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/CoxxA/nomadbank/compare/v0.1.0...v2.0.0
[0.1.0]: https://github.com/CoxxA/nomadbank/releases/tag/v0.1.0
