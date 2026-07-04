'use server'

import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth/server'

export async function signOutAction() {
  const auth = getAuth()

  if (auth) {
    await auth.signOut()
  }

  redirect('/login')
}
