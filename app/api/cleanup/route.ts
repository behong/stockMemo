import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MARKET_OPEN = "09:00";
const MARKET_CLOSE = "15:30";

type CleanupBody = {
  date?: string;
  includePreOpen?: boolean;
};

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.INGEST_API_KEY;

  if (!expectedKey) {
    return NextResponse.json(
      { error: "INGEST_API_KEY is not set." },
      { status: 500 },
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: CleanupBody = {};
  try {
    payload = (await request.json()) as CleanupBody;
  } catch {
    payload = {};
  }

  const date = payload.date?.trim();
  if (date && !DATE_REGEX.test(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const includePreOpen = payload.includePreOpen === true;
  const orConditions = [
    { time: { gt: MARKET_CLOSE } },
    ...(includePreOpen ? [{ time: { lt: MARKET_OPEN } }] : []),
  ];

  try {
    const result = await prisma.record.deleteMany({
      where: {
        ...(date ? { date } : {}),
        OR: orConditions,
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: result.count,
      date: date ?? "all",
      includePreOpen,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to cleanup records." },
      { status: 500 },
    );
  }
}
