package auth

import (
	"errors"
	"strings"
	"testing"
)

func TestValidPasswordUsesRuneMinimumAndByteMaximum(t *testing.T) {
	tests := []struct {
		name     string
		password string
		valid    bool
	}{
		{name: "nine ASCII characters", password: "123456789", valid: false},
		{name: "ten ASCII characters", password: "1234567890", valid: true},
		{name: "nine Chinese characters", password: strings.Repeat("密", 9), valid: false},
		{name: "ten Chinese characters", password: strings.Repeat("密", 10), valid: true},
		{name: "more than 72 UTF-8 bytes", password: strings.Repeat("密", 25), valid: false},
		{name: "72 ASCII bytes", password: strings.Repeat("a", 72), valid: true},
		{name: "73 ASCII bytes", password: strings.Repeat("a", 73), valid: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := validPassword(test.password); got != test.valid {
				t.Fatalf("validPassword() = %t, want %t", got, test.valid)
			}
		})
	}
}

func TestValidateSetupRejectsLongDisplayName(t *testing.T) {
	_, err := validateSetup(SetupInput{
		Username:    "owner",
		Password:    "1234567890",
		DisplayName: strings.Repeat("名", 81),
		Timezone:    "UTC",
	})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}
}
