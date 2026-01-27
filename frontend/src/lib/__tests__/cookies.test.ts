import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getCookie, removeCookie, setCookie } from '../cookies'

describe('cookies', () => {
  beforeEach(() => {
    // 清理测试 cookie
    document.cookie = 'test-cookie=; path=/; max-age=0'
  })

  afterEach(() => {
    // 清理
    document.cookie = 'test-cookie=; path=/; max-age=0'
  })

  describe('setCookie', () => {
    it('设置 cookie 值', () => {
      setCookie('test-cookie', 'test-value')
      expect(document.cookie).toContain('test-cookie=test-value')
    })

    it('设置带自定义 maxAge 的 cookie', () => {
      setCookie('test-cookie', 'value', 3600)
      expect(document.cookie).toContain('test-cookie=value')
    })
  })

  describe('getCookie', () => {
    it('获取存在的 cookie', () => {
      document.cookie = 'test-cookie=hello-world; path=/'
      expect(getCookie('test-cookie')).toBe('hello-world')
    })

    it('获取不存在的 cookie 返回 undefined', () => {
      expect(getCookie('non-existent-cookie')).toBeUndefined()
    })

    it('正确处理多个 cookie', () => {
      document.cookie = 'cookie-a=value-a; path=/'
      document.cookie = 'cookie-b=value-b; path=/'
      expect(getCookie('cookie-a')).toBe('value-a')
      expect(getCookie('cookie-b')).toBe('value-b')
    })
  })

  describe('removeCookie', () => {
    it('删除已存在的 cookie', () => {
      document.cookie = 'test-cookie=to-remove; path=/'
      expect(getCookie('test-cookie')).toBe('to-remove')

      removeCookie('test-cookie')
      expect(getCookie('test-cookie')).toBeUndefined()
    })
  })
})
