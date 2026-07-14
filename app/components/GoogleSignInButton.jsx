'use client'

import { signIn } from 'next-auth/react'

export function GoogleSignInButton() {
  return (
    <button
      type="button"
      className="btn btn--primary"
      onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
    >
      Увійти через Google
    </button>
  )
}
