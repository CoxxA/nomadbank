package tasks

import (
	"testing"
	"time"
)

type stubRand struct {
	intnVals   []int
	floatVals  []float64
	intnIndex  int
	floatIndex int
}

func (s *stubRand) Intn(n int) int {
	v := s.intnVals[s.intnIndex%len(s.intnVals)] % n
	s.intnIndex++
	return v
}

func (s *stubRand) Float64() float64 {
	v := s.floatVals[s.floatIndex%len(s.floatVals)]
	s.floatIndex++
	return v
}

func TestRandomizerAmountPrecision(t *testing.T) {
	r := NewRandomizer(&stubRand{
		intnVals:  []int{0, 1, 2},
		floatVals: []float64{0.5, 0.55, 0.555},
	})

	if got := r.Amount(10, 20); got != 15 {
		t.Fatalf("expected 15, got %v", got)
	}
	if got := r.Amount(10, 20); got != 15.5 {
		t.Fatalf("expected 15.5, got %v", got)
	}
	if got := r.Amount(10, 20); got != 15.55 {
		t.Fatalf("expected 15.55, got %v", got)
	}
}

func TestRandomizerTime(t *testing.T) {
	r := NewRandomizer(&stubRand{
		intnVals:  []int{30},
		floatVals: []float64{0.5},
	})

	base := time.Date(2026, 1, 19, 0, 0, 0, 0, time.Local)
	got := r.Time(base, "09:00", "10:00")
	if got.Hour() != 9 || got.Minute() != 30 {
		t.Fatalf("expected 09:30, got %v", got.Format("15:04"))
	}
}
