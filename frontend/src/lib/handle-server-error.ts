import { toast } from 'sonner'

/**
 * 统一处理 API 错误
 * @param error 错误对象
 * @param defaultMessage 默认错误消息
 */
export function handleApiError(error: unknown, defaultMessage = '操作失败') {
  // 开发环境打印错误
  if (import.meta.env.DEV) {
    console.error('[API Error]', error)
  }

  let errMsg = defaultMessage

  // 处理 fetch 响应错误
  if (error instanceof Response) {
    if (error.status === 204) {
      errMsg = '内容不存在'
    } else if (error.status === 401) {
      errMsg = '请先登录'
    } else if (error.status === 403) {
      errMsg = '无权限'
    } else if (error.status === 404) {
      errMsg = '资源不存在'
    } else if (error.status >= 500) {
      errMsg = '服务器错误'
    }
  }

  // 处理 Error 对象
  if (error instanceof Error) {
    errMsg = error.message || defaultMessage
  }

  // 处理包含 message 字段的对象
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    errMsg = error.message
  }

  toast.error(errMsg)
}

/** @deprecated 使用 handleApiError 替代 */
export function handleServerError(error: unknown) {
  handleApiError(error)
}
