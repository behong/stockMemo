import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { fetchMarketData } from "@/lib/fetchers";
import { getKstDateTime } from "@/lib/time";

export const runtime = "nodejs";

export async function POST(request: Request) {
  console.log("[ingest] KIS_DEBUG", process.env.KIS_DEBUG);
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
      kospiIndividualQty: data.kospi.individualQty,
      kospiForeign: data.kospi.foreign,
      kospiForeignQty: data.kospi.foreignQty,
      kospiInstitution: data.kospi.institution,
      kospiInstitutionQty: data.kospi.institutionQty,
      kospiChangePct: data.kospi.changePct,
      kospiAccVolume: data.kospi.accVolume,
      kospiAccAmount: data.kospi.accAmount,
      kosdaqIndividual: data.kosdaq.individual,
      kosdaqIndividualQty: data.kosdaq.individualQty,
      kosdaqForeign: data.kosdaq.foreign,
      kosdaqForeignQty: data.kosdaq.foreignQty,
      kosdaqInstitution: data.kosdaq.institution,
      kosdaqInstitutionQty: data.kosdaq.institutionQty,
      kosdaqChangePct: data.kosdaq.changePct,
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
