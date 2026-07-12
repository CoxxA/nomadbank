package sqlite

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

var (
	ErrNotFound           = errors.New("记录不存在")
	ErrAlreadyInitialized = errors.New("应用已经初始化")
	ErrConflict           = errors.New("数据冲突")
	ErrInUse              = errors.New("记录正在被使用")
)

//go:embed schema.sql
var schemaFS embed.FS

type queryer interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

type Store struct {
	db *sql.DB
	q  queryer
}

func Open(path string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, fmt.Errorf("创建数据目录: %w", err)
	}

	dsn := fmt.Sprintf(
		"file:%s?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)",
		filepath.ToSlash(path),
	)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("打开数据库: %w", err)
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	store := &Store{db: db, q: db}
	if err := store.initialize(context.Background()); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *Store) initialize(ctx context.Context) error {
	schema, err := schemaFS.ReadFile("schema.sql")
	if err != nil {
		return fmt.Errorf("读取数据库结构: %w", err)
	}
	if _, err := s.db.ExecContext(ctx, string(schema)); err != nil {
		return fmt.Errorf("初始化数据库结构: %w", err)
	}

	var version int
	if err := s.db.QueryRowContext(ctx, "SELECT version FROM schema_meta WHERE id = 1").Scan(&version); err != nil {
		return fmt.Errorf("读取数据库版本: %w", err)
	}
	if version != 1 {
		return fmt.Errorf("不支持的数据库版本: %d", version)
	}
	return nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) Ping(ctx context.Context) error {
	return s.db.PingContext(ctx)
}

func (s *Store) WithTx(ctx context.Context, fn func(*Store) error) error {
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return err
	}
	// Rollback is intentionally deferred so a panic in fn cannot leave the
	// single SQLite connection occupied by an open transaction. After Commit,
	// Rollback returns sql.ErrTxDone and is harmless.
	defer func() {
		_ = tx.Rollback()
	}()

	txStore := &Store{db: s.db, q: tx}
	if err := fn(txStore); err != nil {
		return err
	}
	return tx.Commit()
}

func unixTime(value int64) time.Time {
	return time.Unix(value, 0).UTC()
}

func nullableTime(value sql.NullInt64) *time.Time {
	if !value.Valid {
		return nil
	}
	parsed := unixTime(value.Int64)
	return &parsed
}

func isConstraintError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "constraint failed") || strings.Contains(message, "unique constraint")
}
