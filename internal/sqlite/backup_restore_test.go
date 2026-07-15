package sqlite_test

import (
	"context"
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"github.com/CoxxA/nomadbank/v2/internal/auth"
	"github.com/CoxxA/nomadbank/v2/internal/domain"
	"github.com/CoxxA/nomadbank/v2/internal/sqlite"
)

func TestOfflineDataDirectoryBackupAndRestore(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	testRoot := t.TempDir()
	sourceDataDir := filepath.Join(testRoot, "source-data")
	databaseName := "nomadbank-v2.db"

	sourceStore, err := sqlite.Open(filepath.Join(sourceDataDir, databaseName))
	if err != nil {
		t.Fatalf("open source database: %v", err)
	}
	sourceStoreOpen := true
	t.Cleanup(func() {
		if sourceStoreOpen {
			if err := sourceStore.Close(); err != nil {
				t.Errorf("close source database: %v", err)
			}
		}
	})

	setupInput := auth.SetupInput{
		Username:    "backup-owner",
		Password:    "backup-test-password",
		DisplayName: "Backup Owner",
		Timezone:    "Asia/Shanghai",
	}
	setupSession, err := auth.NewService(sourceStore, 30).Setup(ctx, setupInput)
	if err != nil {
		t.Fatalf("set up owner: %v", err)
	}

	accounts := []domain.Account{
		{Name: "Daily Checking", GroupName: "Personal", Active: true},
		{Name: "Reserve Savings", GroupName: "Personal", Active: true},
	}
	for index := range accounts {
		if err := sourceStore.CreateAccount(ctx, &accounts[index]); err != nil {
			t.Fatalf("create account %q: %v", accounts[index].Name, err)
		}
	}

	strategy := domain.Strategy{
		Name:             "Backup Test Strategy",
		IntervalMinDays:  14,
		IntervalMaxDays:  28,
		TimeStartMinutes: 8 * 60,
		TimeEndMinutes:   20 * 60,
		SkipWeekends:     true,
		AmountMinCents:   1200,
		AmountMaxCents:   3600,
		DailyLimit:       2,
	}
	if err := sourceStore.CreateStrategy(ctx, &strategy); err != nil {
		t.Fatalf("create strategy: %v", err)
	}

	scheduledAt := time.Date(2026, time.July, 20, 10, 30, 0, 0, time.UTC)
	batch, err := sourceStore.CreateTaskBatch(ctx, strategy, "Personal", 2, []domain.TaskDraft{
		{
			CycleNo:       1,
			ScheduledAt:   scheduledAt,
			FromAccountID: accounts[0].ID,
			ToAccountID:   accounts[1].ID,
			AmountCents:   1800,
		},
		{
			CycleNo:       2,
			ScheduledAt:   scheduledAt.Add(21 * 24 * time.Hour),
			FromAccountID: accounts[1].ID,
			ToAccountID:   accounts[0].ID,
			AmountCents:   2400,
		},
	})
	if err != nil {
		t.Fatalf("create task batch: %v", err)
	}

	sourceTasks, err := sourceStore.ListTasks(ctx, sqlite.TaskFilter{
		BatchID:  batch.ID,
		Page:     1,
		PageSize: 100,
	})
	if err != nil {
		t.Fatalf("list source tasks: %v", err)
	}
	if len(sourceTasks.Items) != 2 {
		t.Fatalf("source task count = %d, want 2", len(sourceTasks.Items))
	}
	completedAt := time.Date(2026, time.July, 21, 9, 45, 0, 0, time.UTC)
	if _, err := sourceStore.CompleteTask(ctx, sourceTasks.Items[0].ID, completedAt); err != nil {
		t.Fatalf("complete task: %v", err)
	}

	sourceAccounts, err := sourceStore.ListAccounts(ctx, false, "")
	if err != nil {
		t.Fatalf("snapshot accounts: %v", err)
	}
	sourceStrategies, err := sourceStore.ListStrategies(ctx)
	if err != nil {
		t.Fatalf("snapshot strategies: %v", err)
	}
	sourceBatches, err := sourceStore.ListTaskBatches(ctx)
	if err != nil {
		t.Fatalf("snapshot task batches: %v", err)
	}
	sourceTasks, err = sourceStore.ListTasks(ctx, sqlite.TaskFilter{
		BatchID:  batch.ID,
		Page:     1,
		PageSize: 100,
	})
	if err != nil {
		t.Fatalf("snapshot tasks: %v", err)
	}
	if sourceTasks.Items[0].Status != domain.TaskStatusCompleted {
		t.Fatalf("completed task status = %q, want %q", sourceTasks.Items[0].Status, domain.TaskStatusCompleted)
	}
	if sourceTasks.Items[0].CompletedAt == nil || !sourceTasks.Items[0].CompletedAt.Equal(completedAt) {
		t.Fatalf("completed task time = %v, want %v", sourceTasks.Items[0].CompletedAt, completedAt)
	}
	if sourceTasks.Items[1].Status != domain.TaskStatusPending || sourceTasks.Items[1].CompletedAt != nil {
		t.Fatalf("pending task was not preserved in its initial state: %+v", sourceTasks.Items[1])
	}

	if err := sourceStore.Close(); err != nil {
		t.Fatalf("close source database before backup: %v", err)
	}
	sourceStoreOpen = false

	backupDataDir := filepath.Join(testRoot, "backup")
	if err := os.CopyFS(backupDataDir, os.DirFS(sourceDataDir)); err != nil {
		t.Fatalf("copy source data directory to backup: %v", err)
	}
	restoredDataDir := filepath.Join(testRoot, "restored-data")
	if err := os.CopyFS(restoredDataDir, os.DirFS(backupDataDir)); err != nil {
		t.Fatalf("restore backup into a new data directory: %v", err)
	}

	restoredStore, err := sqlite.Open(filepath.Join(restoredDataDir, databaseName))
	if err != nil {
		t.Fatalf("open restored database: %v", err)
	}
	t.Cleanup(func() {
		if err := restoredStore.Close(); err != nil {
			t.Errorf("close restored database: %v", err)
		}
	})

	restoredSession, err := auth.NewService(restoredStore, 30).Login(
		ctx,
		setupInput.Username,
		setupInput.Password,
	)
	if err != nil {
		t.Fatalf("log in with restored credentials: %v", err)
	}
	if !reflect.DeepEqual(restoredSession.Owner, setupSession.Owner) {
		t.Fatalf("restored owner = %+v, want %+v", restoredSession.Owner, setupSession.Owner)
	}

	restoredAccounts, err := restoredStore.ListAccounts(ctx, false, "")
	if err != nil {
		t.Fatalf("list restored accounts: %v", err)
	}
	if !reflect.DeepEqual(restoredAccounts, sourceAccounts) {
		t.Fatalf("restored accounts = %+v, want %+v", restoredAccounts, sourceAccounts)
	}

	restoredStrategies, err := restoredStore.ListStrategies(ctx)
	if err != nil {
		t.Fatalf("list restored strategies: %v", err)
	}
	if !reflect.DeepEqual(restoredStrategies, sourceStrategies) {
		t.Fatalf("restored strategies = %+v, want %+v", restoredStrategies, sourceStrategies)
	}

	restoredBatches, err := restoredStore.ListTaskBatches(ctx)
	if err != nil {
		t.Fatalf("list restored task batches: %v", err)
	}
	if !reflect.DeepEqual(restoredBatches, sourceBatches) {
		t.Fatalf("restored task batches = %+v, want %+v", restoredBatches, sourceBatches)
	}

	restoredTasks, err := restoredStore.ListTasks(ctx, sqlite.TaskFilter{
		BatchID:  batch.ID,
		Page:     1,
		PageSize: 100,
	})
	if err != nil {
		t.Fatalf("list restored tasks: %v", err)
	}
	if !reflect.DeepEqual(restoredTasks, sourceTasks) {
		t.Fatalf("restored tasks = %+v, want %+v", restoredTasks, sourceTasks)
	}
}
