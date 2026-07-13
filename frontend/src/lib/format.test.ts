import { describe, expect, it } from 'vitest'
import { minutesToTime, timeToMinutes } from './format'

describe('time format', () => {
  it('converts between minutes and HH:mm', () => {
    expect(minutesToTime(9 * 60 + 30)).toBe('09:30')
    expect(timeToMinutes('21:15')).toBe(21 * 60 + 15)
  })
})
