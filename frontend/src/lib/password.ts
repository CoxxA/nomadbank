const minimumCharacters = 10
const maximumBytes = 72

export const passwordValidationMessage = (password: string): string | null => {
  if ([...password].length < minimumCharacters) {
    return `密码至少需要 ${minimumCharacters} 个字符`
  }
  if (new TextEncoder().encode(password).length > maximumBytes) {
    return `密码经 UTF-8 编码后不能超过 ${maximumBytes} 字节`
  }
  return null
}
