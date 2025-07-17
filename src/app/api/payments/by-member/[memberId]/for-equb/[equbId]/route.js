// ... common imports ...
// At the top of your new website API route files:
import { NewEqub, NewMember, NewPayment } from "@/lib/new_models"; // Models for the NEW database
import { connectToNewDb } from "@/lib/new_utils"; // Connection to the NEW database
import { NextResponse } from "next/server";
import { validatePhoneNumber, hashPassword, callOriginalApi } from "@/lib/helpers"; // Shared helpers
import mongoose from "mongoose"; // For ObjectId validation and transactions
// ... common imports ... 
export const GET = async (request, { params }) => {
    const { memberId, equbId } = params; // memberId is NewMember._id
    try {
      if (!mongoose.Types.ObjectId.isValid(memberId) || !mongoose.Types.ObjectId.isValid(equbId)) {
        return NextResponse.json({ error: "Invalid Member ID or Equb ID" }, { status: 400 });
      }
      await connectToNewDb();
      const payments = await NewPayment.find({
        payerMemberId: memberId,
        newEqubId: equbId,
      })
      .populate("payeeOriginalUserId", "firstName lastName") // Info about who received
      .sort({ paymentDate: -1 })
      .lean();
  
      return NextResponse.json({ payments });
    } catch (err) {
      console.error("Error fetching payments for member:", err);
      return NextResponse.json({ error: "Failed to fetch payments." }, { status: 500 });
    }
  };