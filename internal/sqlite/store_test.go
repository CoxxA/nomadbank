package sqlite

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
)

func TestWithTxRollsBackAfterPanic(t *testing.T) {
	store, err := Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := store.Close(); err != nil {
			t.Errorf("close database: %v", err)
		}
	})

	didPanic := false
	func() {
		defer func() {
			didPanic = recover() != nil
		}()
		_ = store.WithTx(context.Background(), func(tx *Store) error {
			if err := tx.CreateOwner(context.Background(), domain.Owner{
				Username: "owner",
				Timezone: "UTC",
			}, "password-hash"); err != nil {
				t.Fatal(err)
			}
			panic("test panic")
		})
	}()
	if !didPanic {
		t.Fatal("transaction callback did not panic")
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	initialized, err := store.IsInitialized(ctx)
	if err != nil {
		t.Fatalf("database connection remained occupied after panic: %v", err)
	}
	if initialized {
		t.Fatal("panicking transaction was not rolled back")
	}
}
