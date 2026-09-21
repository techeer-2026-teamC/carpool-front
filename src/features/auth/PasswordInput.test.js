import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PasswordInput from './PasswordInput.js'

test('login and current-password fields accept existing credentials beyond the new-password limit', () => {
  for (const length of [65, 72]) {
    const value = 'a'.repeat(length)
    const html = renderToStaticMarkup(createElement(PasswordInput, { value, onChange() {} }))
    assert.match(html, /type="password"/)
    assert.match(html, /autoComplete="current-password"/i)
    assert.ok(html.includes(`value="${value}"`))
    assert.doesNotMatch(html, /(?:min|max)length=/i)
  }
})

test('only new-password fields apply the signup policy', () => {
  const html = renderToStaticMarkup(createElement(PasswordInput, { newPassword: true }))
  assert.match(html, /autoComplete="new-password"/i)
  assert.match(html, /minLength="8"/i)
  assert.match(html, /maxLength="64"/i)
})
