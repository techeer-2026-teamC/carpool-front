import { createElement } from 'react'

export default function PasswordInput({ newPassword = false, ...props }) {
  return createElement('input', {
    ...props, type: 'password', required: true,
    autoComplete: newPassword ? 'new-password' : 'current-password',
    ...(newPassword ? { minLength: 8, maxLength: 64 } : {}),
  })
}
