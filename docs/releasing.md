# 维护与发布指南

本文面向 NomadBank 维护者。日常使用 NomadBank 不需要执行这里的步骤。

发布流程分成两段：先通过 Pull Request（PR）把准备工作安全地合并到 `main`，再从 GitHub Actions 点一次按钮发布。不要在本地手工创建版本标签，也不要直接向 `main` 推送发布改动。

这里的“一键发布”是指自动测试、构建、签发证明、上传附件和镜像；它不会自动合并未经检查的代码，也不会远程升级用户正在运行的实例。升级前保留人工备份和确认，是为了保护 SQLite 数据，不是自动化缺失。

## 一次性设置 GitHub

以下设置只需要仓库所有者配置一次。

### 1. 合并方式

打开仓库的 **Settings → General → Pull Requests**：

- 启用 **Allow squash merging**。
- 建议关闭 merge commit 和 rebase merge，只保留一种合并方式。
- 启用 **Automatically delete head branches**。

这样每个 PR 在 `main` 上只形成一个清晰提交，合并后的临时分支也会自动删除。

### 2. 保护 `main`

先让 `CI` 工作流在 `main` 上成功运行一次，然后打开 **Settings → Rules → Rulesets → New branch ruleset**：

1. 名称填写 `Protect main`，状态选择 **Active**。
2. Target branches 选择默认分支 `main`。
3. 启用 **Require a pull request before merging**。
4. 单人维护时审批数量可以设为 `0`；仍然要求所有改动经过 PR，以保留检查记录。
5. 启用 **Require status checks to pass**，把 `CI` 中的全部检查设为必需。
6. 启用 **Require conversation resolution before merging**。
7. 启用 **Block force pushes** 和 **Restrict deletions**。

不要给日常维护账号设置绕过规则。GitHub 只有在检查至少运行过一次后，才会在必需检查列表中显示它。

### 3. Actions 与安全功能

打开 **Settings → Actions → General**：

- 允许仓库使用 GitHub Actions。
- `Workflow permissions` 保持默认只读即可；工作流会针对发布步骤显式申请最小写权限。

打开 **Settings → Advanced Security**，启用：

- Dependency graph
- Dependabot alerts
- Dependabot security updates

回到 **Settings → General**，向下找到 **Releases**，启用 **Release immutability**。它只对启用后的新版本生效；正式发布后，关联标签和附件将不能被替换或删除，标题与说明仍可修正。

版本更新规则已经保存在 `.github/dependabot.yml`，Dependabot 会定期创建 PR。仍需等待 CI 通过后再合并，不要启用不经检查的自动合并。

### 4. 标签

打开 **Issues → Labels**，确认至少存在以下标签；缺少的可以直接新建：

- `bug`、`enhancement`、`documentation`
- `dependencies`、`breaking-change`、`skip-changelog`
- `go`、`frontend`、`e2e`、`ci`、`docker`

这些标签用于 Issue 分类、Dependabot PR 和自动 Release notes。标签颜色不影响功能。

### 5. 第一次发布后的容器设置

第一次发布会创建 `ghcr.io/coxxa/nomadbank`。发布完成后：

1. 在 GitHub 个人主页进入 **Packages → nomadbank → Package settings**。
2. 确认包已经关联到 `CoxxA/nomadbank`。
3. 在 **Danger Zone → Change visibility** 中改为 **Public**。

公开容器包可以匿名拉取。GitHub 目前不允许把已经公开的包重新改回私有，因此确认镜像中没有敏感信息后再操作。

## 日常开发如何收尾

每次改动都采用同一套流程：

1. 从最新 `main` 创建一个短期分支，例如 `fix/login-message`。
2. 完成改动、测试和文档。
3. 推送分支并创建 PR。
4. 等待全部 CI 检查变绿；失败就先修复，不要强行合并。
5. 使用 **Squash and merge** 合并 PR。
6. 让 GitHub 删除已合并分支。

