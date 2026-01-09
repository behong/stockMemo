import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getKstDate } from "@/lib/time";

export const runtime = "nodejs";
export const revalidate = 600;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryDate = searchParams.get("date");
  const date = queryDate ? queryDate.trim() : getKstDate();

  if (queryDate && !DATE_REGEX.test(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 },
    );
  }

  try {
    const records = await prisma.record.findMany({
      where: { date },
      orderBy: { time: "asc" },
      select: {
        date: true,
        time: true,
        kospiIndividual: true,
        kospiIndividualQty: true,
        kospiForeign: true,
        kospiForeignQty: true,
        kospiInstitution: true,
        kospiInstitutionQty: true,
        kospiChangePct: true,
        kospiIndexValue: true,
        kospiAccVolume: true,
        kospiAccAmount: true,
        kosdaqIndividual: true,
        kosdaqIndividualQty: true,
        kosdaqForeign: true,
        kosdaqForeignQty: true,
        kosdaqInstitution: true,
        kosdaqInstitutionQty: true,
        kosdaqChangePct: true,
        kosdaqIndexValue: true,
        kosdaqAccVolume: true,
        kosdaqAccAmount: true,
        nasdaqChangePct: true,
        usdkrw: true,
      },
    });

    return NextResponse.json(
      { date, records },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load records." },
      { status: 500 },
    );
  }
}
