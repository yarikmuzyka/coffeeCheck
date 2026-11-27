'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function LoadMoreLots({ href }) {
  const router = useRouter()
  const trigger = useRef(null)

  useEffect(() => {
    if (!trigger.current || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      router.replace(href, { scroll: false })
    }, { rootMargin: '0px 0px 200px 0px' })
    observer.observe(trigger.current)
    return () => observer.disconnect()
  }, [href, router])

  return <Link ref={trigger} href={href} scroll={false} replace prefetch={false} className="btn btn--secondary">Показати ще</Link>
}
