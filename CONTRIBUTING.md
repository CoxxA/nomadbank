# 贡献指南

感谢你帮助改进 NomadBank。

## 开始之前

- Bug 和功能建议优先通过 GitHub Issue 讨论。
- 安全问题不要创建公开 Issue，请查看 `SECURITY.md`。
- 一个 Pull Request 应聚焦一个清晰问题。

## 本地开发

环境、启动命令和目录边界参见 `docs/development.md`。

```bash
git clone https://github.com/CoxxA/nomadbank.git
cd nomadbank
cd frontend && npm install && cd ..
make verify
```

## Pull Request 要求

- 行为变更包含对应测试。
- API 变更同步更新 OpenAPI 和前端类型。
- 配置、部署或数据结构变更同步更新长期文档和 CHANGELOG。
- 不加入没有真实实现的菜单、按钮、API 或返回值。
- 不提交数据库、Token、密码、通知密钥或真实账户信息。
- 保持 `make verify` 通过。

所有改动都应从短期分支提交 PR，经 CI 检查后再使用 squash merge 合并。不要直接向 `main` 推送，也不要在功能 PR 中自行创建版本标签。

## 提交信息

推荐使用简洁的 Conventional Commits 风格，例如：

```text
feat(tasks): 支持按任务批次筛选
fix(auth): 正确撤销过期会话
docs: 更新容器备份步骤
```

公开发布后的数据库和 API 破坏性变更只能进入新的主版本，并在升级文档中说明。

维护者发布版本前还应阅读[维护与发布指南](docs/releasing.md)。
