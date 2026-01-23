package v1

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/CoxxA/nomadbank/store"
	"github.com/CoxxA/nomadbank/store/model"
	"github.com/labstack/echo/v4"
)

func TestTaskListPagedShape(t *testing.T) {
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
	task := &model.TransferTask{
		ID:       "task-1",
		UserID:   userID,
		Cycle:    1,
		ExecDate: time.Now(),
		Status:   model.TaskStatusPending,
	}
	if err := s.CreateTask(task); err != nil {
		t.Fatalf("create task: %v", err)
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks?page=1&page_size=10", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set("user_id", userID)

	api := NewTaskAPI(s)
	if err := api.List(c); err != nil {
		t.Fatalf("list: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status: %d", rec.Code)
	}

	var payload PageResult[map[string]any]
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if payload.Total != 1 || len(payload.Items) != 1 {
		t.Fatalf("unexpected items: %d", len(payload.Items))
	}
}

func TestTaskCyclesEndpoint(t *testing.T) {
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
	task := &model.TransferTask{
		ID:       "task-2",
		UserID:   userID,
		Cycle:    2,
		ExecDate: time.Now(),
		Status:   model.TaskStatusPending,
	}
	if err := s.CreateTask(task); err != nil {
		t.Fatalf("create task: %v", err)
	}

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/cycles", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.Set("user_id", userID)

	api := NewTaskAPI(s)
	if err := api.Cycles(c); err != nil {
		t.Fatalf("cycles: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status: %d", rec.Code)
	}

	var payload struct {
		Cycles []int `json:"cycles"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(payload.Cycles) != 1 || payload.Cycles[0] != 2 {
		t.Fatalf("unexpected cycles: %+v", payload.Cycles)
	}
}
