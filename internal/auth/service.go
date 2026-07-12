package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"

	"github.com/CoxxA/nomadbank/v2/internal/domain"
	"github.com/CoxxA/nomadbank/v2/internal/sqlite"
)

var (
	ErrInvalidCredentials = errors.New("用户名或密码错误")
	ErrInvalidSession     = errors.New("会话无效或已过期")
	ErrInvalidInput       = errors.New("输入不符合要求")
)

const (
	minimumPasswordRunes = 10
	maximumPasswordBytes = 72
)

type SetupInput struct {
	Username    string
	Password    string
	DisplayName string
	Timezone    string
}

type Session struct {
	Token     string
	ExpiresAt time.Time
	Owner     domain.Owner
}

type Service struct {
	store       *sqlite.Store
	sessionDays int
	now         func() time.Time
}

func NewService(store *sqlite.Store, sessionDays int) *Service {
	if sessionDays <= 0 {
		sessionDays = 30
	}
	return &Service{store: store, sessionDays: sessionDays, now: time.Now}
}

func (s *Service) Setup(ctx context.Context, input SetupInput) (Session, error) {
	owner, err := validateSetup(input)
	if err != nil {
		return Session{}, err
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return Session{}, err
	}

	err = s.store.WithTx(ctx, func(tx *sqlite.Store) error {
		if err := tx.CreateOwner(ctx, owner, string(passwordHash)); err != nil {
			return err
		}
		defaultStrategy := domain.Strategy{
			Name:             "默认保活",
			IntervalMinDays:  30,
			IntervalMaxDays:  60,
			TimeStartMinutes: 9 * 60,
			TimeEndMinutes:   21 * 60,
			SkipWeekends:     false,
			AmountMinCents:   1000,
			AmountMaxCents:   3000,
			DailyLimit:       3,
		}
		return tx.CreateStrategy(ctx, &defaultStrategy)
	})
	if err != nil {
		return Session{}, err
	}
	return s.createSession(ctx, owner)
}

func (s *Service) Login(ctx context.Context, username, password string) (Session, error) {
	credentials, err := s.store.OwnerCredentials(ctx)
	if err != nil {
		if errors.Is(err, sqlite.ErrNotFound) {
			return Session{}, ErrInvalidCredentials
		}
		return Session{}, err
	}
	if credentials.Owner.Username != strings.TrimSpace(username) {
		return Session{}, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(credentials.PasswordHash), []byte(password)); err != nil {
		return Session{}, ErrInvalidCredentials
	}
	return s.createSession(ctx, credentials.Owner)
}

func (s *Service) Authenticate(ctx context.Context, token string) (domain.Owner, error) {
	if token == "" {
		return domain.Owner{}, ErrInvalidSession
	}
	valid, err := s.store.SessionValid(ctx, token, s.now())
	if err != nil {
		return domain.Owner{}, err
	}
	if !valid {
		return domain.Owner{}, ErrInvalidSession
	}
	credentials, err := s.store.OwnerCredentials(ctx)
	if err != nil {
		return domain.Owner{}, err
	}
	return credentials.Owner, nil
}

func (s *Service) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return s.store.DeleteSession(ctx, token)
}

func (s *Service) ChangePassword(
	ctx context.Context,
	currentPassword string,
	newPassword string,
) (Session, error) {
	if !validPassword(newPassword) {
		return Session{}, ErrInvalidInput
	}
	credentials, err := s.store.OwnerCredentials(ctx)
	if err != nil {
		return Session{}, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(credentials.PasswordHash), []byte(currentPassword)); err != nil {
		return Session{}, ErrInvalidCredentials
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return Session{}, err
	}

	err = s.store.WithTx(ctx, func(tx *sqlite.Store) error {
		if err := tx.UpdateOwnerPassword(ctx, string(passwordHash)); err != nil {
			return err
		}
		return tx.DeleteAllSessions(ctx)
	})
	if err != nil {
		return Session{}, err
	}
	return s.createSession(ctx, credentials.Owner)
}

func (s *Service) createSession(ctx context.Context, owner domain.Owner) (Session, error) {
	if err := s.store.DeleteExpiredSessions(ctx, s.now()); err != nil {
		return Session{}, err
	}
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return Session{}, err
	}
	token := base64.RawURLEncoding.EncodeToString(bytes)
	expiresAt := s.now().UTC().AddDate(0, 0, s.sessionDays)
	if err := s.store.CreateSession(ctx, token, expiresAt); err != nil {
		return Session{}, err
	}
	return Session{Token: token, ExpiresAt: expiresAt, Owner: owner}, nil
}

func validateSetup(input SetupInput) (domain.Owner, error) {
	username := strings.TrimSpace(input.Username)
	displayName := strings.TrimSpace(input.DisplayName)
	timezone := strings.TrimSpace(input.Timezone)
	if timezone == "" {
		timezone = "Asia/Shanghai"
	}
	if utf8.RuneCountInString(username) < 3 || utf8.RuneCountInString(username) > 40 {
		return domain.Owner{}, ErrInvalidInput
	}
	if !validPassword(input.Password) {
		return domain.Owner{}, ErrInvalidInput
	}
	if utf8.RuneCountInString(displayName) > domain.MaxDisplayNameRunes {
		return domain.Owner{}, ErrInvalidInput
	}
	if _, err := time.LoadLocation(timezone); err != nil {
		return domain.Owner{}, ErrInvalidInput
	}
	return domain.Owner{Username: username, DisplayName: displayName, Timezone: timezone}, nil
}

func validPassword(password string) bool {
	return utf8.RuneCountInString(password) >= minimumPasswordRunes &&
		len([]byte(password)) <= maximumPasswordBytes
}
