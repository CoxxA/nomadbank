package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
)

type TaskFilter struct {
	Status   domain.TaskStatus
	BatchID  int64
	Page     int
	PageSize int
}

func (s *Store) LastScheduledAt(ctx context.Context, groupName string) (*time.Time, error) {
	var value sql.NullInt64
	err := s.q.QueryRowContext(ctx, `
		SELECT MAX(t.scheduled_at)
		FROM tasks t
		JOIN task_batches b ON b.id = t.batch_id
		WHERE b.group_name = ?
	`, groupName).Scan(&value)
	if err != nil {
		return nil, err
	}
	return nullableTime(value), nil
}

func (s *Store) CreateTaskBatch(
	ctx context.Context,
	strategy domain.Strategy,
	groupName string,
	cycleCount int,
	drafts []domain.TaskDraft,
) (domain.TaskBatch, error) {
	now := time.Now().UTC().Unix()
	result, err := s.q.ExecContext(ctx, `
		INSERT INTO task_batches(strategy_id, strategy_name, group_name, cycle_count, created_at)
		VALUES(?, ?, ?, ?, ?)
	`, strategy.ID, strategy.Name, groupName, cycleCount, now)
	if err != nil {
		return domain.TaskBatch{}, err
	}
	batchID, err := result.LastInsertId()
	if err != nil {
		return domain.TaskBatch{}, err
	}

	for _, draft := range drafts {
		_, err := s.q.ExecContext(ctx, `
			INSERT INTO tasks(
				batch_id, cycle_no, scheduled_at, from_account_id, to_account_id,
				amount_cents, status, created_at
			) VALUES(?, ?, ?, ?, ?, ?, 'pending', ?)
		`,
			batchID,
			draft.CycleNo,
			draft.ScheduledAt.UTC().Unix(),
			draft.FromAccountID,
			draft.ToAccountID,
			draft.AmountCents,
			now,
		)
		if err != nil {
			return domain.TaskBatch{}, err
		}
	}

	strategyID := strategy.ID
	return domain.TaskBatch{
		ID:           batchID,
		StrategyID:   &strategyID,
		StrategyName: strategy.Name,
		GroupName:    groupName,
		CycleCount:   cycleCount,
		TaskCount:    len(drafts),
		CreatedAt:    unixTime(now),
	}, nil
}

