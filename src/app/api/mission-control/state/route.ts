import { NextResponse } from 'next/server';
import { readMissionControlState, writeMissionControlState } from '@/lib/mission-control-storage';

export async function GET() {
  const state = await readMissionControlState();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = await request.json();
  const saved = await writeMissionControlState(body);
  return NextResponse.json({ ok: true, state: saved });
}
