# 更新日志

所有对本项目的重要更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- 健康检查端点 (`/health`, `/health/ready`, `/health/live`)
- 安全扫描 CI（govulncheck、trivy、gitleaks）
- Dependabot 自动依赖更新

## [0.1.0] - 2026-01-27

### Added
- **认证系统**
  - 用户注册（首个用户自动成为管理员）
  - JWT 认证（HS256 算法）
  - 密码修改与个人资料更新

- **用户管理**
  - 管理员可创建、编辑、删除用户
  - 密码重置功能
  - 基于角色的访问控制（admin/user）

- **银行账户管理**
  - 银行账户 CRUD 操作
  - 银行分组功能
  - 金额范围配置
  - 批量操作支持

- **保活策略**
  - 自定义策略创建与编辑
  - 间隔天数范围配置
  - 执行时间段配置
  - 周末跳过选项
  - 单日任务上限
  - 系统预设策略（默认保活、长期保活）

- **任务生成**
  - 根据策略自动生成非闭环转账任务
  - 周期管理与锚点日期
  - 分组任务生成
  - 智能随机选择转出/转入银行

- **任务管理**
  - 任务列表与过滤
  - 任务完成标记
  - 日历视图
  - 批量删除

- **通知系统**
  - 支持 Bark、Telegram、Webhook 三种渠道
  - 通知测试功能
  - 启用/禁用管理

- **仪表盘**
  - 统计数据概览
  - 日历任务分布
  - 最近活动记录

- **UI/UX**
  - 响应式设计（shadcn/ui + Tailwind CSS）
  - 深色/浅色主题切换
  - 字体选择
  - 错误页面（401、403、404、500、503）

- **部署**
  - 单二进制架构（Go + React）
  - Docker 支持
  - SQLite 数据库（零配置）

[Unreleased]: https://github.com/CoxxA/nomadbank/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/CoxxA/nomadbank/releases/tag/v0.1.0
