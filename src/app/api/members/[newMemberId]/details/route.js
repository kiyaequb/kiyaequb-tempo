// new_website/app/api/members/[newMemberId]/details/route.js
import { NewMember, NewPayment, NewEqub } from "@/lib/new_models";
import { connectToNewDb } from "@/lib/new_utils";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const GET = async (request, { params }) => {
  const { newMemberId } = params;

  try {
    if (!mongoose.Types.ObjectId.isValid(newMemberId)) {
      return NextResponse.json({ error: "Invalid Member ID format." }, { status: 400 });
    }

    await connectToNewDb();

    // 1. Fetch the Member's basic details using newMemberId
    const member = await NewMember.findById(newMemberId).lean(); // Use .lean() for performance

    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }
    if (!member.isActive) {
        return NextResponse.json({ error: "Member is not active." }, { status: 403 }); // General not active message
    }

    // 2. Get the newEqubId from the member object
    const newEqubId = member.newEqubId; // This is an ObjectId from the member document

    // 3. Fetch the Equb to get nPeople (target number of members or current cycle length)
    const equb = await NewEqub.findById(newEqubId).select("nPeople equbStatus").lean();
    if (!equb) {
      // This case might indicate data inconsistency if a member record exists but its Equb doesn't
      console.error(`Data inconsistency: Member ${newMemberId} references non-existent Equb ${newEqubId}`);
      return NextResponse.json({ error: "Associated Equb not found for calculating cycles." }, { status: 404 });
    }

    const totalCyclesInRound = equb.nPeople || 0;

    // 4. Count how many times this member has made approved payments for this Equb
    const approvedPaymentsCount = await NewPayment.countDocuments({
      newEqubId: newEqubId, // Use the ObjectId from member.newEqubId
      payerMemberId: new mongoose.Types.ObjectId(newMemberId),
      isApproved: true,
    });

    // 5. Calculate remaining cycles
    let remainingCycleOfPayments = 0;
    if (equb.equbStatus !== 'ended' && totalCyclesInRound > 0) {
        remainingCycleOfPayments = totalCyclesInRound - approvedPaymentsCount;
        if (remainingCycleOfPayments < 0) remainingCycleOfPayments = 0;
    }


    // 6. Construct the detailed response
    const memberDetails = {
      _id: member._id, // which is newMemberId
      newEqubId: member.newEqubId,
      originalUserId: member.originalUserId,
      fullName: `${member.firstNameInEqub} ${member.fatherNameInEqub}`,
      fileNumber: member.fileNumber,
      phoneNumber: member.phoneNumberInEqub,
      memberEqubType: member.memberEqubType,
      initialAmount: member.initialAmount,
      howManyTimesPaid: approvedPaymentsCount,
      totalCyclesInRound: totalCyclesInRound,
      remainingCycleOfPayments: remainingCycleOfPayments,
      joinDate: member.joinDate,
      isActive: member.isActive,
      // Add any other fields from the 'member' object that are relevant
    };

    return NextResponse.json(memberDetails);

  } catch (err) {
    console.error("Error fetching detailed member information by member ID:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch member details." }, { status: 500 });
  }
};