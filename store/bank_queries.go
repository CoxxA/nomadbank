package store

import "github.com/CoxxA/nomadbank/store/model"

// ========== Bank 操作 ==========

// CreateBank 创建银行
func (s *Store) CreateBank(bank *model.Bank) error {
	return s.db.Create(bank).Error
}

// GetBankByID 根据 ID 获取银行
func (s *Store) GetBankByID(id string) (*model.Bank, error) {
	var bank model.Bank
	if err := s.db.Preload("Strategy").First(&bank, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &bank, nil
}

// ListBanksByUserID 获取用户的所有银行
func (s *Store) ListBanksByUserID(userID string) ([]model.Bank, error) {
	var banks []model.Bank
	if err := s.db.Preload("Strategy").Where("user_id = ?", userID).Find(&banks).Error; err != nil {
		return nil, err
	}
	return banks, nil
}

// ListActiveBanksByUserID 获取用户的活跃银行
func (s *Store) ListActiveBanksByUserID(userID string) ([]model.Bank, error) {
	var banks []model.Bank
	if err := s.db.Where("user_id = ? AND is_active = ?", userID, true).Find(&banks).Error; err != nil {
		return nil, err
	}
	return banks, nil
}

// UpdateBank 更新银行
func (s *Store) UpdateBank(bank *model.Bank) error {
	return s.db.Save(bank).Error
}

// DeleteBank 删除银行
func (s *Store) DeleteBank(id string) error {
	return s.db.Delete(&model.Bank{}, "id = ?", id).Error
}

// ListActiveBanksByIDs 根据 ID 列表获取活跃银行
func (s *Store) ListActiveBanksByIDs(userID string, bankIDs []string) ([]model.Bank, error) {
	var banks []model.Bank
	if err := s.db.Where("user_id = ? AND is_active = ? AND id IN ?", userID, true, bankIDs).Find(&banks).Error; err != nil {
		return nil, err
	}
	return banks, nil
}

// ListActiveBanksByGroup 根据分组获取活跃银行
func (s *Store) ListActiveBanksByGroup(userID string, groupName string) ([]model.Bank, error) {
	var banks []model.Bank
	if err := s.db.Where("user_id = ? AND is_active = ? AND group_name = ?", userID, true, groupName).Find(&banks).Error; err != nil {
		return nil, err
	}
	return banks, nil
}

func (s *Store) ListBanksByUserIDPaged(
	userID string,
	filter BankListFilter,
	page int,
	pageSize int,
) ([]model.Bank, error) {
	var banks []model.Bank
	offset := (page - 1) * pageSize
	query := s.applyBankFilters(s.db.Preload("Strategy").Model(&model.Bank{}), userID, filter)
	if err := query.Order("created_at ASC, id ASC").Offset(offset).Limit(pageSize).Find(&banks).Error; err != nil {
		return nil, err
	}
	return banks, nil
}

func (s *Store) CountBanksByUserID(userID string, filter BankListFilter) (int64, error) {
	var count int64
	query := s.applyBankFilters(s.db.Model(&model.Bank{}), userID, filter)
	if err := query.Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (s *Store) ListBankGroups(userID string) ([]string, error) {
	var groups []string
	if err := s.db.Model(&model.Bank{}).
		Where("user_id = ? AND group_name IS NOT NULL AND group_name != ''", userID).
		Distinct().
		Order("group_name ASC").
		Pluck("group_name", &groups).Error; err != nil {
		return nil, err
	}
	return groups, nil
}
