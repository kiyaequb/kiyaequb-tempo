import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Equb, Payment, Transaction, User, CompletedEqub } from "@/lib/models";
import { connectToDb } from "@/lib/utils";

export async function POST(req) {
  try {
    await connectToDb();
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await req.formData();
    const equbId = formData.get("equbId");
    const fee = formData.get("fee");
    const imageURL = formData.get("imageURL");
    const ownerId = formData.get("ownerId");
    if (!equbId || !fee || !imageURL || !ownerId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }
    const equb = await Equb.findById(equbId);
    if (!equb) {
      return NextResponse.json({ error: "Equb not found" }, { status: 404 });
    }
    const owner = await User.findById(equb.owner);
    const currentUser = await User.findById(session.user.id);
    // Fee transaction
    await new Transaction({
      incomeOrPayment: "in",
      reasonOfTransaction: `Fee payment from ${owner.firstName || "Unknown User"} ${owner.lastName || ""} for equb: ${equb.name}`,
      amount: fee,
      phoneNumber: owner.phoneNumber,
    }).save();
    // Total payments
    const totalAmountOfPayments = await Payment.aggregate([
      { $match: { forEqub: equbId } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]);
    const totalPaid = totalAmountOfPayments[0]?.totalAmount || 0;
    // Payout transaction
    await new Transaction({
      incomeOrPayment: "out",
      reasonOfTransaction: `Equb payment ${owner.firstName || "Unknown User"} ${owner.lastName || ""} for equb: ${equb.name}`,
      amount: totalPaid,
      phoneNumber: owner.phoneNumber,
    }).save();
    // underManager logic
    let underManager = null;
    if (currentUser.managerMembers !== null) {
      underManager = currentUser._id;
    } else if (currentUser.oprator === true) {
      underManager = currentUser.underManager;
    } else {
      underManager = null;
    }
    // Create CompletedEqub
    const completedEqubData = {
      equbId: equb._id,
      ownerId,
      completedBy: currentUser._id,
      underManager,
      fee: Number(fee),
      totalPayment: totalPaid,
      archived: false,
      completedAt: new Date(),
      equbName: equb.name,
      equbAmount: equb.amount,
      equbStartDate: equb.createdAt, // Use createdAt instead of equb.startDate
      ownerName: owner.firstName + " " + owner.lastName,
      ownerPhone: owner.phoneNumber,
      imageURL,
    };
    console.log("[CompletedEqub] Saving:", completedEqubData);
    try {
      await CompletedEqub.create(completedEqubData);
    } catch (validationError) {
      console.error("[CompletedEqub] Validation error:", validationError);
      return NextResponse.json({ error: "Validation error", details: validationError.message }, { status: 400 });
    }
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Error completing equb:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
} 