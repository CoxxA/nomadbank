package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
)

func (s *Store) ListAccounts(ctx context.Context, activeOnly bool, groupName string) ([]domain.Account, error) {
	query := `SELECT id, name, group_name, active, created_at, updated_at FROM accounts WHERE 1 = 1`
	args := make([]any, 0, 2)
	if activeOnly {
		query += " AND active = 1"
	}
	if groupName != "" {
		query += " AND group_name = ?"
		args = append(args, groupName)
	}
	query += " ORDER BY active DESC, group_name ASC, name COLLATE NOCASE ASC"

	rows, err := s.q.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	// Iteration errors are returned by rows.Err; Close is cleanup only.
	defer func() { _ = rows.Close() }()

	accounts := make([]domain.Account, 0)
	for rows.Next() {
		var account domain.Account
		var active int
		var createdAt, updatedAt int64
		if err := rows.Scan(&account.ID, &account.Name, &account.GroupName, &active, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		account.Active = active == 1
		account.CreatedAt = unixTime(createdAt)
		account.UpdatedAt = unixTime(updatedAt)
		accounts = append(accounts, account)
	}
	return accounts, rows.Err()
}

func (s *Store) GetAccount(ctx context.Context, id int64) (domain.Account, error) {
	var account domain.Account
	var active int
	var createdAt, updatedAt int64
	err := s.q.QueryRowContext(ctx, `
		SELECT id, name, group_name, active, created_at, updated_at FROM accounts WHERE id = ?
	`, id).Scan(&account.ID, &account.Name, &account.GroupName, &active, &createdAt, &updatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Account{}, ErrNotFound
	}
	if err != nil {
		return domain.Account{}, err
	}
	account.Active = active == 1
	account.CreatedAt = unixTime(createdAt)
	account.UpdatedAt = unixTime(updatedAt)
	return account, nil
}

func (s *Store) CreateAccount(ctx context.Context, account *domain.Account) error {
	now := time.Now().UTC().Unix()
	result, err := s.q.ExecContext(ctx, `
		INSERT INTO accounts(name, group_name, active, created_at, updated_at) VALUES(?, ?, ?, ?, ?)
	`, account.Name, account.GroupName, account.Active, now, now)
	if isConstraintError(err) {
		return ErrConflict
	}
	if err != nil {
		return err
	}
	account.ID, err = result.LastInsertId()
	if err != nil {
		return err
	}
	account.CreatedAt = unixTime(now)
	account.UpdatedAt = unixTime(now)
	return nil
}

func (s *Store) UpdateAccount(ctx context.Context, account *domain.Account) error {
	now := time.Now().UTC().Unix()
	result, err := s.q.ExecContext(ctx, `
		UPDATE accounts SET name = ?, group_name = ?, active = ?, updated_at = ? WHERE id = ?
	`, account.Name, account.GroupName, account.Active, now, account.ID)
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
	account.UpdatedAt = unixTime(now)
	return nil
}

func (s *Store) DeleteAccount(ctx context.Context, id int64) error {
	var references int
	if err := s.q.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM tasks WHERE from_account_id = ? OR to_account_id = ?
	`, id, id).Scan(&references); err != nil {
		return err
	}
	if references > 0 {
		return ErrInUse
	}
	result, err := s.q.ExecContext(ctx, "DELETE FROM accounts WHERE id = ?", id)
	if isConstraintError(err) {
		// A task may have been created after the reference check but before the
		// delete when this method is used outside a transaction.
		return ErrInUse
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
	return nil
}
