import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/utils";
import { PreGivenEqubDetails, User, Payment } from "@/lib/models";
import { auth } from "@/lib/auth";

export async function POST(req, { params }) {
  await connectToDb();
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await User.findById(session.user.id);
  const isAdmin = user.isSystemAdmin === true;
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = params;
  const updated = await PreGivenEqubDetails.findById(id);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  updated.status = "approved";
  updated.approvedBy = user._id;

  // Fill daysPaid with all received payments for this equb owner, ordered by date
  const payments = await Payment.find({
    forEqub: updated.equbId.toString(),
    status: "received"
  }).sort({ date: 1 });
  
  for (const payment of payments) {
    if (updated.daysPaid.length >= 30) break;
    const alreadyExists = updated.daysPaid.some(entry => entry.paymentId.toString() === payment._id.toString());
    if (!alreadyExists) {
      updated.daysPaid.push({
        paymentId: payment._id,
        amount: payment.amount,
        date: payment.date || payment.createdAt || new Date()
      });
    }
  }
  await updated.save();
  return NextResponse.json({ success: true });
} 