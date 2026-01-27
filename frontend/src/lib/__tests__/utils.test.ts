import { describe, expect, it } from 'vitest'
import { cn, getPageNumbers, getDateKey, parseDateKey } from '../utils'

describe('cn', () => {
  it('合并类名', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('处理条件类名', () => {
    const isActive = true
    const isDisabled = false
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active')
  })

  it('合并 Tailwind 类并处理冲突', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('处理数组输入', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })
})

describe('getPageNumbers', () => {
  it('小数据集（≤5页）显示全部', () => {
    expect(getPageNumbers(1, 3)).toEqual([1, 2, 3])
    expect(getPageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('靠近开头时显示 [1, 2, 3, 4, ..., 最后]', () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, 3, 4, '...', 10])
    expect(getPageNumbers(2, 10)).toEqual([1, 2, 3, 4, '...', 10])
    expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, '...', 10])
  })

  it('靠近末尾时显示 [1, ..., 后四页]', () => {
    expect(getPageNumbers(8, 10)).toEqual([1, '...', 7, 8, 9, 10])
    expect(getPageNumbers(9, 10)).toEqual([1, '...', 7, 8, 9, 10])
    expect(getPageNumbers(10, 10)).toEqual([1, '...', 7, 8, 9, 10])
  })

  it('在中间时显示 [1, ..., 前后各1, ..., 最后]', () => {
    expect(getPageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10])
    expect(getPageNumbers(6, 10)).toEqual([1, '...', 5, 6, 7, '...', 10])
  })

  it('边界情况：只有1页', () => {
    expect(getPageNumbers(1, 1)).toEqual([1])
  })
})

describe('getDateKey', () => {
  it('提取 ISO 日期时间中的日期部分', () => {
    expect(getDateKey('2026-01-27T10:30:00')).toBe('2026-01-27')
  })

  it('提取带空格的日期时间中的日期部分', () => {
    expect(getDateKey('2026-01-27 10:30:00')).toBe('2026-01-27')
  })

  it('返回纯日期字符串原样', () => {
    expect(getDateKey('2026-01-27')).toBe('2026-01-27')
  })

  it('空字符串返回空字符串', () => {
    expect(getDateKey('')).toBe('')
  })
})

describe('parseDateKey', () => {
  it('解析日期字符串为 Date 对象', () => {
    const date = parseDateKey('2026-01-27')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(0) // 1月是0
    expect(date.getDate()).toBe(27)
  })

  it('解析带时间的日期字符串', () => {
    const date = parseDateKey('2026-01-27T10:30:00')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(0)
    expect(date.getDate()).toBe(27)
  })
})
