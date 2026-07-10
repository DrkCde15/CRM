import { describe, expect, it } from 'vitest'
import { passwordErrors } from '../utils/validation'

describe('passwordErrors', () => {
  it('rejects weak passwords', () => {
    expect(passwordErrors('123')).toContain('Ao menos 8 caracteres')
    expect(passwordErrors('abcdefgh')).toContain('Uma letra maiúscula')
  })

  it('accepts strong passwords', () => {
    expect(passwordErrors('Secret123')).toHaveLength(0)
  })
})
