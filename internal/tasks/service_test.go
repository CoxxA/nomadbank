package tasks

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
	"github.com/google/uuid"
)

type fixedServiceRandomizer struct{}

func (f fixedServiceRandomizer) IntervalDays(min, max int) int   { return min }
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
