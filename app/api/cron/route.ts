import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { fetchMarketData } from "@/lib/fetchers";
import { getKstDateTime } from "@/lib/time";

export const runtime = "nodejs";

const TIME_ZONE = process.env.APP_TZ || process.env.TZ || "Asia/Seoul";
const MARKET_OPEN_MINUTES = 9 * 60;
const MARKET_CLOSE_MINUTES = 15 * 60 + 30;

function getKstTimeParts(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }
  return {
    weekday: values.weekday,
    hour: Number(values.hour ?? "0"),
    minute: Number(values.minute ?? "0"),
  };
}

function isTradingWindow(now: Date): boolean {
  const { weekday, hour, minute } = getKstTimeParts(now);
  if (weekday === "Sat" || weekday === "Sun") return false;
  const minutes = hour * 60 + minute;
  return minutes >= MARKET_OPEN_MINUTES && minutes <= MARKET_CLOSE_MINUTES;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function snapToInterval(value: number, interval: number): number {
  return Math.floor(value / interval) * interval;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const { searchParams } = new URL(request.url);
  return searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const now = new Date();
    const { date } = getKstDateTime(now);
    const { hour, minute } = getKstTimeParts(now);
    const snappedMinute = snapToInterval(minute, 10);
    const time = formatTime(hour, snappedMinute);
    if (!isTradingWindow(now)) {
      console.info("[cron] skipped outside market hours", { date, time });
      return NextResponse.json({
        ok: true,
        skipped: true,
        date,
        time,
        reason: "outside_market_hours",
      });
    }
    const data = await fetchMarketData();

    const payload = {
      kospiIndividual: data.kospi.individual,
      kospiIndividualQty: data.kospi.individualQty,
      kospiForeign: data.kospi.foreign,
      kospiForeignQty: data.kospi.foreignQty,
      kospiInstitution: data.kospi.institution,
      kospiInstitutionQty: data.kospi.institutionQty,
      kospiChangePct: data.kospi.changePct,
      kosdaqIndividual: data.kosdaq.individual,
      kosdaqIndividualQty: data.kosdaq.individualQty,
      kosdaqForeign: data.kosdaq.foreign,
      kosdaqForeignQty: data.kosdaq.foreignQty,
      kosdaqInstitution: data.kosdaq.institution,
      kosdaqInstitutionQty: data.kosdaq.institutionQty,
      kosdaqChangePct: data.kosdaq.changePct,
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
      update: payload,
      create: {
        date,
        time,
        ...payload,
      },
    });

    return NextResponse.json({ ok: true, date, time });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to ingest data." },
      { status: 500 },
    );
  }
}
