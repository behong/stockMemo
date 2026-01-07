import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { fetchMarketData } from "@/lib/fetchers";
import { getKstDateTime } from "@/lib/time";

export const runtime = "nodejs";

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
    const { date, time } = getKstDateTime();
    const data = await fetchMarketData();

    const payload = {
      kospiIndividual: data.kospi.individual,
      kospiForeign: data.kospi.foreign,
      kospiInstitution: data.kospi.institution,
      kospiChangePct: data.kospi.changePct,
      kosdaqIndividual: data.kosdaq.individual,
      kosdaqForeign: data.kosdaq.foreign,
      kosdaqInstitution: data.kosdaq.institution,
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
