// ... common imports ...
// At the top of your new website API route files:
import { Equb, Payment } from "@/lib/models";
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
      const equb = await Equb.findById(equbId)
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

export const DELETE = async (request, { params }) => {
  const { equbId } = params;
  try {
    if (!mongoose.Types.ObjectId.isValid(equbId)) {
      return NextResponse.json({ error: "Invalid Equb ID" }, { status: 400 });
    }
    await connectToNewDb();
    // Auth check (reuse your auth logic as in other routes)
    // You may need to import your auth and User model from the correct place
    const { auth } = await import("@/lib/auth");
    const { User } = await import("@/lib/models");
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const user = await User.findById(userId);
    if (!user || !user.isSystemAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Delete the equb
    const equb = await Equb.findById(equbId);
    if (!equb) {
      return NextResponse.json({ error: "Equb not found" }, { status: 404 });
    }
    await Equb.deleteOne({ _id: equbId });
    // Delete all payments for this equb
    await Payment.deleteMany({ forEqub: equbId });
    // Archive completed equb if it exists
    // (Assume CompletedEqub model is in old db, so connect and update if needed)
    try {
      const { connectToDb } = await import("@/lib/utils");
      const { CompletedEqub } = await import("@/lib/models");
      await connectToDb();
      const completedEqub = await CompletedEqub.findOne({ equbId });
      if (completedEqub) {
        completedEqub.archived = true;
        await completedEqub.save();
      }
    } catch (err) {
      // If archiving fails, log but don't block main deletion
      console.error("Archiving completed equb failed:", err);
    }
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Error deleting equb:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
};