PR 标题应让普通用户也能看懂，因为 GitHub Release 会根据 PR 自动生成发布说明。建议格式：

```text
feat: 增加任务筛选
fix: 修复登录过期后的跳转
docs: 补充容器备份说明
```

PR 还应添加最贴切的标签，例如 `enhancement`、`bug`、`dependencies` 或 `breaking-change`；没有匹配标签的 PR 会进入 Release notes 的“其他变更”。

## 如何选择版本号

NomadBank 使用 `主版本.次版本.修订号`，例如 `2.3.1`：

| 改动 | 应增加 | 示例 |
| --- | --- | --- |
| 修复错误或安全问题，保持兼容 | 修订号 PATCH | `2.3.1` → `2.3.2` |
| 新增兼容功能 | 次版本 MINOR | `2.3.2` → `2.4.0` |
| 删除功能，或产生 API、配置、数据库兼容性破坏 | 主版本 MAJOR | `2.4.0` → `3.0.0` |

纯文档、测试或内部整理通常不需要单独发布，可以随下一版本一起发布。版本号发布后永久保留：不要复用、删除或让同一个版本指向另一份代码。

首次公开 v2 使用 `2.0.0`。本工作流只发布正式版，不接受 `alpha`、`beta` 或 `rc` 预发布版本。

## 发布前准备 PR

发布前先创建一个只做发布准备的 PR：

1. 确认本次需要发布的功能和修复都已经合并到 `main`。
2. 确认 `main` 最新一次 `CI` 全部通过。
3. 检查 `CHANGELOG.md` 的 `[Unreleased]` 内容，删除过时描述。
4. 把本次内容移到新标题下，例如 `## [2.1.0] - 2026-07-12`，并保留一个空的 `[Unreleased]` 供以后使用。
5. 更新文件末尾的比较链接，使 `[Unreleased]` 从新版本标签开始比较，并为新版本添加链接。
6. 如果包含数据库、配置或部署变化，同步更新 `docs/upgrading.md` 和 `docs/deployment.md`。
7. 合并这个 PR，再等 `main` 的 CI 通过。

示例：

```markdown
## [Unreleased]

## [2.1.0] - 2026-07-12

### Added

- 增加某项功能。

[Unreleased]: https://github.com/CoxxA/nomadbank/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/CoxxA/nomadbank/compare/v2.0.0...v2.1.0
```

`CHANGELOG.md` 是经过维护者整理的长期记录；GitHub Release notes 是由已合并 PR 自动生成的本次发布摘要。两者用途不同，因此都保留。

## 一键发布正式版

发布准备 PR 合并后，在 GitHub 网页执行：

1. 打开仓库的 **Actions**。
2. 在左侧选择 **Release**。
3. 点击 **Run workflow**。
4. Branch 必须选择 `main`。
5. `version` 只填写版本号，例如 `2.1.0`，不要填写前缀 `v`。
6. 点击绿色的 **Run workflow**，等待全部任务完成。

工作流会自动：

- 确认发布目标是 `main` 的最新提交，并拒绝重复或错误格式的版本。
- 完整执行后端、前端和构建验证。
- 构建 Linux、macOS 和 Windows 的六个平台压缩包以及 `SHA256SUMS`。
- 生成同时覆盖 Go 与前端运行依赖的 SPDX JSON SBOM 和 GitHub 构建证明。
- 在 Linux、Windows 和 macOS 上解压正式安装包，核对版本并实际启动健康检查。
- 先发布并验证只有 `2.1.0` 精确标签的 `linux/amd64`、`linux/arm64` 容器镜像。
- 创建 `v2.1.0` 形式的 Git 标签和正式 GitHub Release，并根据 PR 生成分类发布说明。
- 正式 Release 成功后，才把同一镜像摘要推广为 `2.1`、`2` 和 `latest` 标签。

发布不需要自行创建 GitHub Token 或配置第三方密钥，仓库自带的 `GITHUB_TOKEN` 足够。

