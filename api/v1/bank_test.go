package v1

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
	"github.com/labstack/echo/v4"
)

func TestBankListDoesNotExposeTagsOrLastExec(t *testing.T) {
	db, err := store.NewDB(filepath.Join(t.TempDir(), "test.db"), false)
	if err != nil {
		t.Fatalf("new db: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("get db: %v", err)
	}
	defer func() {
		if closeErr := sqlDB.Close(); closeErr != nil {
			t.Fatalf("close db: %v", closeErr)
		}
	}()
	s := store.New(db)

	userID := "user-1"
	bank := &model.Bank{
		ID:        "bank-1",
		UserID:    userID,
		Name:      "Test Bank",
		AmountMin: 10,
		AmountMax: 20,
		IsActive:  true,
	}
	if err := s.CreateBank(bank); err != nil {
		t.Fatalf("create bank: %v", err)
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/banks", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set("user_id", userID)

	api := NewBankAPI(s)
	if err := api.List(c); err != nil {
		t.Fatalf("list: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status: %d", rec.Code)
	}

	var payload []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(payload) != 1 {
		t.Fatalf("unexpected count: %d", len(payload))
	}
	if _, ok := payload[0]["tags"]; ok {
		t.Fatalf("tags should be absent")
	}
	if _, ok := payload[0]["last_exec_date"]; ok {
		t.Fatalf("last_exec_date should be absent")
	}
}
