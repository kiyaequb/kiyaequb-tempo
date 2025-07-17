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
      const members = await NewMember.find({ newEqubId: equbId, isActive: true })
        .populate("originalUserId", "firstName lastName phoneNumber img") // Populate some fields from original User
        .select("-password") // Exclude sensitive fields from NewMember if any
        .lean();
  
      return NextResponse.json({ members });
    } catch (err) {
      console.error("Error fetching members of equb:", err);
      return NextResponse.json({ error: "Failed to fetch members." }, { status: 500 });
    }
  };