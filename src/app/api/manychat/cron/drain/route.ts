import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/manychat/cron-auth";
import { drainQueue } from "@/lib/manychat/drain";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await drainQueue();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
