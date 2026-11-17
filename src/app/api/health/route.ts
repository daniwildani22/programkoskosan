import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    system: 'Kos Management System (KMS) - Finora Cloud',
    runtime: 'Vercel Edge / Node.js Functions',
    timestamp: new Date().toISOString()
  });
}
