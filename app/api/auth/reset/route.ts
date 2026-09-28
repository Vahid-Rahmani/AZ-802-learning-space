import { NextResponse } from "next/server";

// Deliberately generic: this endpoint never reveals whether an email exists.
// Production email delivery is configured outside the source via the Site runtime.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.email !== "string" || !body.email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  return NextResponse.json({ ok: true, message: "If the account exists, recovery instructions will be sent." }, { status: 202 });
}
