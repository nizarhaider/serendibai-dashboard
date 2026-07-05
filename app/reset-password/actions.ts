'use server'

import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth/server'

export type ResetPasswordState = {
  error?: string
}

export async function resetPasswordAction(
  _state: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const auth = getAuth()

  if (!auth) {
    return { error: 'Neon Auth is not configured.' }
  }

  const token = String(formData.get('token') ?? '')
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (!token) {
    return { error: 'This password reset link is missing a token.' }
  }

  if (password.length < 8) {
    return { error: 'Use at least 8 characters.' }
  }

  if (password !== confirmPassword) {
    return { error: 'The passwords do not match.' }
  }

  const result = await auth.resetPassword({
    token,
    newPassword: password,
  })

  if (result.error) {
    return { error: result.error.message || 'Could not reset this password.' }
  }

  redirect('/login?password=reset')
}
