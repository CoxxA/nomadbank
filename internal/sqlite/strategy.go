package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
)

func (s *Store) ListStrategies(ctx context.Context) ([]domain.Strategy, error) {
	rows, err := s.q.QueryContext(ctx, `
		SELECT id, name, interval_min_days, interval_max_days,
		       time_start_minutes, time_end_minutes, skip_weekends,
		       amount_min_cents, amount_max_cents, daily_limit, created_at, updated_at
		FROM strategies ORDER BY name COLLATE NOCASE ASC
	`)
	if err != nil {
		return nil, err
	}
	// Iteration errors are returned by rows.Err; Close is cleanup only.
	defer func() { _ = rows.Close() }()

	strategies := make([]domain.Strategy, 0)
	for rows.Next() {
		strategy, err := scanStrategy(rows)
		if err != nil {
			return nil, err
		}
		strategies = append(strategies, strategy)
	}
	return strategies, rows.Err()
}

func (s *Store) GetStrategy(ctx context.Context, id int64) (domain.Strategy, error) {
	row := s.q.QueryRowContext(ctx, `
		SELECT id, name, interval_min_days, interval_max_days,
		       time_start_minutes, time_end_minutes, skip_weekends,
		       amount_min_cents, amount_max_cents, daily_limit, created_at, updated_at
		FROM strategies WHERE id = ?
	`, id)
	strategy, err := scanStrategy(row)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Strategy{}, ErrNotFound
	}
	return strategy, err
}

type rowScanner interface {
	Scan(...any) error
}

func scanStrategy(row rowScanner) (domain.Strategy, error) {
	var strategy domain.Strategy
	var skipWeekends int
	var createdAt, updatedAt int64
	err := row.Scan(
		&strategy.ID,
		&strategy.Name,
		&strategy.IntervalMinDays,
		&strategy.IntervalMaxDays,
		&strategy.TimeStartMinutes,
		&strategy.TimeEndMinutes,
		&skipWeekends,
		&strategy.AmountMinCents,
		&strategy.AmountMaxCents,
		&strategy.DailyLimit,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return domain.Strategy{}, err
	}
	strategy.SkipWeekends = skipWeekends == 1
	strategy.CreatedAt = unixTime(createdAt)
	strategy.UpdatedAt = unixTime(updatedAt)
	return strategy, nil
}

func (s *Store) CreateStrategy(ctx context.Context, strategy *domain.Strategy) error {
	now := time.Now().UTC().Unix()
	result, err := s.q.ExecContext(ctx, `
		INSERT INTO strategies(
			name, interval_min_days, interval_max_days, time_start_minutes,
			time_end_minutes, skip_weekends, amount_min_cents, amount_max_cents,
			daily_limit, created_at, updated_at
		) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		strategy.Name,
		strategy.IntervalMinDays,
		strategy.IntervalMaxDays,
		strategy.TimeStartMinutes,
		strategy.TimeEndMinutes,
		strategy.SkipWeekends,
		strategy.AmountMinCents,
		strategy.AmountMaxCents,
		strategy.DailyLimit,
		now,
		now,
	)
	if isConstraintError(err) {
		return ErrConflict
	}
	if err != nil {
		return err
	}
	strategy.ID, err = result.LastInsertId()
	if err != nil {
		return err
	}
	strategy.CreatedAt = unixTime(now)
	strategy.UpdatedAt = unixTime(now)
	return nil
}

func (s *Store) UpdateStrategy(ctx context.Context, strategy *domain.Strategy) error {
	now := time.Now().UTC().Unix()
	result, err := s.q.ExecContext(ctx, `
		UPDATE strategies SET
			name = ?, interval_min_days = ?, interval_max_days = ?,
			time_start_minutes = ?, time_end_minutes = ?, skip_weekends = ?,
			amount_min_cents = ?, amount_max_cents = ?, daily_limit = ?, updated_at = ?
		WHERE id = ?
	`,
		strategy.Name,
		strategy.IntervalMinDays,
		strategy.IntervalMaxDays,
		strategy.TimeStartMinutes,
		strategy.TimeEndMinutes,
		strategy.SkipWeekends,
		strategy.AmountMinCents,
		strategy.AmountMaxCents,
		strategy.DailyLimit,
		now,
		strategy.ID,
	)
	if isConstraintError(err) {
		return ErrConflict
	}
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrNotFound
	}
	strategy.UpdatedAt = unixTime(now)
	return nil
}

func (s *Store) DeleteStrategy(ctx context.Context, id int64) error {
	result, err := s.q.ExecContext(ctx, "DELETE FROM strategies WHERE id = ?", id)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrNotFound
	}
	return nil
}
