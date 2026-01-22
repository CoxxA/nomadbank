package tasks

import (
    "time"

    "github.com/CoxxA/nomadbank/store/model"
)

func GenerateTasks(userID, groupName string, banks []model.Bank, strategy *model.Strategy, cycles, startCycle int, startDate time.Time, randomizer Randomizer) []model.TransferTask {
    var allTasks []model.TransferTask
    currentDate := startDate

    for i := 0; i < cycles; i++ {
        cycle := startCycle + i

        if i > 0 {
            intervalDays := randomizer.IntervalDays(strategy.IntervalMin, strategy.IntervalMax)
            currentDate = currentDate.AddDate(0, 0, intervalDays)
        }

        pairs := GenerateBalancedPairs(banks)
        cycleTasks := ScheduleTasks(userID, groupName, cycle, pairs, currentDate, strategy, randomizer)
        allTasks = append(allTasks, cycleTasks...)

        if len(cycleTasks) > 0 {
            lastTask := cycleTasks[len(cycleTasks)-1]
            currentDate = lastTask.ExecDate
        }
    }

    return allTasks
}
