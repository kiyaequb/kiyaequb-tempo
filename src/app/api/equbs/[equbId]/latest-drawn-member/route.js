// new_website/app/api/equbs/[equbId]/latest-drawn-member/route.js
import { NewEqub, NewMember } from "@/lib/new_models";
import { connectToNewDb } from "@/lib/new_utils";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const GET = async (request, { params }) => {
  const { equbId } = params;

  try {
    if (!mongoose.Types.ObjectId.isValid(equbId)) {
      return NextResponse.json({ error: "Invalid Equb ID format." }, { status: 400 });
    }

    await connectToNewDb();

    // 1. Fetch the Equb and its drawnMembersFileNumberList
    const equb = await NewEqub.findById(equbId).select("drawnMembersFileNumberList equbName").lean();

    if (!equb) {
      return NextResponse.json({ error: "Equb not found." }, { status: 404 });
    }

    const { drawnMembersFileNumberList } = equb;

    if (!drawnMembersFileNumberList || drawnMembersFileNumberList.length === 0) {
      return NextResponse.json({ message: "No members have been drawn yet for this Equb.", latestDrawnMember: null });
    }

    // 2. Get the last file number from the list (most recently added)
    const latestDrawnFileNumber = drawnMembersFileNumberList[drawnMembersFileNumberList.length - 1];

    // 3. Find the member associated with this file number within this Equb
    const latestDrawnMember = await NewMember.findOne({
      equbId: new mongoose.Types.ObjectId(equbId),
      fileNumber: latestDrawnFileNumber,
      isActive: true, // Optionally, only consider active members
    })
    // Populate any desired fields from the original user if needed
    // .populate('originalUserId', 'firstName lastName img')
    .lean();

    if (!latestDrawnMember) {
      // This could happen if a file number was in the list but the member record was deleted or made inactive,
      // or if there's a data inconsistency.
      console.warn(`Data inconsistency or inactive member: Latest drawn file number '${latestDrawnFileNumber}' for Equb '${equb.equbName}' (${equbId}) does not correspond to an active member.`);
      return NextResponse.json({
        message: `No active member found for the latest drawn file number ('${latestDrawnFileNumber}'). It might be an old record or an inactive member.`,
        latestDrawnMember: null,
        latestDrawnFileNumber: latestDrawnFileNumber // Still provide the file number
      });
    }

    // 4. Construct the response with member details
    // You can customize the details returned for the member
    const memberDetails = {
      _id: latestDrawnMember._id,
      equbId: latestDrawnMember.equbId,
      originalUserId: latestDrawnMember.originalUserId,
      fullName: `${latestDrawnMember.firstNameInEqub} ${latestDrawnMember.fatherNameInEqub}`,
      fileNumber: latestDrawnMember.fileNumber,
      phoneNumber: latestDrawnMember.phoneNumberInEqub,
      memberEqubType: latestDrawnMember.memberEqubType,
      initialAmount: latestDrawnMember.initialAmount,
      joinDate: latestDrawnMember.joinDate,
      // Add other relevant fields from latestDrawnMember
    };

    return NextResponse.json({
        message: "Latest drawn member details fetched successfully.",
        latestDrawnMember: memberDetails,
        equbName: equb.equbName // For context
    });

  } catch (err) {
    console.error("Error fetching latest drawn member:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch latest drawn member." }, { status: 500 });
  }
};