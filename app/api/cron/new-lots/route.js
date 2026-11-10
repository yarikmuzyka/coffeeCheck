import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma.js'
import { fetchAllNewLots } from '../../../../lib/new-lots/index.js'
import { syncNewLots } from '../../../../lib/new-lot-sync.js'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'Cron is not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncNewLots(prisma, fetchAllNewLots)
    const ok = result.synced > 0 || result.errors.length === 0
    return NextResponse.json({ ok, ...result }, { status: ok ? 200 : 502 })
  } catch (error) {
    console.error('New lots sync failed', error)
    return NextResponse.json({ ok: false, error: 'New lots sync failed' }, { status: 500 })
  }
}
