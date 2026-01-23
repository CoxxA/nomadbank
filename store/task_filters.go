package store

import "gorm.io/gorm"

type TaskListFilter struct {
	Status string
	Group  string
	Cycle  *int
	Query  string
}

func (s *Store) applyTaskFilters(query *gorm.DB, userID string, filter TaskListFilter) *gorm.DB {
	query = query.Where("transfer_tasks.user_id = ?", userID)
	if filter.Status != "" && filter.Status != "all" {
		query = query.Where("transfer_tasks.status = ?", filter.Status)
	}
	if filter.Cycle != nil {
		query = query.Where("transfer_tasks.cycle = ?", *filter.Cycle)
	}
	if filter.Group != "" && filter.Group != "all" {
		if filter.Group == "ungrouped" {
			query = query.Where("transfer_tasks.group_name = ''")
		} else {
			query = query.Where("transfer_tasks.group_name = ?", filter.Group)
		}
	}
	if filter.Query != "" {
		like := "%" + filter.Query + "%"
		query = query.Joins("LEFT JOIN banks fb ON fb.id = transfer_tasks.from_bank_id").
			Joins("LEFT JOIN banks tb ON tb.id = transfer_tasks.to_bank_id").
			Where("fb.name LIKE ? OR tb.name LIKE ? OR transfer_tasks.group_name LIKE ?", like, like, like)
	}
	return query
}