## 发布后检查

不要只看工作流的绿色状态，还要完成以下检查：

- GitHub **Releases** 中存在 `vX.Y.Z`，并且不是 Draft 或 Pre-release。
- Release 中包含六个平台压缩包、`SHA256SUMS` 和 SPDX SBOM。
- Release 页面显示构建证明；工作流的镜像构建也有 provenance。
- `ghcr.io/coxxa/nomadbank:X.Y.Z` 可以拉取，并且容器包为 Public。
- `X.Y`、`X` 和 `latest` 标签与精确版本 `X.Y.Z` 指向同一个多架构镜像摘要。
- 在一个临时数据目录中启动正式二进制或精确版本镜像，访问 `/health/ready`，再完成初始化、登录和查看任务的冒烟检查。
- README、部署文档和 CHANGELOG 中没有指向不存在版本的示例。

Windows 可以这样核对下载文件：

```powershell
Get-FileHash .\nomadbank_2.1.0_windows_amd64.zip -Algorithm SHA256
Get-Content .\SHA256SUMS
```

计算结果必须与 `SHA256SUMS` 中对应文件完全一致。

## 发布失败怎么办

先打开失败的 Action，展开红色步骤查看日志。

- 网络、GitHub 服务等偶发问题：使用 **Re-run failed jobs**，不要重新点一个新版本。
- 测试、构建或文档检查失败：通过新的 PR 修复，等 `main` CI 通过，再用原版本号重新运行 Release。
- 提示目标不是最新 `main`：回到 Release 页面，Branch 选择 `main` 后重新运行。
- 提示版本或标签已存在：先检查 Releases。已经正式发布就不能复用该版本；修复问题后增加 PATCH 版本。
- GitHub Release 创建前失败：滚动镜像标签不会变化；如果精确版本镜像已经存在，它仍不算正式发布。
- GitHub Release 已成功但 **Promote rolling image tags** 失败：只使用 **Re-run failed jobs** 重跑推广任务，不要删除 Release、重建程序或手工覆盖标签。

自动化在全部发布条件满足前不会创建正式 Release。不要为了“补齐”失败流程而手工建标签、上传部分文件或覆盖镜像标签，这会造成二进制、源码与容器不一致。

## 已发布版本发现严重问题

发布内容应视为不可变：不要删除标签、替换附件或让同一个精确版本指向新代码。

1. 在原 Release 顶部注明已知问题和临时规避方法。
2. 如果涉及安全漏洞，使用 GitHub Security Advisory 私下处理，不要先公开利用细节。
3. 创建修复 PR。
4. 发布下一个 PATCH 版本，例如从 `2.1.0` 发布 `2.1.1`。
5. 在新 Release notes 中明确建议所有用户升级。

## 用户升级与回滚

升级前必须先按[备份与恢复](backup-restore.md)备份整个数据目录，并阅读[升级说明](upgrading.md)。生产部署始终固定精确版本，不要长期依赖 `latest`。

Docker Compose 升级：

```bash
# 在 .env 中设置 NOMADBANK_VERSION=2.1.1
docker compose pull
docker compose up -d
docker compose ps
curl --fail http://localhost:8080/health/ready
```

如果新版本启动后有问题：

1. 立即停止服务，避免继续写入。
2. 查看对应 Release notes 是否说明数据库变更。
3. 将 `NOMADBANK_VERSION` 改回上一个精确版本。
4. 如果新版本已经升级数据库，必须同时恢复升级前的数据备份；不能只替换程序。
5. 启动旧版本并完成登录、账户和任务检查。

直接运行二进制时采用相同原则：保留上一版本程序，并把它与升级前备份配套恢复。

## 官方参考

- [手动运行 GitHub Actions 工作流](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [为仓库创建 Ruleset](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
- [管理仓库 Actions 权限](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
- [自动生成 Release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)
- [配置 GitHub Packages 可见性](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)
