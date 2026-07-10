export function passwordErrors(pw: string): string[] {
  const errors: string[] = []
  if (pw.length < 8) errors.push('Ao menos 8 caracteres')
  if (!/[A-Z]/.test(pw)) errors.push('Uma letra maiúscula')
  if (!/[a-z]/.test(pw)) errors.push('Uma letra minúscula')
  if (!/[0-9]/.test(pw)) errors.push('Um número')
  return errors
}
