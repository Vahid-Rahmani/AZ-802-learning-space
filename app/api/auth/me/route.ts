import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const userId = await verifySession(request.cookies.get("wincraft_session")?.value, process.env.SESSION_SECRET ?? "local-development-session-secret");
  if (!userId) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { id: userId } });
}
