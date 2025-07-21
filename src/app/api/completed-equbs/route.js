import { NextResponse } from "next/server";
import { CompletedEqub, Equb, Payment, User } from "@/lib/models";
import { auth } from "@/lib/auth";
import { connectToDb } from "@/lib/utils";

export async function DELETE(req) {
  try {
    await connectToDb();
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const user = await User.findById(userId);
    if (!user || !user.isSystemAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Support date filtering
    const url = new URL(req.url, 'http://localhost');
    const dateParam = url.searchParams.get('date');
    let completedEqubs;
    if (dateParam) {
      const selectedDate = new Date(dateParam);
      const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
      completedEqubs = await CompletedEqub.find({ completedAt: { $gte: startOfDay, $lte: endOfDay } });
    } else {
      completedEqubs = await CompletedEqub.find({});
    }
    let deletedCount = 0;
    for (const completedEqub of completedEqubs) {
      completedEqub.archived = true;
      await completedEqub.save();
      const equbId = completedEqub.equbId;
      await Equb.deleteOne({ _id: equbId });
      await Payment.deleteMany({ forEqub: String(equbId) });
      deletedCount++;
    }
    return NextResponse.json({ status: "ok", deletedCount });
  } catch (err) {
    console.error("Error deleting all completed equbs:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
} 