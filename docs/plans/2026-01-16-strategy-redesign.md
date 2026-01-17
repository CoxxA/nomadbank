# 保活策略重构设计

## 背景

现有策略模块存在问题：
1. 策略未被实际使用，任务生成硬编码了 7-14 天间隔
2. 策略类型（interval/monthly）无意义
3. 缺少人类行为模拟的关键配置

## 策略数据模型

```go
type Strategy struct {
    ID          string    `gorm:"primaryKey;size:36" json:"id"`
    UserID      string    `gorm:"index;size:36" json:"user_id"` // 系统策略为空
    Name        string    `gorm:"size:255;not null" json:"name"`

    // 时间配置
    IntervalMin int       `gorm:"not null;default:30" json:"interval_min"`  // 最小间隔天数
    IntervalMax int       `gorm:"not null;default:60" json:"interval_max"`  // 最大间隔天数
    TimeStart   string    `gorm:"size:5;not null;default:'09:00'" json:"time_start"` // 执行时段开始
    TimeEnd     string    `gorm:"size:5;not null;default:'21:00'" json:"time_end"`   // 执行时段结束
    SkipWeekend bool      `gorm:"default:false" json:"skip_weekend"` // 是否避开周末

    // 金额配置
    AmountMin   float64   `gorm:"not null;default:10" json:"amount_min"` // 最小金额
    AmountMax   float64   `gorm:"not null;default:30" json:"amount_max"` // 最大金额

    // 任务配置
    DailyLimit  int       `gorm:"not null;default:3" json:"daily_limit"` // 单日任务上限

    // 元信息
    IsSystem    bool      `gorm:"default:false" json:"is_system"` // 是否系统预设
    CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
```

### 移除字段

- `Type` - 不再区分 interval/monthly
- `MonthDay` - 不再支持固定日期

## 系统默认策略

程序启动时自动创建（如不存在）：

| 字段 | 默认保活策略 | 长期保活策略 |
|------|-------------|-------------|
| Name | 默认保活 | 长期保活 |
| IntervalMin | 30 | 90 |
| IntervalMax | 60 | 120 |
| AmountMin | 10 | 10 |
| AmountMax | 30 | 30 |
| TimeStart | 09:00 | 09:00 |
| TimeEnd | 21:00 | 21:00 |
| DailyLimit | 3 | 3 |
| SkipWeekend | false | false |
| IsSystem | true | true |
| UserID | 空 | 空 |

## 任务生成算法

### 核心规则

1. **每个银行有进有出** - 参与的每个银行都必须有转入和转出任务
2. **单日单向** - 同一天内，每个银行只能有一个方向（入或出）
3. **直接回流隔离** - A→B 后 B→A 需间隔 ≥3 天
4. **任务集中化** - 尽量压缩到最少天数执行完所有任务
5. **单日上限** - 每天最多生成 N 笔任务（由策略配置）

### 时间安排示例

假设 4 个银行 A、B、C、D：

```
Day 1: A→B, C→D
  - A: 出
  - B: 入
  - C: 出
  - D: 入

Day 2: B→C, D→A
  - B: 出
  - C: 入
  - D: 出
  - A: 入

结果：每个银行各有 1 进 1 出，共 2 天完成
```

### 金额随机化

在 AmountMin - AmountMax 范围内随机，格式随机选择：
- 整数：15, 23, 30
- 1位小数：12.5, 18.3
- 2位小数：11.38, 19.72

实现：各 1/3 概率随机选择精度。

### 时间随机化

在 TimeStart - TimeEnd 范围内随机生成执行时间。

## API 设计

### 策略 API

```
GET    /api/v1/strategies          获取列表（含系统策略）
POST   /api/v1/strategies          创建自定义策略
GET    /api/v1/strategies/:id      获取详情
PUT    /api/v1/strategies/:id      更新（系统策略不可改）
DELETE /api/v1/strategies/:id      删除（系统策略不可删）
```

### 任务生成 API

```
POST /api/v1/tasks/generate

请求体：
{
  "strategy_id": "xxx",      // 选择的策略 ID
  "bank_ids": ["a","b","c"], // 选择的银行 ID 列表（空=全部活跃银行）
  "tag_id": "xxx",           // 或按标签筛选银行（与 bank_ids 二选一）
  "cycles": 4                // 生成周期数
}

响应：
{
  "message": "任务生成成功",
  "count": 16
}
```

## 前端改动

### 策略管理页面

表单字段：
- 策略名称
- 间隔天数（最小-最大）
- 金额范围（最小-最大）
- 执行时段（开始-结束）
- 单日任务上限
- 是否避开周末

### 任务管理页面

生成任务时选择：
- 策略（下拉选择）
- 银行范围（全部/按标签/手动选择）
- 周期数

## 实现步骤

1. 修改 `store/model/strategy.go` - 更新数据模型
2. 修改 `store/db.go` - 添加系统策略初始化逻辑
3. 修改 `store/store.go` - 更新 Store 方法
4. 修改 `api/v1/strategy.go` - 更新 API 请求/响应结构
5. 修改 `api/v1/task.go` - 重写任务生成算法
6. 前端策略管理页面 - 更新表单
7. 前端任务管理页面 - 更新生成任务弹窗
