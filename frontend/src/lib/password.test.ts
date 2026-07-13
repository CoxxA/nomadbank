import { describe, expect, it } from 'vitest'
import { passwordValidationMessage } from './password'

describe('password validation', () => {
  it('requires at least ten Unicode characters', () => {
    expect(passwordValidationMessage('一二三四五六七八九')).not.toBeNull()
    expect(passwordValidationMessage('一二三四五六七八九十')).toBeNull()
  })

  it('enforces the bcrypt UTF-8 byte limit', () => {
    expect(passwordValidationMessage('a'.repeat(72))).toBeNull()
    expect(passwordValidationMessage('密'.repeat(25))).not.toBeNull()
  })
})
