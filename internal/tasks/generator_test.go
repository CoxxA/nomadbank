package tasks

import (
	"testing"

	"github.com/CoxxA/nomadbank/store/model"
)

func TestGenerateBalancedPairsEven(t *testing.T) {
	banks := []model.Bank{{ID: "A"}, {ID: "B"}, {ID: "C"}, {ID: "D"}}
	pairs := GenerateBalancedPairs(banks)
	if len(pairs) != 4 {
		t.Fatalf("expected 4 pairs, got %d", len(pairs))
	}
	assertInOutCoverage(t, banks, pairs)
}

func TestGenerateBalancedPairsOdd(t *testing.T) {
	banks := []model.Bank{{ID: "A"}, {ID: "B"}, {ID: "C"}}
	pairs := GenerateBalancedPairs(banks)
	if len(pairs) != 4 {
		t.Fatalf("expected 4 pairs, got %d", len(pairs))
	}
	assertInOutCoverage(t, banks, pairs)
}

func TestGenerateBalancedPairsSmall(t *testing.T) {
	banks := []model.Bank{{ID: "A"}}
	if got := GenerateBalancedPairs(banks); got != nil {
		t.Fatalf("expected nil, got %v", got)
	}
}

func assertInOutCoverage(t *testing.T, banks []model.Bank, pairs []transferPair) {
	t.Helper()
	in := map[string]bool{}
	out := map[string]bool{}
	for _, p := range pairs {
		out[p.from.ID] = true
		in[p.to.ID] = true
	}
	for _, b := range banks {
		if !in[b.ID] || !out[b.ID] {
			t.Fatalf("bank %s missing in/out coverage", b.ID)
		}
	}
}
