import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/utils";
import { PreGivenEqubDetails, Penalty } from "@/lib/models";

export async function GET(req) {
  await connectToDb();
  let updatedCount = 0;
  let failedCount = 0;
  let totalChecked = 0;
  try {
    const equbs = await PreGivenEqubDetails.find({ status: "approved", active: true });
    totalChecked = equbs.length;
    for (const equb of equbs) {
      if (!equb.startDate) continue;
      const now = new Date();
      const start = new Date(equb.startDate);
      const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
      const paidDays = equb.daysPaid.length;
      // For each missed day, add a penalty if not already present
      for (let i = paidDays + 1; i <= daysPassed; i++) {
        // Calculate the missed date
        const missedDate = new Date(start.getTime() + (i - 1) * 24 * 60 * 60 * 1000);
        // Check if a penalty for this date already exists
        const alreadyPenalized = equb.penalties.some(p => p.date && new Date(p.date).toDateString() === missedDate.toDateString());
        if (!alreadyPenalized) {
          const penaltyAmount = Math.round(equb.penaltyReserve * 0.1);
          const penaltyObj = {
            amount: penaltyAmount,
            date: missedDate,
            equbId: equb.equbId
          };
          equb.penalties.push(penaltyObj);
          try {
            await Penalty.create(penaltyObj);
            console.log(`Penalty created for equbId ${equb.equbId} on ${missedDate.toISOString()} amount ${penaltyAmount}`);
          } catch (err) {
            console.error(`Failed to create global Penalty for equbId ${equb.equbId}:`, err);
          }
          equb.remainingPenaltyReserve = (equb.remainingPenaltyReserve + penaltyAmount || 0) - penaltyAmount;
        }
      }
      try {
        await equb.save();
        updatedCount++;
      } catch (err) {
        failedCount++;
        console.error(`Failed to save PreGivenEqubDetails for equbId ${equb.equbId}:`, err);
      }
    }
  } catch (err) {
    failedCount++;
    console.error("General error in penalty check:", err);
  }
  return NextResponse.json({ updatedCount, failedCount, totalChecked });
}

export async function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}