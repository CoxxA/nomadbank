# Codebase Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 删除模板遗留的无用代码，添加代码格式化配置，统一项目规范。

**Architecture:** 分阶段清理：先删除无用文件，再添加配置，最后格式化代码并验证构建。

**Tech Stack:** Go 1.24, React 19, TypeScript, Prettier, ESLint, golangci-lint

---

## Task 1: 删除 Clerk 认证遗留文件

**Files:**
- Delete: `frontend/src/assets/clerk-logo.tsx`
- Delete: `frontend/src/assets/clerk-full-logo.tsx`

**Step 1: 删除文件**

```bash
rm frontend/src/assets/clerk-logo.tsx
rm frontend/src/assets/clerk-full-logo.tsx
```

**Step 2: 验证删除成功**

Run: `ls frontend/src/assets/clerk*.tsx 2>&1`
Expected: "No such file or directory" 或类似的文件不存在提示

---

## Task 2: 删除 Brand Icons 目录

**Files:**
- Delete: `frontend/src/assets/brand-icons/` (整个目录)

**Step 1: 删除目录**

```bash
rm -rf frontend/src/assets/brand-icons
```

**Step 2: 验证删除成功**

Run: `ls frontend/src/assets/brand-icons 2>&1`
Expected: "No such file or directory"

---

## Task 3: 删除模板 Tasks 组件

**Files:**
- Delete: `frontend/src/features/tasks/components/` (整个目录)
- Delete: `frontend/src/features/tasks/data/` (整个目录)

**Step 1: 删除 components 目录**

```bash
rm -rf frontend/src/features/tasks/components
```

**Step 2: 删除 data 目录**

```bash
rm -rf frontend/src/features/tasks/data
```

**Step 3: 验证删除成功**

Run: `ls frontend/src/features/tasks/`
Expected: 只剩下 `index.tsx` 文件

---

## Task 4: 删除模板 Dashboard 组件

**Files:**
- Delete: `frontend/src/features/dashboard/components/` (整个目录)

**Step 1: 删除目录**

```bash
rm -rf frontend/src/features/dashboard/components
```

**Step 2: 验证删除成功**

Run: `ls frontend/src/features/dashboard/`
Expected: 只剩下 `index.tsx` 文件

---

## Task 5: 删除空的 service 目录

**Files:**
- Delete: `service/` (空目录)

**Step 1: 删除目录**

```bash
rm -rf service
```

**Step 2: 验证删除成功**

Run: `ls service 2>&1`
Expected: "No such file or directory"

---

## Task 6: 移除 @faker-js/faker 依赖

**Files:**
- Modify: `frontend/package.json`

**Step 1: 使用 npm 移除依赖**

```bash
cd frontend && npm uninstall @faker-js/faker
```

**Step 2: 验证移除成功**

Run: `grep faker frontend/package.json`
Expected: 无输出（依赖已移除）

---

## Task 7: 添加 .editorconfig

**Files:**
- Create: `.editorconfig`

**Step 1: 创建配置文件**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.go]
indent_style = tab

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
```

**Step 2: 验证文件创建**

Run: `cat .editorconfig | head -5`
Expected: 显示 `root = true` 和 `[*]` 等内容

---

## Task 8: 添加 frontend/.prettierrc

**Files:**
- Create: `frontend/.prettierrc`

**Step 1: 创建配置文件**

```json
{
  "$schema": "https://json.schemastore.org/prettierrc",
  "semi": false,
  "singleQuote": true,
  "jsxSingleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 80,
  "plugins": [
    "@trivago/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss"
  ],
  "importOrder": [
    "^react",
    "^@tanstack/(.*)$",
    "<THIRD_PARTY_MODULES>",
    "^@/components/ui/(.*)$",
    "^@/components/(.*)$",
    "^@/features/(.*)$",
    "^@/hooks/(.*)$",
    "^@/lib/(.*)$",
    "^@/stores/(.*)$",
    "^@/(.*)$",
    "^[./]"
  ],
  "importOrderSeparation": false,
  "importOrderSortSpecifiers": true
}
```

**Step 2: 验证文件创建**

Run: `cat frontend/.prettierrc | head -5`
Expected: 显示 JSON 配置内容

---

## Task 9: 添加 .golangci.yml

**Files:**
- Create: `.golangci.yml`

**Step 1: 创建配置文件**

```yaml
run:
  timeout: 5m

linters:
  enable:
    - gofmt
    - goimports
    - govet
    - errcheck
    - staticcheck
    - unused
    - gosimple
    - ineffassign

linters-settings:
  goimports:
    local-prefixes: github.com/CoxxA/nomadbank

issues:
  exclude-use-default: false
```

**Step 2: 验证文件创建**

Run: `cat .golangci.yml | head -5`
Expected: 显示 `run:` 和 `timeout: 5m` 等内容

---

## Task 10: 格式化前端代码

**Files:**
- Modify: `frontend/src/**/*.{ts,tsx}` (批量格式化)

**Step 1: 运行 Prettier 格式化**

```bash
cd frontend && npm run format
```

**Step 2: 检查格式化结果**

Run: `cd frontend && npm run format:check`
Expected: 无输出或显示 "All files match formatting"

---

## Task 11: 格式化后端代码

**Files:**
- Modify: `**/*.go` (批量格式化)

**Step 1: 运行 gofmt**

```bash
gofmt -w .
```

**Step 2: 运行 goimports（如已安装）**

```bash
goimports -w . 2>/dev/null || echo "goimports not installed, skipping"
```

**Step 3: 验证格式化**

Run: `gofmt -l .`
Expected: 无输出（所有文件已格式化）

---

## Task 12: 验证前端构建

**Files:**
- None (验证步骤)

**Step 1: 运行前端构建**

```bash
cd frontend && npm run build
```

**Step 2: 验证构建成功**

Expected: 构建完成，无错误，生成 `dist/` 目录

---

## Task 13: 验证后端构建

**Files:**
- None (验证步骤)

**Step 1: 运行后端构建**

```bash
go build -o nomadbank.exe ./cmd/nomadbank
```

**Step 2: 验证构建成功**

Expected: 生成 `nomadbank.exe`，无编译错误

**Step 3: 清理构建产物**

```bash
rm nomadbank.exe
```

---

## Task 14: 提交清理结果

**Files:**
- All modified files

**Step 1: 查看变更**

```bash
git status
```

**Step 2: 添加所有变更**

```bash
git add -A
```

**Step 3: 提交**

```bash
git commit -m "chore: 清理模板遗留代码，添加格式化配置

- 删除 Clerk 认证遗留文件
- 删除未使用的 brand-icons
- 删除模板 tasks 和 dashboard 组件
- 移除 @faker-js/faker 依赖
- 添加 .editorconfig, .prettierrc, .golangci.yml
- 格式化前后端代码

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## 验证清单

完成后检查：

- [ ] 前端构建成功 (`npm run build`)
- [ ] 后端构建成功 (`go build ./cmd/nomadbank`)
- [ ] ESLint 无错误 (`npm run lint`)
- [ ] Prettier 检查通过 (`npm run format:check`)
- [ ] 所有变更已提交
