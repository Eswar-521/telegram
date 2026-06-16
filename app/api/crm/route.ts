import { NextResponse } from "next/server";
import { mergeClientCrmData, readCrmData, sanitizeCrmDataForClient, writeCrmData } from "@/lib/data";
import type { CrmData } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const data = await readCrmData();
  return NextResponse.json(sanitizeCrmDataForClient(data));
}

export async function POST(request: Request) {
  const existing = await readCrmData();
  const incoming = (await request.json()) as CrmData;
  const next = mergeClientCrmData(existing, incoming);
  await writeCrmData(next);

  return NextResponse.json(sanitizeCrmDataForClient(next));
}
