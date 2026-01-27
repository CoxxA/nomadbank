package tasks

import (
	"math/rand"

	"github.com/CoxxA/nomadbank/store/model"
)

type transferPair struct {
	from model.Bank
	to   model.Bank
}

func GenerateBalancedPairs(banks []model.Bank) []transferPair {
	n := len(banks)
	if n < 2 {
		return nil
	}

	shuffled := make([]model.Bank, n)
	copy(shuffled, banks)
	rand.Shuffle(n, func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	var pairs []transferPair

	for i := 0; i < n-1; i += 2 {
		pairs = append(pairs, transferPair{from: shuffled[i], to: shuffled[i+1]})
	}

	for i := 1; i < n; i += 2 {
		nextIdx := (i + 1) % n
		pairs = append(pairs, transferPair{from: shuffled[i], to: shuffled[nextIdx]})
	}

	if n%2 == 1 {
		pairs = append(pairs, transferPair{from: shuffled[n-1], to: shuffled[0]})
		pairs = append(pairs, transferPair{from: shuffled[n-2], to: shuffled[n-1]})
	}

	return pairs
}
