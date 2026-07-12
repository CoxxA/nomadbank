package task

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
)

type Random interface {
	Intn(int) int
	Shuffle(int, func(int, int))
}

type Planner struct {
	random Random
}

type PlanInput struct {
	Accounts      []domain.Account
	Strategy      domain.Strategy
	Cycles        int
	Now           time.Time
	LastScheduled *time.Time
}

func NewPlanner(random Random) *Planner {
	if random == nil {
		random = rand.New(rand.NewSource(time.Now().UnixNano()))
	}
	return &Planner{random: random}
}

func (p *Planner) Plan(input PlanInput) []domain.TaskDraft {
	if len(input.Accounts) < 2 || input.Cycles <= 0 {
		return nil
	}

	currentDate := p.firstDate(input)
	drafts := make([]domain.TaskDraft, 0, len(input.Accounts)*input.Cycles)
	directions := make(map[string]string)
	flows := make(map[string]time.Time)
	dailyCounts := make(map[string]int)

	for cycle := 1; cycle <= input.Cycles; cycle++ {
		if cycle > 1 {
			currentDate = dayStart(currentDate).AddDate(
				0,
				0,
				p.between(input.Strategy.IntervalMinDays, input.Strategy.IntervalMaxDays),
			)
		}
		accounts := append([]domain.Account(nil), input.Accounts...)
		p.random.Shuffle(len(accounts), func(i, j int) {
			accounts[i], accounts[j] = accounts[j], accounts[i]
		})

		for index, from := range accounts {
			to := accounts[(index+1)%len(accounts)]
			currentDate = p.availableDate(
				currentDate,
				from.ID,
				to.ID,
				input.Strategy,
				directions,
				flows,
				dailyCounts,
			)
			dateKey := currentDate.Format("2006-01-02")
			directions[directionKey(from.ID, dateKey)] = "out"
			directions[directionKey(to.ID, dateKey)] = "in"
			flows[flowKey(from.ID, to.ID)] = currentDate
			dailyCounts[dateKey]++

			scheduledAt := p.scheduledTime(
				currentDate,
				input.Strategy.TimeStartMinutes,
				input.Strategy.TimeEndMinutes,
			)
			drafts = append(drafts, domain.TaskDraft{
				CycleNo:       cycle,
				ScheduledAt:   scheduledAt,
				FromAccountID: from.ID,
				ToAccountID:   to.ID,
				AmountCents: p.between64(
					input.Strategy.AmountMinCents,
					input.Strategy.AmountMaxCents,
				),
			})
		}
	}
	return drafts
}

func (p *Planner) firstDate(input PlanInput) time.Time {
	if input.LastScheduled == nil {
		return dayStart(input.Now).AddDate(0, 0, 1)
	}
	last := input.LastScheduled.In(input.Now.Location())
	return dayStart(last).AddDate(
		0,
		0,
		p.between(input.Strategy.IntervalMinDays, input.Strategy.IntervalMaxDays),
	)
}

func (p *Planner) availableDate(
	date time.Time,
	fromID int64,
	toID int64,
	strategy domain.Strategy,
	directions map[string]string,
	flows map[string]time.Time,
	dailyCounts map[string]int,
) time.Time {
	candidate := dayStart(date)
	for {
		candidate = skipWeekend(candidate, strategy.SkipWeekends)
		dateKey := candidate.Format("2006-01-02")
		if dailyCounts[dateKey] >= strategy.DailyLimit {
			candidate = candidate.AddDate(0, 0, 1)
			continue
		}
		if directions[directionKey(fromID, dateKey)] == "in" ||
			directions[directionKey(toID, dateKey)] == "out" {
			candidate = candidate.AddDate(0, 0, 1)
			continue
		}
		if reverseDate, ok := flows[flowKey(toID, fromID)]; ok {
			minimum := dayStart(reverseDate).AddDate(0, 0, 3)
			if candidate.Before(minimum) {
				candidate = minimum
				continue
			}
		}
		return candidate
	}
}

func (p *Planner) scheduledTime(date time.Time, startMinutes, endMinutes int) time.Time {
	minute := startMinutes + p.random.Intn(endMinutes-startMinutes)
	return time.Date(
		date.Year(),
		date.Month(),
		date.Day(),
		minute/60,
		minute%60,
		0,
		0,
		date.Location(),
	)
}

func (p *Planner) between(minimum, maximum int) int {
	if maximum <= minimum {
		return minimum
	}
	return minimum + p.random.Intn(maximum-minimum+1)
}

func (p *Planner) between64(minimum, maximum int64) int64 {
	if maximum <= minimum {
		return minimum
	}
	return minimum + int64(p.random.Intn(int(maximum-minimum+1)))
}

func dayStart(value time.Time) time.Time {
	return time.Date(value.Year(), value.Month(), value.Day(), 0, 0, 0, 0, value.Location())
}

func skipWeekend(value time.Time, enabled bool) time.Time {
	if !enabled {
		return value
	}
	for value.Weekday() == time.Saturday || value.Weekday() == time.Sunday {
		value = value.AddDate(0, 0, 1)
	}
	return value
}

func directionKey(accountID int64, date string) string {
	return fmt.Sprintf("%d:%s", accountID, date)
}

func flowKey(fromID, toID int64) string {
	return fmt.Sprintf("%d>%d", fromID, toID)
}
