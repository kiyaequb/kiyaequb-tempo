import { NextResponse } from "next/server";
import { CompletedEqub, Equb, Payment, User } from "@/lib/models";
import { auth } from "@/lib/auth";
import { connectToDb } from "@/lib/utils";

export async function DELETE(req, { params }) {
  try {
    await connectToDb();
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const user = await User.findById(userId);
    if (!user || (!user.isSystemAdmin && !user.managerMembers)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    const completedEqub = await CompletedEqub.findById(id);
    if (!completedEqub) {
      return NextResponse.json({ error: "CompletedEqub not found" }, { status: 404 });
    }

    // Only allow managers to delete their own
    if (!user.isSystemAdmin && String(completedEqub.underManager) !== String(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Archive the completed equb
    completedEqub.archived = true;
    await completedEqub.save();

    // Hard delete the associated Equb and Payments
    const equbId = completedEqub.equbId;
    await Equb.deleteOne({ _id: equbId });
    await Payment.deleteMany({ forEqub: String(equbId) });

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Error deleting completed equb:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
} 