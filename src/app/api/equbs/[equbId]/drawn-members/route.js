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
      const equb = await NewEqub.findById(equbId).select("drawnMembersFileNumberList").lean();
  
      if (!equb) {
        return NextResponse.json({ error: "Equb not found" }, { status: 404 });
      }
  
      if (!equb.drawnMembersFileNumberList || equb.drawnMembersFileNumberList.length === 0) {
        return NextResponse.json({ drawnMembers: [] });
      }
  
      const drawnMembers = await NewMember.find({
        newEqubId: equbId,
        fileNumber: { $in: equb.drawnMembersFileNumberList },
      })
      .populate("originalUserId", "firstName lastName phoneNumber img")
      .lean();
  
      return NextResponse.json({ drawnMembers });
    } catch (err) {
      console.error("Error fetching drawn members:", err);
      return NextResponse.json({ error: "Failed to fetch drawn members." }, { status: 500 });
    }
  };