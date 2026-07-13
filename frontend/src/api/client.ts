export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ErrorBody {
  code?: string
  message?: string
}

export const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    let error: ErrorBody = {}
    try {
      error = (await response.json()) as ErrorBody
    } catch {
      // 响应不是 JSON 时使用 HTTP 状态文本。
    }
    throw new ApiError(
      response.status,
      error.code ?? 'request_failed',
      error.message ?? response.statusText
    )
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export const jsonBody = (value: unknown): string => JSON.stringify(value)
