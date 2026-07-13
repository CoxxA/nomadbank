package task

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
	"github.com/CoxxA/nomadbank/v2/internal/sqlite"
)

var (
	ErrNotEnoughAccounts = errors.New("至少需要两个活跃账户")
	ErrInvalidCycles     = errors.New("周期数必须在 1 到 24 之间")
)

type GenerateInput struct {
	StrategyID int64
	GroupName  string
	Cycles     int
}

type GenerateResult struct {
	Batch domain.TaskBatch `json:"batch"`
	Tasks int              `json:"tasks"`
}

type Service struct {
	store   *sqlite.Store
	planner *Planner
	now     func() time.Time
}

func NewService(store *sqlite.Store, planner *Planner) *Service {
	if planner == nil {
		planner = NewPlanner(nil)
	}
	return &Service{store: store, planner: planner, now: time.Now}
}

func (s *Service) Generate(ctx context.Context, input GenerateInput) (GenerateResult, error) {
	if input.Cycles == 0 {
		input.Cycles = 4
	}
	if input.Cycles < 1 || input.Cycles > 24 {
		return GenerateResult{}, ErrInvalidCycles
	}
	input.GroupName = strings.TrimSpace(input.GroupName)

	var result GenerateResult
	err := s.store.WithTx(ctx, func(tx *sqlite.Store) error {
		strategy, err := tx.GetStrategy(ctx, input.StrategyID)
		if err != nil {
			return err
		}
		accounts, err := tx.ListAccounts(ctx, true, input.GroupName)
		if err != nil {
			return err
		}
		if len(accounts) < 2 {
			return ErrNotEnoughAccounts
		}
		credentials, err := tx.OwnerCredentials(ctx)
		if err != nil {
			return err
		}
		location, err := time.LoadLocation(credentials.Owner.Timezone)
		if err != nil {
			return err
		}
		lastScheduled, err := tx.LastScheduledAt(ctx, input.GroupName)
		if err != nil {
			return err
		}
		now := s.now().In(location)
		drafts := s.planner.Plan(PlanInput{
			Accounts:      accounts,
			Strategy:      strategy,
			Cycles:        input.Cycles,
			Now:           now,
			LastScheduled: lastScheduled,
		})
		batch, err := tx.CreateTaskBatch(
			ctx,
			strategy,
			input.GroupName,
			input.Cycles,
			drafts,
		)
		if err != nil {
			return err
		}
		result = GenerateResult{Batch: batch, Tasks: len(drafts)}
		return nil
	})
	return result, err
}
