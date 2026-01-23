# Domain Refactor (By-Feature) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将前端目录按领域重排、后端按领域文件分区，并清理未使用代码，保持行为不变。

**Architecture:** 前端保持路由结构稳定，仅调整导入与文件归属；后端不拆包，只做文件分区与命名统一。每个领域迁移完成后做编译验证，避免引入回归。

**Tech Stack:** Go (Echo, GORM), React (TanStack Query), TypeScript, Vite

---

### Task 1: 建立前端领域目录骨架

**Files:**
- Create: `frontend/src/domains/.gitkeep` (or any placeholder file) **(if needed)**
- Create: `frontend/src/domains/shared/.gitkeep`
- Create: `frontend/src/domains/bank/.gitkeep`
- Create: `frontend/src/domains/task/.gitkeep`
- Create: `frontend/src/domains/strategy/.gitkeep`
- Create: `frontend/src/domains/notification/.gitkeep`
- Create: `frontend/src/domains/auth/.gitkeep`
- Create: `frontend/src/domains/settings/.gitkeep`
- Create: `frontend/src/domains/dashboard/.gitkeep`

**Step 1: Create directories**

```bash
mkdir -p frontend/src/domains/{shared,bank,task,strategy,notification,auth,settings,dashboard}
```

**Step 2: Commit**

```bash
git add frontend/src/domains
git commit -m "chore: add domain directories"
```

---

### Task 2: 清理明显未使用的前端组件（A）

**Files:**
- Delete (if unused): `frontend/src/components/coming-soon.tsx`
- Delete (if unused): `frontend/src/components/learn-more.tsx`
- Delete (if unused): `frontend/src/components/long-text.tsx`
- Delete (if unused): `frontend/src/components/data-table/*` (确认无引用后)

**Step 1: 验证未引用**

Run: `rg -n "coming-soon|learn-more|long-text|data-table" frontend/src`  
Expected: No production imports

**Step 2: 删除文件**

```bash
rm -rf frontend/src/components/coming-soon.tsx \
  frontend/src/components/learn-more.tsx \
  frontend/src/components/long-text.tsx \
  frontend/src/components/data-table
```

**Step 3: Run build to verify**

Run: `cd frontend && npm run build`  
Expected: PASS

**Step 4: Commit**

```bash
git add frontend/src/components
git commit -m "chore: remove unused frontend components"
```

---

### Task 3: 领域化迁移 - Bank

**Files:**
- Move: `frontend/src/features/accounts/index.tsx` → `frontend/src/domains/bank/views/accounts.tsx`
- Move: `frontend/src/routes/_authenticated/accounts/index.tsx` update import to new path
- Move: `frontend/src/hooks/use-queries.ts` (bank相关 hooks) → `frontend/src/domains/bank/hooks.ts`
- Move: `frontend/src/lib/api.ts` (bank相关 API) → `frontend/src/domains/bank/api.ts`
- Move: `frontend/src/lib/types.ts` (bank相关 types) → `frontend/src/domains/bank/types.ts`

**Step 1: Move bank view**

```bash
mkdir -p frontend/src/domains/bank/views
git mv frontend/src/features/accounts/index.tsx frontend/src/domains/bank/views/accounts.tsx
```

**Step 2: Extract bank types**

Edit `frontend/src/lib/types.ts`: move Bank-related types to `frontend/src/domains/bank/types.ts` and re-export from `lib/types.ts` if needed.

**Step 3: Extract bank api**

Edit `frontend/src/lib/api.ts`: move `banksApi` to `frontend/src/domains/bank/api.ts`, keep `request`/`api` in `lib/api.ts`.

**Step 4: Extract bank hooks**

Move `useBanks/useBanksWithNextTasks/useBankGroups` to `frontend/src/domains/bank/hooks.ts`.

**Step 5: Update imports**

Update references in:
- `frontend/src/domains/bank/views/accounts.tsx`
- `frontend/src/routes/_authenticated/accounts/index.tsx`
- any other imports of bank hooks/types/apis

**Step 6: Run build to verify**

Run: `cd frontend && npm run build`  
Expected: PASS

**Step 7: Commit**

```bash
git add frontend/src/domains frontend/src/lib frontend/src/routes
git commit -m "refactor(bank): move bank domain to dedicated folder"
```

---

### Task 4: 领域化迁移 - Task

**Files:**
- Move: `frontend/src/features/tasks/index.tsx` → `frontend/src/domains/task/views/tasks.tsx`
- Move: task hooks from `frontend/src/hooks/use-queries.ts` → `frontend/src/domains/task/hooks.ts`
- Move: task api from `frontend/src/lib/api.ts` → `frontend/src/domains/task/api.ts`
- Move: task types from `frontend/src/lib/types.ts` → `frontend/src/domains/task/types.ts`
- Update: `frontend/src/routes/_authenticated/tasks/index.tsx` imports

**Step 1: Move task view**

```bash
mkdir -p frontend/src/domains/task/views
git mv frontend/src/features/tasks/index.tsx frontend/src/domains/task/views/tasks.tsx
```

**Step 2: Extract task types/api/hooks and update imports**

Same approach as Task 3, but for task domain.

**Step 3: Run build**

Run: `cd frontend && npm run build`  
Expected: PASS

**Step 4: Commit**

```bash
git add frontend/src/domains frontend/src/lib frontend/src/routes
git commit -m "refactor(task): move task domain to dedicated folder"
```

---

### Task 5: 领域化迁移 - Strategy / Notification / Auth / Settings / Dashboard

**Files:**
- Move respective `features/*` into `frontend/src/domains/<domain>/views`
- Move domain hooks/api/types similarly
- Update `routes` imports

**Step 1: Migrate each domain one by one**

Use `git mv` for files, update imports per domain.

**Step 2: Run build**

Run: `cd frontend && npm run build`  
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/src/domains frontend/src/lib frontend/src/routes
git commit -m "refactor(frontend): organize remaining domains"
```

---

### Task 6: 后端文件分区（不拆包）

**Files:**
- Split: `api/v1/bank.go` into `api/v1/bank_handlers.go`, `api/v1/bank_routes.go`, `api/v1/bank_responses.go` (if needed)
- Split: `api/v1/task.go` similarly
- Split: `store/store.go` into `store/bank_queries.go`, `store/task_queries.go`, `store/bank_filters.go`, `store/task_filters.go`

**Step 1: Move functions by domain**

Use `git mv` and copy functions into domain-specific files.

**Step 2: Run go test**

Run: `go test ./...`  
Expected: PASS

**Step 3: Commit**

```bash
git add api/v1 store
git commit -m "refactor: organize backend files by domain"
```

---

### Task 7: 命名统一（C）

**Files:**
- Rename any `PascalCase`/`snake_case` filenames to `kebab-case` where needed
- Update all import paths accordingly

**Step 1: Rename files**

Use `git mv` to rename.

**Step 2: Run build + go test**

Run: `cd frontend && npm run build`  
Run: `go test ./...`  
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: normalize file naming"
```

---

### Task 8: 全量回归

**Files:**
- No code changes

**Step 1: Run tests**

Run: `go test ./...`  
Run: `cd frontend && npm run build`  
Expected: PASS

**Step 2: Commit**

No commit required.

