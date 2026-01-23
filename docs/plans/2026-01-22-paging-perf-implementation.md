# Paging + Storage Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `/banks` 与 `/tasks` 改为服务端分页 + 过滤，并补充必要的索引与前端分页改造。

**Architecture:** 后端引入分页响应结构与过滤参数解析，Store 层提供分页查询与计数；前端使用分页响应驱动列表与分页器；新增 `/banks/groups` 与 `/tasks/cycles` 以避免全量拉取。

**Tech Stack:** Go (Echo, GORM, SQLite), React (TanStack Query), TypeScript

---

### Task 0: 修复现有编译问题（已完成）

**Files:**
- Modify: `frontend/src/features/accounts/index.tsx`

**Note:** 本任务已在本分支修复并提交（bank header actions fragment 关闭）。

---

### Task 1: 定义分页响应 + 银行分页测试（TDD）

**Files:**
- Modify: `api/v1/bank_test.go`
- Create: `api/v1/pagination.go`

**Step 1: Write the failing test**

Update bank list test to expect paged response:

```go
// in api/v1/bank_test.go

type pagedResponse[T any] struct {
    Items    []T  `json:"items"`
    Total    int64 `json:"total"`
    Page     int   `json:"page"`
    PageSize int   `json:"page_size"`
}

func TestBankListPagedShape(t *testing.T) {
    db, _ := store.NewDB(filepath.Join(t.TempDir(), "test.db"), false)
    s := store.New(db)
    userID := "user-1"
    _ = s.CreateBank(&model.Bank{ID: "b1", UserID: userID, Name: "A", IsActive: true})

    e := echo.New()
    req := httptest.NewRequest(http.MethodGet, "/api/v1/banks", nil)
    rec := httptest.NewRecorder()
    c := e.NewContext(req, rec)
    c.Set("user_id", userID)

    api := NewBankAPI(s)
    _ = api.List(c)

    var payload pagedResponse[map[string]any]
    _ = json.Unmarshal(rec.Body.Bytes(), &payload)

    if payload.Page != 1 || payload.PageSize == 0 {
        t.Fatalf("unexpected paging: %v", payload)
    }
    if payload.Total != 1 || len(payload.Items) != 1 {
        t.Fatalf("unexpected items")
    }
    if _, ok := payload.Items[0]["tags"]; ok {
        t.Fatalf("tags should be absent")
    }
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./api/v1 -run TestBankListPagedShape`  
Expected: FAIL (existing endpoint returns array)

**Step 3: Write minimal implementation**

Create `api/v1/pagination.go`:

```go
package v1

import (
  "fmt"
  "strconv"
  "github.com/labstack/echo/v4"
)

type PageResult[T any] struct {
  Items    []T  `json:"items"`
  Total    int64 `json:"total"`
  Page     int   `json:"page"`
  PageSize int   `json:"page_size"`
}

const (
  defaultPage = 1
  defaultPageSize = 20
  maxPageSize = 100
)

func parsePageParams(c echo.Context) (int, int, error) {
  page := defaultPage
  pageSize := defaultPageSize

  if v := c.QueryParam("page"); v != "" {
    parsed, err := strconv.Atoi(v)
    if err != nil || parsed < 1 {
      return 0, 0, fmt.Errorf("invalid page")
    }
    page = parsed
  }
  if v := c.QueryParam("page_size"); v != "" {
    parsed, err := strconv.Atoi(v)
    if err != nil || parsed < 1 {
      return 0, 0, fmt.Errorf("invalid page_size")
    }
    if parsed > maxPageSize {
      parsed = maxPageSize
    }
    pageSize = parsed
  }
  return page, pageSize, nil
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./api/v1 -run TestBankListPagedShape`  
Expected: PASS (once API updated in later task)

**Step 5: Commit**

```bash
git add api/v1/bank_test.go api/v1/pagination.go
git commit -m "test: define paging response expectations"
```

---

### Task 2: 任务分页与周期列表测试（TDD）

**Files:**
- Create: `api/v1/task_test.go`

**Step 1: Write the failing test**

```go
func TestTaskListPagedShape(t *testing.T) {
  db, _ := store.NewDB(filepath.Join(t.TempDir(), "test.db"), false)
  s := store.New(db)
  userID := "user-1"
  _ = s.CreateTask(&model.TransferTask{ID: "t1", UserID: userID, Cycle: 1, ExecDate: time.Now()})

  e := echo.New()
  req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks?page=1&page_size=10", nil)
  rec := httptest.NewRecorder()
  c := e.NewContext(req, rec)
  c.Set("user_id", userID)

  api := NewTaskAPI(s)
  _ = api.List(c)

  var payload PageResult[map[string]any]
  _ = json.Unmarshal(rec.Body.Bytes(), &payload)
  if payload.Total != 1 || len(payload.Items) != 1 {
    t.Fatalf("unexpected items")
  }
}

func TestTaskCyclesEndpoint(t *testing.T) {
  db, _ := store.NewDB(filepath.Join(t.TempDir(), "test.db"), false)
  s := store.New(db)
  userID := "user-1"
  _ = s.CreateTask(&model.TransferTask{ID: "t1", UserID: userID, Cycle: 2, ExecDate: time.Now()})

  e := echo.New()
  req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/cycles", nil)
  rec := httptest.NewRecorder()
  c := e.NewContext(req, rec)
  c.Set("user_id", userID)

  api := NewTaskAPI(s)
  _ = api.Cycles(c)

  var payload struct { Cycles []int `json:"cycles"` }
  _ = json.Unmarshal(rec.Body.Bytes(), &payload)
  if len(payload.Cycles) != 1 || payload.Cycles[0] != 2 {
    t.Fatalf("unexpected cycles")
  }
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./api/v1 -run TestTaskListPagedShape`  
Expected: FAIL (endpoint still returns array)

