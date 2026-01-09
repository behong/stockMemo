import type { RecordRow } from "@/components/HomeClient";
import HomeClient from "@/components/HomeClient";
import { prisma } from "@/lib/db";
import { getKstDate } from "@/lib/time";

export const runtime = "nodejs";
export const revalidate = 600;

export default async function Page() {
  const date = getKstDate();
  let records: RecordRow[] = [];

  try {
    records = await prisma.record.findMany({
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
  } catch (error) {
    console.error(
      `[page] failed to load initial records: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return <HomeClient initialDate={date} initialRecords={records} />;
}
