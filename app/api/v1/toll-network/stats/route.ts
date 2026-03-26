import { NextResponse } from 'next/server';
import { loadTollData } from '@/lib/load-toll-data';
import { calculateNetworkStats } from '@/lib/toll-network-utils';

export async function GET() {
  try {
    const data = loadTollData();
    const stats = calculateNetworkStats(data);

    return NextResponse.json(stats, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Data niet beschikbaar. Voer process-toll-network.mjs uit.' },
      { status: 503 }
    );
  }
}
