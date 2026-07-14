'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      type="button"
      className="btn btn--topbar btn--sm"
      onClick={() => signOut({ callbackUrl: '/login' })}
    >
      Вийти
    </button>
  )
}
