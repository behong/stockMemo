import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { fetchMarketData } from "@/lib/fetchers";
import { getKstDate } from "@/lib/time";

export const runtime = "nodejs";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;
const MAX_BATCH = 200;

type BackfillBody = {
  date?: string;
  startTime?: string;
  endTime?: string;
  intervalMinutes?: number;
};

function parseTimeToMinutes(value: string): number | null {
  if (!TIME_REGEX.test(value)) return null;
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function formatMinutes(value: number): string {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

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

  let payload: BackfillBody = {};
  try {
    payload = (await request.json()) as BackfillBody;
  } catch {
    payload = {};
  }

  const date = payload.date?.trim() || getKstDate();
  if (!DATE_REGEX.test(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const startTime = payload.startTime?.trim() || "09:00";
  const endTime = payload.endTime?.trim() || "15:30";
  const intervalMinutes = Number(payload.intervalMinutes ?? 15);

  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === null || end === null) {
    return NextResponse.json(
      { error: "Invalid time format. Use HH:MM." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    return NextResponse.json(
      { error: "intervalMinutes must be a positive number." },
      { status: 400 },
    );
  }

  if (start > end) {
    return NextResponse.json(
      { error: "startTime must be earlier than endTime." },
      { status: 400 },
    );
  }

  const times: string[] = [];
  for (let t = start; t <= end; t += intervalMinutes) {
    times.push(formatMinutes(t));
  }

  if (times.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Too many rows. Max ${MAX_BATCH}.` },
      { status: 400 },
    );
  }

  try {
    for (const time of times) {
      const data = await fetchMarketData();
      const recordPayload = {
        kospiIndividual: data.kospi.individual,
        kospiIndividualQty: data.kospi.individualQty,
        kospiForeign: data.kospi.foreign,
        kospiForeignQty: data.kospi.foreignQty,
        kospiInstitution: data.kospi.institution,
        kospiInstitutionQty: data.kospi.institutionQty,
        kospiChangePct: data.kospi.changePct,
        kospiIndexValue: data.kospi.indexValue,
        kospiAccVolume: data.kospi.accVolume,
        kospiAccAmount: data.kospi.accAmount,
        kosdaqIndividual: data.kosdaq.individual,
        kosdaqIndividualQty: data.kosdaq.individualQty,
        kosdaqForeign: data.kosdaq.foreign,
        kosdaqForeignQty: data.kosdaq.foreignQty,
        kosdaqInstitution: data.kosdaq.institution,
        kosdaqInstitutionQty: data.kosdaq.institutionQty,
        kosdaqChangePct: data.kosdaq.changePct,
        kosdaqIndexValue: data.kosdaq.indexValue,
        kosdaqAccVolume: data.kosdaq.accVolume,
        kosdaqAccAmount: data.kosdaq.accAmount,
        nasdaqChangePct: data.nasdaqChangePct,
        usdkrw: data.usdkrw,
      };

      await prisma.record.upsert({
        where: {
          date_time: {
            date,
            time,
          },
        },
        update: recordPayload,
        create: {
          date,
          time,
          ...recordPayload,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      date,
      count: times.length,
      startTime,
      endTime,
      intervalMinutes,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to backfill data." },
      { status: 500 },
    );
  }
}
