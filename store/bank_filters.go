package store

import "gorm.io/gorm"

type BankListFilter struct {
	Status string
	Group  string
	Query  string
}

func (s *Store) applyBankFilters(query *gorm.DB, userID string, filter BankListFilter) *gorm.DB {
	query = query.Where("user_id = ?", userID)
	switch filter.Status {
	case "active":
		query = query.Where("is_active = ?", true)
	case "inactive":
		query = query.Where("is_active = ?", false)
	}
	if filter.Group != "" && filter.Group != "all" {
		if filter.Group == "ungrouped" {
			query = query.Where("group_name IS NULL OR group_name = ''")
		} else {
			query = query.Where("group_name = ?", filter.Group)
		}
	}
	if filter.Query != "" {
		like := "%" + filter.Query + "%"
		query = query.Where("name LIKE ? OR group_name LIKE ?", like, like)
	}
	return query
}