**Step 3: Commit**

```bash
git add api/v1/task_test.go
git commit -m "test: add task paging and cycles tests"
```

---

### Task 3: Store 分页与过滤 + 新端点实现

**Files:**
- Modify: `store/store.go`
- Modify: `api/v1/bank.go`
- Modify: `api/v1/task.go`
- Modify: `server/router.go`

**Step 1: Implement minimal Store filters**

Add filter structs and paged queries:

```go
type BankListFilter struct {
  Status string
  Group  string
  Query  string
}

type TaskListFilter struct {
  Status string
  Group  string
  Cycle  *int
  Query  string
}
```

Implement:
- `ListBanksByUserIDPaged(userID, filter, page, pageSize)`
- `CountBanksByUserID(userID, filter)`
- `ListTasksByUserIDPaged(userID, filter, page, pageSize)`
- `CountTasksByUserID(userID, filter)`
- `ListBankGroups(userID)`
- `ListTaskCycles(userID)`

**Step 2: Update API handlers**

- `BankAPI.List`: parse paging + filters, call store, build `PageResult[BankWithNextTaskResponse]`.
- `TaskAPI.List`: parse paging + filters, return `PageResult[TaskResponse]`.
- Add `BankAPI.Groups` route: `GET /api/v1/banks/groups`.
- Add `TaskAPI.Cycles` route: `GET /api/v1/tasks/cycles`.
- Register new routes in `server/router.go`.

**Step 3: Run tests**

Run: `go test ./api/v1 -run TestBankListPagedShape`  
Expected: PASS

Run: `go test ./api/v1 -run TestTaskListPagedShape`  
Expected: PASS

**Step 4: Commit**

```bash
git add store/store.go api/v1/bank.go api/v1/task.go server/router.go
git commit -m "feat: add paged bank/task APIs and filters"
```

---

### Task 4: 添加索引（模型层）

**Files:**
- Modify: `store/model/task.go`
- Modify: `store/model/bank.go`

**Step 1: Update GORM tags**

Example for task:
```go
UserID   string `gorm:"index:idx_tasks_user_exec,priority:1;index:idx_tasks_user_status_exec,priority:1"`
Status   TaskStatus `gorm:"index:idx_tasks_user_status_exec,priority:2"`
ExecDate time.Time `gorm:"index:idx_tasks_user_exec,priority:2;index:idx_tasks_user_status_exec,priority:3"`
```

Bank:
```go
UserID    string  `gorm:"index:idx_banks_user_status_group,priority:1;index:idx_banks_user_name,priority:1"`
IsActive  bool    `gorm:"index:idx_banks_user_status_group,priority:2"`
GroupName *string `gorm:"index:idx_banks_user_status_group,priority:3"`
Name      string  `gorm:"index:idx_banks_user_name,priority:2"`
```

**Step 2: Run tests**

Run: `go test ./...`  
Expected: PASS

**Step 3: Commit**

```bash
git add store/model/task.go store/model/bank.go
git commit -m "perf: add indexes for paged queries"
```

---

### Task 5: 前端分页适配

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/hooks/use-queries.ts`
- Modify: `frontend/src/features/accounts/index.tsx`
- Modify: `frontend/src/features/tasks/index.tsx`

**Step 1: Add PagedResult type**

```ts
export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}
```

**Step 2: Update API client**

- `banksApi.list` & `banksApi.listWithNextTasks` accept params, return `PagedResult<BankWithNextTask>`.
- Add `banksApi.getGroups` -> `GET /api/v1/banks/groups`.
- `tasksApi.list` returns `PagedResult<Task>` with params.
- Add `tasksApi.getCycles` -> `GET /api/v1/tasks/cycles`.
- Update `batchCompleteToday` to call new endpoint if added (or keep but request large page size if endpoint not added).

**Step 3: Update hooks**

- `useBanksWithNextTasks` accepts paging/filter params.
- `useTasks` accepts paging/filter params.
- Update queryKeys to include paging/filter to avoid cache collisions.

**Step 4: Update pages**

- `Accounts`: remove client-side pagination; drive `page/pageSize` from API response.
- `Tasks`: move filters into API params and use server paging.
- Ensure filter changes reset `page=1`.

**Step 5: Manual verification**

- 切换筛选/搜索/分页时列表正确。
- 总数与分页一致。

**Step 6: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/api.ts frontend/src/hooks/use-queries.ts frontend/src/features/accounts/index.tsx frontend/src/features/tasks/index.tsx
git commit -m "feat: switch tasks/banks to server paging"
```

---

### Task 6: 全量测试

**Files:**
- No code changes

**Step 1: Run tests**

Run: `go test ./...`  
Expected: PASS

Run: `cd frontend && npm run build`  
Expected: PASS

**Step 2: Commit**

No commit required.
