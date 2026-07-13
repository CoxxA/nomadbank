package sqlite

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"errors"
	"time"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
)

type OwnerCredentials struct {
	Owner        domain.Owner
	PasswordHash string
}

func (s *Store) IsInitialized(ctx context.Context) (bool, error) {
	var count int
	if err := s.q.QueryRowContext(ctx, "SELECT COUNT(*) FROM owner").Scan(&count); err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *Store) CreateOwner(ctx context.Context, owner domain.Owner, passwordHash string) error {
	initialized, err := s.IsInitialized(ctx)
	if err != nil {
		return err
	}
	if initialized {
		return ErrAlreadyInitialized
	}

	now := time.Now().UTC().Unix()
	_, err = s.q.ExecContext(ctx, `
		INSERT INTO owner(id, username, password_hash, display_name, timezone, created_at, updated_at)
		VALUES(1, ?, ?, ?, ?, ?, ?)
	`, owner.Username, passwordHash, owner.DisplayName, owner.Timezone, now, now)
	if isConstraintError(err) {
		return ErrConflict
	}
	return err
}

func (s *Store) OwnerCredentials(ctx context.Context) (OwnerCredentials, error) {
	var result OwnerCredentials
	err := s.q.QueryRowContext(ctx, `
		SELECT username, display_name, timezone, password_hash
		FROM owner WHERE id = 1
	`).Scan(
		&result.Owner.Username,
		&result.Owner.DisplayName,
		&result.Owner.Timezone,
		&result.PasswordHash,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return OwnerCredentials{}, ErrNotFound
	}
	return result, err
}

func (s *Store) UpdateOwnerPassword(ctx context.Context, passwordHash string) error {
	result, err := s.q.ExecContext(ctx, `
		UPDATE owner SET password_hash = ?, updated_at = ? WHERE id = 1
	`, passwordHash, time.Now().UTC().Unix())
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

func (s *Store) UpdateOwner(ctx context.Context, owner domain.Owner) error {
	result, err := s.q.ExecContext(ctx, `
		UPDATE owner SET display_name = ?, timezone = ?, updated_at = ? WHERE id = 1
	`, owner.DisplayName, owner.Timezone, time.Now().UTC().Unix())
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

func (s *Store) CreateSession(ctx context.Context, rawToken string, expiresAt time.Time) error {
	hash := sha256.Sum256([]byte(rawToken))
	now := time.Now().UTC().Unix()
	_, err := s.q.ExecContext(ctx, `
		INSERT INTO sessions(token_hash, expires_at, created_at) VALUES(?, ?, ?)
	`, hash[:], expiresAt.UTC().Unix(), now)
	return err
}

func (s *Store) SessionValid(ctx context.Context, rawToken string, now time.Time) (bool, error) {
	hash := sha256.Sum256([]byte(rawToken))
	var count int
	err := s.q.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM sessions WHERE token_hash = ? AND expires_at > ?
	`, hash[:], now.UTC().Unix()).Scan(&count)
	return count > 0, err
}

func (s *Store) DeleteSession(ctx context.Context, rawToken string) error {
	hash := sha256.Sum256([]byte(rawToken))
	_, err := s.q.ExecContext(ctx, "DELETE FROM sessions WHERE token_hash = ?", hash[:])
	return err
}

func (s *Store) DeleteAllSessions(ctx context.Context) error {
	_, err := s.q.ExecContext(ctx, "DELETE FROM sessions")
	return err
}

func (s *Store) DeleteExpiredSessions(ctx context.Context, now time.Time) error {
	_, err := s.q.ExecContext(ctx, "DELETE FROM sessions WHERE expires_at <= ?", now.UTC().Unix())
	return err
}
