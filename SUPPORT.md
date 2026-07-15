# 支持指南

NomadBank 是由个人维护的开源项目，支持采用尽力而为（best effort）的方式提供，不承诺响应时间或服务等级。

## 在哪里提问

- 可稳定复现的程序错误：使用 [Bug 报告](https://github.com/CoxxA/nomadbank/issues/new?template=bug.yml)
- 功能建议：使用 [功能建议](https://github.com/CoxxA/nomadbank/issues/new?template=feature.yml)
- 安全漏洞：通过 [GitHub Security Advisories](https://github.com/CoxxA/nomadbank/security/advisories/new) 私下报告

创建公开 Issue 前，请先搜索现有 Issue，并确认问题仍能在最新正式版中复现。

## 请提供的信息

- NomadBank 精确版本
- 部署方式（Compose、Docker Run、发布二进制或源码）
- 操作系统、CPU 架构，以及浏览器和版本
- 最短、可重复的复现步骤
- 预期行为和实际行为
- 必要且已经脱敏的日志或截图

请勿上传数据库文件、Cookie、会话 Token、密码、银行卡号、真实账户信息或其他敏感数据。

## 支持范围

维护者可以协助判断 NomadBank 本身的缺陷、文档问题和合理的功能建议。以下内容不在项目支持范围内：

- 通用服务器、Docker、域名、证书或反向代理的代运维
- v0.x、v1.x 数据迁移或非官方构建
- 银行业务、资金操作或合规建议
- 第三方镜像、修改版或未经支持的部署环境

部署和排障前请先阅读[部署指南](docs/deployment.md)、[备份与恢复](docs/backup-restore.md)和[安全策略](SECURITY.md)。
