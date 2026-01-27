package tasks

import (
	"testing"
	"time"

	"github.com/CoxxA/nomadbank/store/model"
)

type fixedRandomizer struct{}

func (f fixedRandomizer) IntervalDays(min, max int) int   { return min }
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
