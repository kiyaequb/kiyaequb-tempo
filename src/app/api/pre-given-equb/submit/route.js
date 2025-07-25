import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/utils";
import { PreGivenEqubDetails, User, Equb, Payment } from "@/lib/models";

export async function POST(req) {
  try {
    await connectToDb();
    const { equbId, fee, penaltyReserve, amountGiven, completionImages, requestedBy } = await req.json();
    if (!equbId || !fee || !penaltyReserve || !amountGiven || !completionImages || !requestedBy) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    // Check for existing non-rejected PreGivenEqubDetails for this equb
    const existing = await PreGivenEqubDetails.findOne({ equbId, status: { $ne: 'rejected' } });
    if (existing) {
      return NextResponse.json({ error: "A Pre Given Equb request already exists for this Equb." }, { status: 409 });
    }
    // Validate user and equb
    const user = await User.findById(requestedBy);
    const equb = await Equb.findById(equbId);
    if (!user || !equb) {
      return NextResponse.json({ error: "Invalid user or equb." }, { status: 400 });
    }
    // Fetch the equb owner user
    const equbOwner = equb.owner ? await User.findById(equb.owner) : null;
    
    // Check for existing received payments for this equb
    const existingPayments = await Payment.find({ 
      forEqub: equbId, 
      status: "received" 
    }).sort({ createdAt: 1 }); // Sort by date ascending
    console.log('payments', existingPayments);
    // Set startDate to earliest payment date if payments exist, otherwise null
    let startDate = null;
    if (existingPayments.length > 0) {
      startDate = existingPayments[0].createdAt; // Earliest payment date
    }
    
    // Determine underManager
    let underManager = null;
    if (user.managerMembers !== null && user.oprator !== true && !user.isSystemAdmin) {
      underManager = user._id;
    }
    // Save new PreGivenEqubDetails
    const doc = new PreGivenEqubDetails({
      equbId,
      requestedBy,
      fee,
      penaltyReserve,
      remainingPenaltyReserve: penaltyReserve,
      amountGiven,
      completionImages,
      status: "pending",
      active: true,
      underManager,
      startDate: startDate,
      equbAmount: equb.amount,
      ownerName: equbOwner ? `${equbOwner.firstName || ""} ${equbOwner.lastName || ""}` : "",
      ownerPhone: equbOwner ? equbOwner.phoneNumber || "" : "",
      ownerId: equbOwner ? equbOwner._id : null,
    });
    await doc.save();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed to submit Pre Given Equb request." }, { status: 500 });
  }
} 