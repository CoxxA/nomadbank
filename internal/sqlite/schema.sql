PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL
);

INSERT OR IGNORE INTO schema_meta(id, version) VALUES(1, 1);

CREATE TABLE IF NOT EXISTS owner (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash BLOB PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    group_name TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_group_active ON accounts(group_name, active);

CREATE TABLE IF NOT EXISTS strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    interval_min_days INTEGER NOT NULL CHECK (interval_min_days > 0),
    interval_max_days INTEGER NOT NULL CHECK (interval_max_days >= interval_min_days),
    time_start_minutes INTEGER NOT NULL CHECK (time_start_minutes BETWEEN 0 AND 1439),
    time_end_minutes INTEGER NOT NULL CHECK (time_end_minutes BETWEEN 1 AND 1440),
    skip_weekends INTEGER NOT NULL CHECK (skip_weekends IN (0, 1)),
    amount_min_cents INTEGER NOT NULL CHECK (amount_min_cents > 0),
    amount_max_cents INTEGER NOT NULL CHECK (amount_max_cents >= amount_min_cents),
    daily_limit INTEGER NOT NULL CHECK (daily_limit > 0),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK (time_end_minutes > time_start_minutes)
);

CREATE TABLE IF NOT EXISTS task_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy_id INTEGER,
    strategy_name TEXT NOT NULL,
    group_name TEXT NOT NULL DEFAULT '',
    cycle_count INTEGER NOT NULL CHECK (cycle_count > 0),
    created_at INTEGER NOT NULL,
    FOREIGN KEY(strategy_id) REFERENCES strategies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    cycle_no INTEGER NOT NULL CHECK (cycle_no > 0),
    scheduled_at INTEGER NOT NULL,
    from_account_id INTEGER NOT NULL,
    to_account_id INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    CHECK (from_account_id <> to_account_id),
    FOREIGN KEY(batch_id) REFERENCES task_batches(id) ON DELETE CASCADE,
    FOREIGN KEY(from_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY(to_account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_tasks_status_scheduled ON tasks(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_tasks_batch_cycle ON tasks(batch_id, cycle_no);
