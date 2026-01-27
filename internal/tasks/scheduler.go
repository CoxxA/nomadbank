package tasks

import (
	"sort"
	"time"

	"github.com/google/uuid"

	"github.com/CoxxA/nomadbank/store/model"
)

func ScheduleTasks(userID, groupName string, cycle int, pairs []transferPair, baseDate time.Time, strategy *model.Strategy, randomizer Randomizer) []model.TransferTask {
	var tasks []model.TransferTask

	bankDayDirection := make(map[string]string)
	directFlowDate := make(map[string]time.Time)

	currentDate := baseDate
	dailyCount := 0

	for _, pair := range pairs {
		needNewDay := false

		if dailyCount >= strategy.DailyLimit {
			needNewDay = true
		}

		fromKey := pair.from.ID + ":" + currentDate.Format("2006-01-02")
		toKey := pair.to.ID + ":" + currentDate.Format("2006-01-02")

		if dir, exists := bankDayDirection[fromKey]; exists && dir == "in" {
			needNewDay = true
		}
		if dir, exists := bankDayDirection[toKey]; exists && dir == "out" {
			needNewDay = true
		}

		reverseKey := pair.to.ID + "->" + pair.from.ID
		if lastDate, exists := directFlowDate[reverseKey]; exists {
			minDate := lastDate.AddDate(0, 0, 3)
			if currentDate.Before(minDate) {
				currentDate = minDate
				dailyCount = 0
				bankDayDirection = clearDayRecords(bankDayDirection, currentDate)
			}
		}

		if needNewDay {
			currentDate = currentDate.AddDate(0, 0, 1)
			dailyCount = 0
		}

		if strategy.SkipWeekend {
			currentDate = skipWeekend(currentDate)
		}

		fromKey = pair.from.ID + ":" + currentDate.Format("2006-01-02")
		toKey = pair.to.ID + ":" + currentDate.Format("2006-01-02")
		bankDayDirection[fromKey] = "out"
		bankDayDirection[toKey] = "in"

		flowKey := pair.from.ID + "->" + pair.to.ID
		directFlowDate[flowKey] = currentDate

		amount := randomizer.Amount(strategy.AmountMin, strategy.AmountMax)
		execTime := randomizer.Time(currentDate, strategy.TimeStart, strategy.TimeEnd)

		task := model.TransferTask{
			ID:         uuid.New().String(),
			UserID:     userID,
			GroupName:  groupName,
			Cycle:      cycle,
			AnchorDate: baseDate,
			ExecDate:   execTime,
			FromBankID: pair.from.ID,
			ToBankID:   pair.to.ID,
			Amount:     amount,
			Status:     model.TaskStatusPending,
		}
		tasks = append(tasks, task)
		dailyCount++
	}

	sort.Slice(tasks, func(i, j int) bool {
		return tasks[i].ExecDate.Before(tasks[j].ExecDate)
	})

	return tasks
}

func clearDayRecords(records map[string]string, currentDate time.Time) map[string]string {
	currentDateStr := currentDate.Format("2006-01-02")
	newRecords := make(map[string]string)
	for key, value := range records {
		if len(key) > 10 && key[len(key)-10:] == currentDateStr {
			newRecords[key] = value
		}
	}
	return newRecords
}

func skipWeekend(date time.Time) time.Time {
	for date.Weekday() == time.Saturday || date.Weekday() == time.Sunday {
		date = date.AddDate(0, 0, 1)
	}
	return date
}
