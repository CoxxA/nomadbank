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
