// ... common imports ...
// At the top of your new website API route files:
import { NewEqub, NewMember, NewPayment } from "@/lib/new_models"; // Models for the NEW database
import { connectToNewDb } from "@/lib/new_utils"; // Connection to the NEW database
import { NextResponse } from "next/server";
import { validatePhoneNumber, hashPassword, callOriginalApi } from "@/lib/helpers"; // Shared helpers
import mongoose from "mongoose"; // For ObjectId validation and transactions
export const GET = async (request, { params }) => {
    const { equbId } = params;
    try {
      if (!mongoose.Types.ObjectId.isValid(equbId)) {
        return NextResponse.json({ error: "Invalid Equb ID" }, { status: 400 });
      }
      await connectToNewDb();
      const equb = await NewEqub.findById(equbId)
          .populate("admins.originalUserId", "firstName lastName phoneNumber") // Populate admin details from original (if accessible)
          .lean();
  
      if (!equb) {
        return NextResponse.json({ error: "Equb not found" }, { status: 404 });
      }
      return NextResponse.json({ equb });
    } catch (err) {
      console.error("Error fetching equb by ID:", err);
      return NextResponse.json({ error: "Failed to fetch equb." }, { status: 500 });
    }
  };