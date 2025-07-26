import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/utils";
import { PreGivenEqubDetails } from "@/lib/models";

export async function GET(req, { params }) {
  await connectToDb();
  
  const { id } = params;
  
  try {
    const preGivenDetails = await PreGivenEqubDetails.findOne({ equbId: id })
      .select('penaltyReserve remainingPenaltyReserve')
      .lean();
    
    if (!preGivenDetails) {
      return NextResponse.json({ error: "PreGivenEqubDetails not found" }, { status: 404 });
    }
    
    return NextResponse.json(preGivenDetails);
  } catch (error) {
    console.error("Error fetching PreGivenEqubDetails:", error);
    return NextResponse.json({ error: "Failed to fetch PreGivenEqubDetails" }, { status: 500 });
  }
} 