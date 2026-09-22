import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const APP_VERSION = '2026.09.22-dm-v4';

export async function GET() {
  return NextResponse.json(
    {
      version: APP_VERSION,
      timestamp: Date.now(),
      features: ['chat', 'push_notifications', 'auto_cache_bust']
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0'
      }
    }
  );
}
