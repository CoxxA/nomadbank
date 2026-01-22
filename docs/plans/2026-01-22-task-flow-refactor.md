# Task Flow Refactor (Phase 1) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将“任务生成/调度”从 API handler 中抽离为可测试的领域模块与服务层，保持业务行为不变。

**Architecture:** 新增 `internal/tasks` 领域模块（Randomizer/Generator/Scheduler/Service），API 仅负责校验与返回；store 层保持不变。通过纯函数与可控随机源提升可测试性。

**Tech Stack:** Go 1.22, Echo, GORM, SQLite, testing

---

### Task 1: 新建 Randomizer 模块（可控随机）

**Files:**
- Create: `internal/tasks/randomizer.go`
- Create: `internal/tasks/randomizer_test.go`

**Step 1: Write the failing test**

```go
package tasks

import (
    "testing"
    "time"
)

type stubRand struct {
    intnVals   []int
    floatVals  []float64
    intnIndex  int
    floatIndex int
}

func (s *stubRand) Intn(n int) int {
    v := s.intnVals[s.intnIndex%len(s.intnVals)] % n
    s.intnIndex++
    return v
}

func (s *stubRand) Float64() float64 {
    v := s.floatVals[s.floatIndex%len(s.floatVals)]
    s.floatIndex++
    return v
}

func TestRandomizerAmountPrecision(t *testing.T) {
    r := NewRandomizer(&stubRand{
        intnVals:  []int{0, 1, 2},
        floatVals: []float64{0.5, 0.55, 0.555},
    })

    if got := r.Amount(10, 20); got != 15 {
        t.Fatalf("expected 15, got %v", got)
    }
    if got := r.Amount(10, 20); got != 15.5 {
        t.Fatalf("expected 15.5, got %v", got)
    }
    if got := r.Amount(10, 20); got != 15.55 {
        t.Fatalf("expected 15.55, got %v", got)
    }
}

func TestRandomizerTime(t *testing.T) {
    r := NewRandomizer(&stubRand{
        intnVals:  []int{30},
        floatVals: []float64{0.5},
    })

    base := time.Date(2026, 1, 19, 0, 0, 0, 0, time.Local)
    got := r.Time(base, "09:00", "10:00")
    if got.Hour() != 9 || got.Minute() != 30 {
        t.Fatalf("expected 09:30, got %v", got.Format("15:04"))
    }
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/tasks -run TestRandomizer`
Expected: FAIL (undefined NewRandomizer/Amount/Time)

**Step 3: Write minimal implementation**

```go
package tasks

import (
    "math/rand"
    "time"
)

type Rand interface {
    Intn(n int) int
    Float64() float64
}

type Randomizer interface {
    IntervalDays(min, max int) int
    Amount(min, max float64) float64
    Time(date time.Time, startTime, endTime string) time.Time
}

type randomizer struct {
    rng Rand
}

func NewRandomizer(rng Rand) Randomizer {
    return &randomizer{rng: rng}
}

func NewDefaultRandomizer() Randomizer {
    return NewRandomizer(rand.New(rand.NewSource(time.Now().UnixNano())))
}

func (r *randomizer) IntervalDays(min, max int) int {
    if max < min {
        max = min
    }
    return min + r.rng.Intn(max-min+1)
}

func (r *randomizer) Amount(min, max float64) float64 {
    base := min + r.rng.Float64()*(max-min)
    precision := r.rng.Intn(3)
    switch precision {
    case 0:
        return float64(int(base))
    case 1:
        return float64(int(base*10)) / 10
    default:
        return float64(int(base*100)) / 100
    }
}

func (r *randomizer) Time(date time.Time, startTime, endTime string) time.Time {
    startHour, startMin := parseTime(startTime)
    endHour, endMin := parseTime(endTime)
    startMinutes := startHour*60 + startMin
    endMinutes := endHour*60 + endMin
    if endMinutes <= startMinutes {
        endMinutes = startMinutes + 60
    }
    randomMinutes := startMinutes + r.rng.Intn(endMinutes-startMinutes)
    hour := randomMinutes / 60
    minute := randomMinutes % 60
    return time.Date(date.Year(), date.Month(), date.Day(), hour, minute, r.rng.Intn(60), 0, date.Location())
}

func parseTime(timeStr string) (int, int) {
    hour, minute := 9, 0
    if len(timeStr) >= 5 {
        h, m := 0, 0
        if _, err := parseTimeFormat(timeStr, &h, &m); err == nil {
            hour, minute = h, m
        }
    }
    return hour, minute
}

func parseTimeFormat(s string, hour, minute *int) (bool, error) {
    t, err := time.Parse("15:04", s)
    if err != nil {
        return false, err
    }
    *hour = t.Hour()
    *minute = t.Minute()
    return true, nil
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/tasks -run TestRandomizer`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/tasks/randomizer.go internal/tasks/randomizer_test.go
git commit -m "refactor(tasks): add randomizer" 
```

---

### Task 2: 抽离转账对生成（Generator）

**Files:**
- Create: `internal/tasks/generator.go`
- Create: `internal/tasks/generator_test.go`

**Step 1: Write the failing test**

```go
package tasks

