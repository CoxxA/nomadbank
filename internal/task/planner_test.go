package task

import (
	"testing"
	"time"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
)

type fixedRandom struct{}

func (fixedRandom) Intn(int) int { return 0 }

func (fixedRandom) Shuffle(_ int, _ func(int, int)) {}

func TestPlannerCreatesBalancedRing(t *testing.T) {
	accounts := []domain.Account{{ID: 1}, {ID: 2}, {ID: 3}}
	strategy := testStrategy()
	planner := NewPlanner(fixedRandom{})
	now := time.Date(2026, time.January, 5, 12, 0, 0, 0, time.UTC)

	drafts := planner.Plan(PlanInput{
		Accounts: accounts,
		Strategy: strategy,
		Cycles:   2,
		Now:      now,
	})
	if len(drafts) != 6 {
		t.Fatalf("expected 6 tasks, got %d", len(drafts))
	}

	for cycle := 1; cycle <= 2; cycle++ {
		incoming := make(map[int64]int)
		outgoing := make(map[int64]int)
		for _, draft := range drafts {
			if draft.CycleNo != cycle {
				continue
			}
			if draft.FromAccountID == draft.ToAccountID {
				t.Fatal("planner created a self transfer")
			}
			outgoing[draft.FromAccountID]++
			incoming[draft.ToAccountID]++
		}
		for _, account := range accounts {
			if incoming[account.ID] != 1 || outgoing[account.ID] != 1 {
				t.Fatalf("account %d is not balanced in cycle %d", account.ID, cycle)
			}
		}
	}
}

func TestPlannerRespectsWeekendAndDailyLimit(t *testing.T) {
	strategy := testStrategy()
	strategy.SkipWeekends = true
	strategy.DailyLimit = 1
	planner := NewPlanner(fixedRandom{})
	friday := time.Date(2026, time.January, 16, 12, 0, 0, 0, time.UTC)

	drafts := planner.Plan(PlanInput{
		Accounts: []domain.Account{{ID: 1}, {ID: 2}},
		Strategy: strategy,
		Cycles:   1,
		Now:      friday,
	})
	if len(drafts) != 2 {
		t.Fatalf("expected 2 tasks, got %d", len(drafts))
	}
	for _, draft := range drafts {
		if draft.ScheduledAt.Weekday() == time.Saturday || draft.ScheduledAt.Weekday() == time.Sunday {
			t.Fatalf("task scheduled on weekend: %s", draft.ScheduledAt)
		}
	}
	if drafts[0].ScheduledAt.Format("2006-01-02") == drafts[1].ScheduledAt.Format("2006-01-02") {
		t.Fatal("daily limit was not applied")
	}
}

func testStrategy() domain.Strategy {
	return domain.Strategy{
		IntervalMinDays:  7,
		IntervalMaxDays:  7,
		TimeStartMinutes: 9 * 60,
		TimeEndMinutes:   10 * 60,
		AmountMinCents:   1000,
		AmountMaxCents:   1000,
		DailyLimit:       3,
	}
}
