'use server'

import { headers } from 'next/headers'
import { requestPasswordResetEmail } from '@/lib/password-reset'

export type ForgotPasswordState = {
  error?: string
  sent?: boolean
}

function getRequestOrigin(headersList: Headers) {
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') ?? 'http'

  if (!host) {
    return ''
  }

  return `${protocol}://${host}`
}

export async function forgotPasswordAction(
  _state: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email) {
    return { error: 'Enter your email address.' }
  }

  const origin = getRequestOrigin(await headers())

  if (!origin) {
    return { error: 'Could not determine the app URL for this reset link.' }
  }

  const result = await requestPasswordResetEmail(email, origin)

  if (result.error) {
    const message = typeof result.error === 'string' ? result.error : result.error.message
    return { error: message || 'Could not send a reset email.' }
  }

  return { sent: true }
}
