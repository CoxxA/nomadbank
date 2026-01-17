# 项目全面清理设计方案

## 背景

项目经历多次架构变更（Supabase 云端 → 云端+Docker → 纯 Docker 开源），基于 shadcn-admin 模板创建，存在以下问题：
- 模板遗留的无用代码
- 旧版本（Clerk 认证）的残留文件
- 缺少统一的代码格式化配置

## 第一部分：删除无用文件

### 1.1 Clerk 认证遗留（2 个文件）
```
frontend/src/assets/clerk-logo.tsx
frontend/src/assets/clerk-full-logo.tsx
```

### 1.2 Brand Icons（14 个文件）
```
frontend/src/assets/brand-icons/
├── icon-discord.tsx
├── icon-docker.tsx
├── icon-facebook.tsx
├── icon-figma.tsx
├── icon-github.tsx
├── icon-gitlab.tsx
├── icon-gmail.tsx
├── icon-medium.tsx
├── icon-notion.tsx
├── icon-skype.tsx
├── icon-slack.tsx
├── icon-stripe.tsx
├── icon-telegram.tsx
├── icon-trello.tsx
├── icon-whatsapp.tsx
├── icon-zoom.tsx
└── index.ts
```

### 1.3 模板 Tasks 组件（14 个文件）
```
frontend/src/features/tasks/components/
├── data-table-bulk-actions.tsx
├── data-table-row-actions.tsx
├── tasks-columns.tsx
├── tasks-dialogs.tsx
├── tasks-import-dialog.tsx
├── tasks-multi-delete-dialog.tsx
├── tasks-mutate-drawer.tsx
├── tasks-primary-buttons.tsx
├── tasks-provider.tsx
└── tasks-table.tsx

frontend/src/features/tasks/data/
├── data.tsx
├── schema.ts
└── tasks.ts
```

### 1.4 模板 Dashboard 组件（4 个文件）
```
frontend/src/features/dashboard/components/
├── analytics.tsx
├── analytics-chart.tsx
├── overview.tsx
└── recent-sales.tsx
```

### 1.5 空目录
```
service/
```

**总计：约 35 个文件**

## 第二部分：移除依赖

```json
// frontend/package.json - devDependencies 中移除
"@faker-js/faker": "^10.1.0"
```

## 第三部分：添加配置文件

### 3.1 .editorconfig（项目根目录）
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

### 3.2 frontend/.prettierrc
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

### 3.3 .golangci.yml（项目根目录）
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

## 第四部分：更新 .gitignore

确保包含以下条目：
```gitignore
# 构建产物
*.exe
frontend/dist/

# 开发临时文件
tmp/

# 数据目录
data/

# IDE
.idea/
.vscode/
*.swp
```

## 第五部分：实施步骤

1. **删除无用文件**
   - 删除上述 35 个文件/目录

2. **移除依赖**
   - 从 package.json 移除 @faker-js/faker
   - 运行 `npm install` 更新 lock 文件

3. **添加配置文件**
   - 创建 .editorconfig
   - 创建 frontend/.prettierrc
   - 创建 .golangci.yml

4. **格式化代码**
   - 前端：`cd frontend && npm run format`
   - 后端：`gofmt -w . && goimports -w .`

5. **更新 .gitignore**
   - 添加缺失的条目

6. **验证**
   - 前端：`cd frontend && npm run build`
   - 后端：`go build ./cmd/nomadbank`
   - 可选：`golangci-lint run`

## 预期效果

- 删除约 35 个无用文件
- 移除 1 个无用依赖
- 统一代码格式化规范
- 项目结构更清晰