import (
    "testing"
    "github.com/CoxxA/nomadbank/store/model"
)

func TestGenerateBalancedPairsEven(t *testing.T) {
    banks := []model.Bank{{ID: "A"}, {ID: "B"}, {ID: "C"}, {ID: "D"}}
    pairs := GenerateBalancedPairs(banks)
    if len(pairs) != 4 {
        t.Fatalf("expected 4 pairs, got %d", len(pairs))
    }
    assertInOutCoverage(t, banks, pairs)
}

func TestGenerateBalancedPairsOdd(t *testing.T) {
    banks := []model.Bank{{ID: "A"}, {ID: "B"}, {ID: "C"}}
    pairs := GenerateBalancedPairs(banks)
    if len(pairs) != 4 {
        t.Fatalf("expected 4 pairs, got %d", len(pairs))
    }
    assertInOutCoverage(t, banks, pairs)
}

func TestGenerateBalancedPairsSmall(t *testing.T) {
    banks := []model.Bank{{ID: "A"}}
    if got := GenerateBalancedPairs(banks); got != nil {
        t.Fatalf("expected nil, got %v", got)
    }
}

func assertInOutCoverage(t *testing.T, banks []model.Bank, pairs []transferPair) {
    t.Helper()
    in := map[string]bool{}
    out := map[string]bool{}
    for _, p := range pairs {
        out[p.from.ID] = true
        in[p.to.ID] = true
    }
    for _, b := range banks {
        if !in[b.ID] || !out[b.ID] {
            t.Fatalf("bank %s missing in/out coverage", b.ID)
        }
    }
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/tasks -run TestGenerateBalancedPairs`
Expected: FAIL (undefined GenerateBalancedPairs)

**Step 3: Write minimal implementation**

```go
package tasks

import (
    "math/rand"

    "github.com/CoxxA/nomadbank/store/model"
)

type transferPair struct {
    from model.Bank
    to   model.Bank
}

func GenerateBalancedPairs(banks []model.Bank) []transferPair {
    n := len(banks)
    if n < 2 {
        return nil
    }

    shuffled := make([]model.Bank, n)
    copy(shuffled, banks)
    rand.Shuffle(n, func(i, j int) {
        shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
    })

    var pairs []transferPair
    for i := 0; i < n-1; i += 2 {
        pairs = append(pairs, transferPair{from: shuffled[i], to: shuffled[i+1]})
    }
    for i := 1; i < n; i += 2 {
        nextIdx := (i + 1) % n
        pairs = append(pairs, transferPair{from: shuffled[i], to: shuffled[nextIdx]})
    }
    if n%2 == 1 {
        pairs = append(pairs, transferPair{from: shuffled[n-1], to: shuffled[0]})
        pairs = append(pairs, transferPair{from: shuffled[n-2], to: shuffled[n-1]})
    }

    return pairs
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/tasks -run TestGenerateBalancedPairs`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/tasks/generator.go internal/tasks/generator_test.go
git commit -m "refactor(tasks): extract generator" 
```

---

### Task 3: 抽离任务调度（Scheduler）

**Files:**
- Create: `internal/tasks/scheduler.go`
- Create: `internal/tasks/scheduler_test.go`

**Step 1: Write the failing test**

```go
package tasks

import (
    "testing"
    "time"

    "github.com/CoxxA/nomadbank/store/model"
)

type fixedRandomizer struct{}

func (f fixedRandomizer) IntervalDays(min, max int) int { return min }
func (f fixedRandomizer) Amount(min, max float64) float64 { return min }
func (f fixedRandomizer) Time(date time.Time, start, end string) time.Time {
    return time.Date(date.Year(), date.Month(), date.Day(), 9, 0, 0, 0, date.Location())
}

func TestScheduleTasksSkipWeekend(t *testing.T) {
    strategy := &model.Strategy{DailyLimit: 3, SkipWeekend: true, TimeStart: "09:00", TimeEnd: "10:00", AmountMin: 10, AmountMax: 20}
    banks := []model.Bank{{ID: "A"}, {ID: "B"}}
    pairs := []transferPair{{from: banks[0], to: banks[1]}}
    sat := time.Date(2026, 1, 17, 0, 0, 0, 0, time.Local)

    tasks := ScheduleTasks("u", "", 1, pairs, sat, strategy, fixedRandomizer{})
    if len(tasks) != 1 {
        t.Fatalf("expected 1 task, got %d", len(tasks))
    }
    if tasks[0].ExecDate.Weekday() == time.Saturday || tasks[0].ExecDate.Weekday() == time.Sunday {
        t.Fatalf("expected weekday, got %v", tasks[0].ExecDate.Weekday())
    }
}

func TestScheduleTasksDailyLimit(t *testing.T) {
    strategy := &model.Strategy{DailyLimit: 1, SkipWeekend: false, TimeStart: "09:00", TimeEnd: "10:00", AmountMin: 10, AmountMax: 20}
    banks := []model.Bank{{ID: "A"}, {ID: "B"}, {ID: "C"}}
    pairs := []transferPair{{from: banks[0], to: banks[1]}, {from: banks[1], to: banks[2]}}
    base := time.Date(2026, 1, 19, 0, 0, 0, 0, time.Local)

    tasks := ScheduleTasks("u", "", 1, pairs, base, strategy, fixedRandomizer{})
    if len(tasks) != 2 {
        t.Fatalf("expected 2 tasks, got %d", len(tasks))
    }
    if !tasks[1].ExecDate.After(tasks[0].ExecDate) {
        t.Fatalf("expected second task on a later date")
    }
}

func TestScheduleTasksDirectFlowSpacing(t *testing.T) {
    strategy := &model.Strategy{DailyLimit: 3, SkipWeekend: false, TimeStart: "09:00", TimeEnd: "10:00", AmountMin: 10, AmountMax: 20}
    banks := []model.Bank{{ID: "A"}, {ID: "B"}}
    pairs := []transferPair{{from: banks[0], to: banks[1]}, {from: banks[1], to: banks[0]}}
    base := time.Date(2026, 1, 19, 0, 0, 0, 0, time.Local)

    tasks := ScheduleTasks("u", "", 1, pairs, base, strategy, fixedRandomizer{})
    if len(tasks) != 2 {
        t.Fatalf("expected 2 tasks, got %d", len(tasks))
    }
    minDate := tasks[0].ExecDate.AddDate(0, 0, 3)
    if tasks[1].ExecDate.Before(minDate) {
        t.Fatalf("expected direct flow spacing >= 3 days")
    }
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/tasks -run TestScheduleTasks`
Expected: FAIL (undefined ScheduleTasks)

**Step 3: Write minimal implementation**

```go
package tasks

import (
    "sort"
    "time"

    "github.com/CoxxA/nomadbank/store/model"
    "github.com/google/uuid"
)

func ScheduleTasks(userID, groupName string, cycle int, pairs []transferPair, baseDate time.Time, strategy *model.Strategy, randomizer Randomizer) []model.TransferTask {
    var tasks []model.TransferTask
    bankDayDirection := make(map[string]string)
    directFlowDate := make(map[string]time.Time)

    currentDate := baseDate
    dailyCount := 0

    for _, pair := range pairs {
        needNewDay := false
        if dailyCount >= strategy.DailyLimit {
            needNewDay = true
        }

        fromKey := pair.from.ID + ":" + currentDate.Format("2006-01-02")
        toKey := pair.to.ID + ":" + currentDate.Format("2006-01-02")

        if dir, exists := bankDayDirection[fromKey]; exists && dir == "in" {
            needNewDay = true
        }
        if dir, exists := bankDayDirection[toKey]; exists && dir == "out" {
            needNewDay = true
        }

        reverseKey := pair.to.ID + "->" + pair.from.ID
        if lastDate, exists := directFlowDate[reverseKey]; exists {
            minDate := lastDate.AddDate(0, 0, 3)
            if currentDate.Before(minDate) {
                currentDate = minDate
                dailyCount = 0
                bankDayDirection = clearDayRecords(bankDayDirection, currentDate)
            }
        }

        if needNewDay {
            currentDate = currentDate.AddDate(0, 0, 1)
            dailyCount = 0
        }

        if strategy.SkipWeekend {
            currentDate = skipWeekend(currentDate)
        }

        fromKey = pair.from.ID + ":" + currentDate.Format("2006-01-02")
        toKey = pair.to.ID + ":" + currentDate.Format("2006-01-02")
        bankDayDirection[fromKey] = "out"
        bankDayDirection[toKey] = "in"

        flowKey := pair.from.ID + "->" + pair.to.ID
        directFlowDate[flowKey] = currentDate

        amount := randomizer.Amount(strategy.AmountMin, strategy.AmountMax)
        execTime := randomizer.Time(currentDate, strategy.TimeStart, strategy.TimeEnd)

        task := model.TransferTask{
            ID:         uuid.New().String(),
            UserID:     userID,
            GroupName:  groupName,
            Cycle:      cycle,
            AnchorDate: baseDate,
            ExecDate:   execTime,
            FromBankID: pair.from.ID,
            ToBankID:   pair.to.ID,
            Amount:     amount,
            Status:     model.TaskStatusPending,
        }
        tasks = append(tasks, task)
        dailyCount++
    }

    sort.Slice(tasks, func(i, j int) bool {
        return tasks[i].ExecDate.Before(tasks[j].ExecDate)
    })

    return tasks
}

func clearDayRecords(records map[string]string, currentDate time.Time) map[string]string {
    currentDateStr := currentDate.Format("2006-01-02")
    newRecords := make(map[string]string)
    for key, value := range records {
        if len(key) > 10 && key[len(key)-10:] == currentDateStr {
            newRecords[key] = value
        }
    }
    return newRecords
}

func skipWeekend(date time.Time) time.Time {
    for date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
        date = date.AddDate(0, 0, 1)
    }
    return date
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/tasks -run TestScheduleTasks`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/tasks/scheduler.go internal/tasks/scheduler_test.go
git commit -m "refactor(tasks): extract scheduler" 
```

---

### Task 4: 引入 Service 层并迁移 API 逻辑

**Files:**
- Create: `internal/tasks/service.go`
- Create: `internal/tasks/service_test.go`
- Modify: `api/v1/task.go`

**Step 1: Write the failing test**

```go
package tasks

import (
    "path/filepath"
    "testing"

    "github.com/CoxxA/nomadbank/store"
    "github.com/CoxxA/nomadbank/store/model"
    "github.com/google/uuid"
)

type fixedServiceRandomizer struct{}

func (f fixedServiceRandomizer) IntervalDays(min, max int) int { return min }
func (f fixedServiceRandomizer) Amount(min, max float64) float64 { return min }
func (f fixedServiceRandomizer) Time(date time.Time, start, end string) time.Time {
    return time.Date(date.Year(), date.Month(), date.Day(), 9, 0, 0, 0, date.Location())
}

func TestServiceGenerateCreatesTasks(t *testing.T) {
    dbPath := filepath.Join(t.TempDir(), "test.db")
    db, err := store.NewDB(dbPath, false)
    if err != nil {
        t.Fatalf("db init failed: %v", err)
    }
    s := store.New(db)

    userID := uuid.New().String()
    strategy := &model.Strategy{
        ID:          uuid.New().String(),
        UserID:      userID,
        Name:        "S",
        IntervalMin: 1,
        IntervalMax: 1,
        TimeStart:   "09:00",
        TimeEnd:     "10:00",
        SkipWeekend: false,
        AmountMin:   10,
        AmountMax:   20,
        DailyLimit:  2,
    }
    if err := s.CreateStrategy(strategy); err != nil {
        t.Fatalf("create strategy: %v", err)
    }

    banks := []*model.Bank{
        {ID: uuid.New().String(), UserID: userID, Name: "A", IsActive: true},
        {ID: uuid.New().String(), UserID: userID, Name: "B", IsActive: true},
    }
    for _, b := range banks {
        if err := s.CreateBank(b); err != nil {
            t.Fatalf("create bank: %v", err)
        }
    }

    svc := NewService(s, fixedServiceRandomizer{})
    res, err := svc.Generate(userID, GenerateInput{StrategyID: strategy.ID, Group: "", Cycles: 1})
    if err != nil {
        t.Fatalf("generate: %v", err)
    }
    if res.Count == 0 {
        t.Fatalf("expected tasks to be created")
    }
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/tasks -run TestServiceGenerate`
Expected: FAIL (undefined NewService/Generate/GenerateInput)

**Step 3: Write minimal implementation**

```go
package tasks

import (
    "errors"
    "time"

    "github.com/CoxxA/nomadbank/store"
    "github.com/CoxxA/nomadbank/store/model"
)

var (
    ErrStrategyRequired = errors.New("请选择策略")
    ErrStrategyNotFound = errors.New("策略不存在")
    ErrNotEnoughBanks   = errors.New("至少需要 2 个活跃银行才能生成任务")
)

type GenerateInput struct {
    StrategyID string
    Group      string
    Cycles     int
}

type GenerateResult struct {
    Count      int
    StartCycle int
    EndCycle   int
}

type Service struct {
    store      *store.Store
    randomizer Randomizer
}

func NewService(store *store.Store, randomizer Randomizer) *Service {
    if randomizer == nil {
        randomizer = NewDefaultRandomizer()
    }
    return &Service{store: store, randomizer: randomizer}
}

func (s *Service) Generate(userID string, input GenerateInput) (GenerateResult, error) {
    if input.StrategyID == "" {
        return GenerateResult{}, ErrStrategyRequired
    }

    strategy, err := s.store.GetStrategyByID(input.StrategyID)
    if err != nil {
        return GenerateResult{}, ErrStrategyNotFound
    }

    var banks []model.Bank
    if input.Group != "" {
        banks, err = s.store.ListActiveBanksByGroup(userID, input.Group)
    } else {
        banks, err = s.store.ListActiveBanksByUserID(userID)
    }
    if err != nil {
        return GenerateResult{}, err
    }
    if len(banks) < 2 {
        return GenerateResult{}, ErrNotEnoughBanks
    }

    if input.Cycles <= 0 {
        input.Cycles = 4
    }

    lastCycle, lastDate := s.store.GetLastTaskCycleAndDate(userID, input.Group)
    startCycle := lastCycle + 1

    var startDate time.Time
    if lastCycle == 0 || lastDate.IsZero() || lastDate.Year() < 2000 {
        startDate = time.Now().AddDate(0, 0, 1)
    } else {
        intervalDays := s.randomizer.IntervalDays(strategy.IntervalMin, strategy.IntervalMax)
        startDate = lastDate.AddDate(0, 0, intervalDays)
    }

    tasks := GenerateTasks(userID, input.Group, banks, strategy, input.Cycles, startCycle, startDate, s.randomizer)

    if err := s.store.CreateTasks(tasks); err != nil {
        return GenerateResult{}, err
    }

    return GenerateResult{
        Count:      len(tasks),
        StartCycle: startCycle,
        EndCycle:   startCycle + input.Cycles - 1,
    }, nil
}
```

Also add `GenerateTasks` helper in `internal/tasks/generate.go`:

```go
func GenerateTasks(userID, groupName string, banks []model.Bank, strategy *model.Strategy, cycles, startCycle int, startDate time.Time, randomizer Randomizer) []model.TransferTask {
    var allTasks []model.TransferTask
    currentDate := startDate

    for i := 0; i < cycles; i++ {
        cycle := startCycle + i
        if i > 0 {
            intervalDays := randomizer.IntervalDays(strategy.IntervalMin, strategy.IntervalMax)
            currentDate = currentDate.AddDate(0, 0, intervalDays)
        }
        pairs := GenerateBalancedPairs(banks)
        cycleTasks := ScheduleTasks(userID, groupName, cycle, pairs, currentDate, strategy, randomizer)
        allTasks = append(allTasks, cycleTasks...)
        if len(cycleTasks) > 0 {
            lastTask := cycleTasks[len(cycleTasks)-1]
            currentDate = lastTask.ExecDate
        }
    }

    return allTasks
}
```

Update `api/v1/task.go` Generate handler to use service + error mapping:

```go
import "errors"
import "github.com/CoxxA/nomadbank/internal/tasks"

// in TaskAPI
svc := tasks.NewService(a.store, nil)
res, err := svc.Generate(userID, tasks.GenerateInput{StrategyID: req.StrategyID, Group: req.Group, Cycles: req.Cycles})
if err != nil {
    switch {
    case errors.Is(err, tasks.ErrStrategyRequired):
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    case errors.Is(err, tasks.ErrStrategyNotFound):
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    case errors.Is(err, tasks.ErrNotEnoughBanks):
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    default:
        return echo.NewHTTPError(http.StatusInternalServerError, "创建任务失败")
    }
}
return c.JSON(http.StatusCreated, map[string]interface{}{
    "message":     "任务生成成功",
    "count":       res.Count,
    "start_cycle": res.StartCycle,
    "end_cycle":   res.EndCycle,
})
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/tasks -run TestServiceGenerate`
Expected: PASS

**Step 5: Run full tests**

Run: `go test ./...`
Expected: PASS

**Step 6: Commit**

```bash
git add internal/tasks service api/v1/task.go
git commit -m "refactor(tasks): move generation into service" 
```

---

**Execution Handoff**

Plan complete and saved to `docs/plans/2026-01-22-task-flow-refactor.md`. Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
