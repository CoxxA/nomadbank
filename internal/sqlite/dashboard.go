package sqlite

import (
	"context"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
)

func (s *Store) Dashboard(ctx context.Context) (domain.Dashboard, error) {
	var dashboard domain.Dashboard
	queries := []struct {
		query string
		value *int64
	}{
		{"SELECT COUNT(*) FROM accounts", &dashboard.TotalAccounts},
		{"SELECT COUNT(*) FROM accounts WHERE active = 1", &dashboard.ActiveAccounts},
		{"SELECT COUNT(*) FROM tasks WHERE status = 'pending'", &dashboard.PendingTasks},
		{"SELECT COUNT(*) FROM tasks WHERE status = 'completed'", &dashboard.CompletedTasks},
		{"SELECT COUNT(*) FROM strategies", &dashboard.Strategies},
	}
	for _, item := range queries {
		if err := s.q.QueryRowContext(ctx, item.query).Scan(item.value); err != nil {
			return domain.Dashboard{}, err
		}
	}

	upcoming, err := s.listDashboardTasks(ctx, "pending", "t.scheduled_at ASC", 8)
	if err != nil {
		return domain.Dashboard{}, err
	}
	recent, err := s.listDashboardTasks(ctx, "completed", "t.completed_at DESC", 5)
	if err != nil {
		return domain.Dashboard{}, err
	}
	dashboard.Upcoming = upcoming
	dashboard.Recent = recent
	return dashboard, nil
}

func (s *Store) listDashboardTasks(ctx context.Context, status, order string, limit int) ([]domain.Task, error) {
	query := `
		SELECT t.id, t.batch_id, t.cycle_no, t.scheduled_at,
		       t.from_account_id, source.name, t.to_account_id, target.name,
		       t.amount_cents, t.status, t.completed_at, t.created_at
		FROM tasks t
		JOIN accounts source ON source.id = t.from_account_id
		JOIN accounts target ON target.id = t.to_account_id
		WHERE t.status = ?
		ORDER BY ` + order + ` LIMIT ?
	`
	rows, err := s.q.QueryContext(ctx, query, status, limit)
	if err != nil {
		return nil, err
	}
	// Iteration errors are returned by rows.Err; Close is cleanup only.
	defer func() { _ = rows.Close() }()

	tasks := make([]domain.Task, 0)
	for rows.Next() {
		task, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}
	return tasks, rows.Err()
}
