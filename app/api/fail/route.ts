import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// A backend dependency that fails with HTTP 503.
export async function GET() {
  return NextResponse.json(
    { error: 'service unavailable' },
    { status: 503 }
  )
}
