import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { currentUser, signInRequired } from "@/lib/auth-server";

const MAX_BYTES = 8 * 1024 * 1024;

export async function GET(request: Request) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  const userId = auth.userId;
  if (!userId) return signInRequired();
  if (!env.EVIDENCE) return NextResponse.json({ error: "Evidence storage is not configured" }, { status: 503 });
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!key || !key.startsWith(`${userId}/`)) return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  const object = await env.EVIDENCE.get(key);
  if (!object) return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}

export async function POST(request: Request) {
  const auth = await currentUser();
  if (auth.error) return auth.error;
  const userId = auth.userId;
  if (!userId) return signInRequired();
  if (!env.EVIDENCE) return NextResponse.json({ error: "Evidence storage is not configured" }, { status: 503 });
  const form = await request.formData();
  const file = form.get("file");
  const labId = typeof form.get("labId") === "string" ? String(form.get("labId")) : "lab";
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "A file is required" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Evidence files must be 8 MB or smaller" }, { status: 413 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "evidence.bin";
  const key = `${userId}/${labId}/${crypto.randomUUID()}-${safeName}`;
  await env.EVIDENCE.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  return NextResponse.json({ ok: true, key }, { status: 201 });
}
