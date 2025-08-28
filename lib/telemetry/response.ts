import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function jsonError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { message, ...extra } }, { status });
}

