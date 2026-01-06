import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { fetchMarketData } from "@/lib/fetchers";
import { getKstDateTime } from "@/lib/time";

export const runtime = "nodejs";

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