func (s *Store) ListTaskBatches(ctx context.Context) ([]domain.TaskBatch, error) {
	rows, err := s.q.QueryContext(ctx, `
		SELECT b.id, b.strategy_id, b.strategy_name, b.group_name, b.cycle_count,
		       COUNT(t.id), b.created_at
		FROM task_batches b
		LEFT JOIN tasks t ON t.batch_id = b.id
		GROUP BY b.id
		ORDER BY b.created_at DESC, b.id DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	batches := make([]domain.TaskBatch, 0)
	for rows.Next() {
		var batch domain.TaskBatch
		var strategyID sql.NullInt64
		var createdAt int64
		if err := rows.Scan(
			&batch.ID,
			&strategyID,
			&batch.StrategyName,
			&batch.GroupName,
			&batch.CycleCount,
			&batch.TaskCount,
			&createdAt,
		); err != nil {
			return nil, err
		}
		if strategyID.Valid {
			value := strategyID.Int64
			batch.StrategyID = &value
		}
		batch.CreatedAt = unixTime(createdAt)
		batches = append(batches, batch)
	}
	return batches, rows.Err()
}

func (s *Store) DeleteTaskBatch(ctx context.Context, id int64) error {
	result, err := s.q.ExecContext(ctx, "DELETE FROM task_batches WHERE id = ?", id)
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

func (s *Store) ListTasks(ctx context.Context, filter TaskFilter) (domain.TaskPage, error) {
	where, args := taskWhere(filter)
	var total int64
	if err := s.q.QueryRowContext(ctx, "SELECT COUNT(*) FROM tasks t"+where, args...).Scan(&total); err != nil {
		return domain.TaskPage{}, err
	}

	offset := (filter.Page - 1) * filter.PageSize
	query := `
		SELECT t.id, t.batch_id, t.cycle_no, t.scheduled_at,
		       t.from_account_id, source.name, t.to_account_id, target.name,
		       t.amount_cents, t.status, t.completed_at, t.created_at
		FROM tasks t
		JOIN accounts source ON source.id = t.from_account_id
		JOIN accounts target ON target.id = t.to_account_id
	` + where + " ORDER BY t.scheduled_at ASC, t.id ASC LIMIT ? OFFSET ?"
	args = append(args, filter.PageSize, offset)
	rows, err := s.q.QueryContext(ctx, query, args...)
	if err != nil {
		return domain.TaskPage{}, err
	}
	defer rows.Close()

	items := make([]domain.Task, 0)
	for rows.Next() {
		task, err := scanTask(rows)
		if err != nil {
			return domain.TaskPage{}, err
		}
		items = append(items, task)
	}
	if err := rows.Err(); err != nil {
		return domain.TaskPage{}, err
	}
	return domain.TaskPage{Items: items, Total: total, Page: filter.Page, PageSize: filter.PageSize}, nil
}

func taskWhere(filter TaskFilter) (string, []any) {
	conditions := make([]string, 0, 2)
	args := make([]any, 0, 2)
	if filter.Status != "" {
		conditions = append(conditions, "t.status = ?")
		args = append(args, filter.Status)
	}
	if filter.BatchID > 0 {
		conditions = append(conditions, "t.batch_id = ?")
		args = append(args, filter.BatchID)
	}
	if len(conditions) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(conditions, " AND "), args
}

func (s *Store) GetTask(ctx context.Context, id int64) (domain.Task, error) {
	row := s.q.QueryRowContext(ctx, `
		SELECT t.id, t.batch_id, t.cycle_no, t.scheduled_at,
		       t.from_account_id, source.name, t.to_account_id, target.name,
		       t.amount_cents, t.status, t.completed_at, t.created_at
		FROM tasks t
		JOIN accounts source ON source.id = t.from_account_id
		JOIN accounts target ON target.id = t.to_account_id
		WHERE t.id = ?
	`, id)
	task, err := scanTask(row)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Task{}, ErrNotFound
	}
	return task, err
}

func scanTask(row rowScanner) (domain.Task, error) {
	var task domain.Task
	var status string
	var scheduledAt, createdAt int64
	var completedAt sql.NullInt64
	err := row.Scan(
		&task.ID,
		&task.BatchID,
		&task.CycleNo,
		&scheduledAt,
		&task.FromAccountID,
		&task.FromAccountName,
		&task.ToAccountID,
		&task.ToAccountName,
		&task.AmountCents,
		&status,
		&completedAt,
		&createdAt,
	)
	if err != nil {
		return domain.Task{}, err
	}
	task.Status = domain.TaskStatus(status)
	task.ScheduledAt = unixTime(scheduledAt)
	task.CompletedAt = nullableTime(completedAt)
	task.CreatedAt = unixTime(createdAt)
	return task, nil
}

func (s *Store) CompleteTask(ctx context.Context, id int64, completedAt time.Time) (domain.Task, error) {
	_, err := s.q.ExecContext(ctx, `
		UPDATE tasks
		SET status = 'completed', completed_at = ?
		WHERE id = ? AND status = 'pending'
	`, completedAt.UTC().Unix(), id)
	if err != nil {
		return domain.Task{}, err
	}
	return s.GetTask(ctx, id)
}

func (s *Store) CountTasks(ctx context.Context, status domain.TaskStatus) (int64, error) {
	var count int64
	query := "SELECT COUNT(*) FROM tasks"
	args := make([]any, 0, 1)
	if status != "" {
		query += " WHERE status = ?"
		args = append(args, status)
	}
	if err := s.q.QueryRowContext(ctx, query, args...).Scan(&count); err != nil {
		return 0, fmt.Errorf("统计任务: %w", err)
	}
	return count, nil
}
