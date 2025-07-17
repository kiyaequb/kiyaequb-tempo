// new_website/app/api/members/by-original-user/[originalUserId]/payment-history/route.js
import { NewMember, NewPayment, NewEqub } from "@/lib/new_models";
import { connectToNewDb } from "@/lib/new_utils";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const GET = async (request, { params }) => {
  const { originalUserId } = params;

  try {
    if (!mongoose.Types.ObjectId.isValid(originalUserId)) {
      return NextResponse.json({ error: "Invalid Original User ID format." }, { status: 400 });
    }

    await connectToNewDb();

    // 1. Find all active NewMember records for this originalUserId
    const memberEqubMemberships = await NewMember.find({
      originalUserId: new mongoose.Types.ObjectId(originalUserId),
      isActive: true
    }).select("_id newEqubId fileNumber firstNameInEqub fatherNameInEqub").lean(); // Get necessary info

    if (memberEqubMemberships.length === 0) {
      return NextResponse.json({
        message: "No active Equb memberships found for this user.",
        paymentHistory: []
      });
    }

    // 2. For each membership (NewMember record), fetch their approved payments
    const paymentHistoryPromises = memberEqubMemberships.map(async (membership) => {
      const payments = await NewPayment.find({
        payerMemberId: membership._id, // Use the NewMember._id
        newEqubId: membership.newEqubId, // Ensure context of the specific Equb membership
        isApproved: true
      })
      .populate({ // Optional: Populate Equb name for context in each payment
          path: 'newEqubId',
          select: 'equbName'
      })
      .populate({ // Optional: Populate admin who approved or received
          path: 'payeeOriginalUserId', // Or approvedByOriginalUserId if you prefer
          // select: 'firstName lastName' // This would require another API call to original system
                                        // For now, just sending the ID.
          // To get names here, you'd collect these IDs and make a call to original API post-fetch
      })
      .sort({ paymentDate: -1 }) // Show most recent payments first
      .select("amount paymentDate imageProof newEqubId payeeOriginalUserId") // Select desired payment fields
      .lean();

      return {
        membershipDetails: {
            newMemberId: membership._id,
            newEqubId: membership.newEqubId,
            fileNumber: membership.fileNumber,
            memberFullNameInEqub: `${membership.firstNameInEqub} ${membership.fatherNameInEqub}`,
            equbName: payments.length > 0 && payments[0].newEqubId ? payments[0].newEqubId.equbName : (await NewEqub.findById(membership.newEqubId).select('equbName').lean())?.equbName || "Unknown Equb" // Fetch equbName if not populated
        },
        payments: payments.map(p => ({
            ...p,
            // If newEqubId was an object due to populate, extract its name or id
            newEqubName: p.newEqubId && p.newEqubId.equbName ? p.newEqubId.equbName : undefined,
            newEqubId: p.newEqubId && p.newEqubId._id ? p.newEqubId._id : p.newEqubId,
        }))
      };
    });

    const paymentHistory = await Promise.all(paymentHistoryPromises);

    // Optional: If you need payee names, collect all unique payeeOriginalUserId
    // and make a batch call to original API to get their details, then merge back.

    return NextResponse.json({ paymentHistory });

  } catch (err) {
    console.error("Error fetching member's payment history:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch payment history." }, { status: 500 });
  }
};