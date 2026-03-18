// app/api/health/route.ts  — delete this after testing
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongoose'
import { redis } from '@/lib/redis'

export async function GET() {
    await connectToDatabase()
    await redis.set('health-check', 'ok')
    const val = await redis.get('health-check')
    return NextResponse.json({ mongo: 'connected', redis: val })
}