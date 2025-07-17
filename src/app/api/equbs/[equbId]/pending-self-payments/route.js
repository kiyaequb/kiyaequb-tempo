// ... common imports ...
// At the top of your new website API route files:
import { NewEqub, NewMember, NewPayment } from "@/lib/new_models"; // Models for the NEW database
import { connectToNewDb } from "@/lib/new_utils"; // Connection to the NEW database
import { NextResponse } from "next/server";
import { validatePhoneNumber, hashPassword, callOriginalApi } from "@/lib/helpers"; // Shared helpers
import mongoose from "mongoose"; // For ObjectId validation and transactions
// ... common imports ... 
export const GET = async (request, { params }) => {
    const { equbId } = params;
    try {
      if (!mongoose.Types.ObjectId.isValid(equbId)) {
        return NextResponse.json({ error: "Invalid Equb ID" }, { status: 400 });
      }
      await connectToNewDb();
      const payments = await NewPayment.find({
        newEqubId: equbId,
        selfPaid: true,
        isApproved: false,
      })
      .populate({
          path: 'payerMemberId',
          select: 'firstNameInEqub fatherNameInEqub fileNumber phoneNumberInEqub originalUserId',
          populate: { // Nested populate for original user details if needed
              path: 'originalUserId',
              select: 'firstName lastName phoneNumber' // From Original User model
          }
      })
      .sort({ createdAt: -1 }) // Show newest first
      .lean();
  
      return NextResponse.json({ payments });
    } catch (err) {
      console.error("Error fetching pending self-payments:", err);
      return NextResponse.json({ error: "Failed to fetch payments." }, { status: 500 });
    }
  };