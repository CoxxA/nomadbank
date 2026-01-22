package tasks

import (
    "math/rand"
    "time"
)

type Rand interface {
    Intn(n int) int
    Float64() float64
}

type Randomizer interface {
    IntervalDays(min, max int) int
    Amount(min, max float64) float64
    Time(date time.Time, startTime, endTime string) time.Time
}

type randomizer struct {
    rng Rand
}

func NewRandomizer(rng Rand) Randomizer {
    return &randomizer{rng: rng}
}

func NewDefaultRandomizer() Randomizer {
    return NewRandomizer(rand.New(rand.NewSource(time.Now().UnixNano())))
}

func (r *randomizer) IntervalDays(min, max int) int {
    if max < min {
        max = min
    }
    return min + r.rng.Intn(max-min+1)
}

func (r *randomizer) Amount(min, max float64) float64 {
    base := min + r.rng.Float64()*(max-min)
    precision := r.rng.Intn(3)
    switch precision {
    case 0:
        return float64(int(base))
    case 1:
        return float64(int(base*10)) / 10
    default:
        return float64(int(base*100)) / 100
    }
}

func (r *randomizer) Time(date time.Time, startTime, endTime string) time.Time {
    startHour, startMin := parseTime(startTime)
    endHour, endMin := parseTime(endTime)

    startMinutes := startHour*60 + startMin
    endMinutes := endHour*60 + endMin

    if endMinutes <= startMinutes {
        endMinutes = startMinutes + 60
    }

    randomMinutes := startMinutes + r.rng.Intn(endMinutes-startMinutes)
    hour := randomMinutes / 60
    minute := randomMinutes % 60

    return time.Date(date.Year(), date.Month(), date.Day(), hour, minute, r.rng.Intn(60), 0, date.Location())
}

func parseTime(timeStr string) (int, int) {
    hour, minute := 9, 0
    if len(timeStr) >= 5 {
        h, m := 0, 0
        if _, err := parseTimeFormat(timeStr, &h, &m); err == nil {
            hour, minute = h, m
        }
    }
    return hour, minute
}

func parseTimeFormat(s string, hour, minute *int) (bool, error) {
    t, err := time.Parse("15:04", s)
    if err != nil {
        return false, err
    }
    *hour = t.Hour()
    *minute = t.Minute()
    return true, nil
}
