// new_website/app/api/payments/self-submit/route.js
import { NewPayment, NewMember, NewEqub } from "@/lib/new_models";
import { connectToNewDb } from "@/lib/new_utils";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const POST = async (request) => {
  try {
    const {
      newEqubId,
      payerMemberId, // This is NewMember._id
      amount,
      imageProof, // URL to the uploaded image proof
      // Optional: if you want the member to specify which admin this payment is for
      // intendedPayeeOriginalUserId 
    } = await request.json();

    if (!newEqubId || !payerMemberId || !amount || !imageProof) {
      return NextResponse.json({ error: "Equb ID, Member ID, amount, and image proof are required." }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(newEqubId) || !mongoose.Types.ObjectId.isValid(payerMemberId)) {
      return NextResponse.json({ error: "Invalid Equb ID or Member ID format." }, { status: 400 });
    }

    await connectToNewDb();

    // 1. Validate the Equb
    const equb = await NewEqub.findById(newEqubId);
    if (!equb) {
      return NextResponse.json({ error: "Equb not found." }, { status: 404 });
    }
    // Ensure the equb is active or in a state that accepts payments
    if (!["new", "active"].includes(equb.equbStatus)) {
        return NextResponse.json({ error: `Equb is not active or new, current status: ${equb.equbStatus}. Payment cannot be submitted.` }, { status: 400 });
    }


    // 2. Validate the Payer Member
    const payerMember = await NewMember.findById(payerMemberId);
    if (!payerMember) {
      return NextResponse.json({ error: "Payer member not found." }, { status: 404 });
    }
    if (payerMember.newEqubId.toString() !== newEqubId) {
      return NextResponse.json({ error: "Payer member does not belong to the specified Equb." }, { status: 400 });
    }
    if (!payerMember.isActive) {
      return NextResponse.json({ error: "Payer member is not active in this Equb." }, { status: 400 });
    }


    // 3. Determine the Payee (Admin)
    // For self-submitted payments, the 'payeeOriginalUserId' might be a default admin for the Equb,
    // or the member might select one if multiple admins can receive payments.
    // For simplicity, let's assume the first admin listed for the Equb is the default intended recipient.
    // A more robust system might have a designated treasurer role.
    let payeeOriginalUserIdToSet;
    // if (intendedPayeeOriginalUserId && mongoose.Types.ObjectId.isValid(intendedPayeeOriginalUserId)) {
    //   // Validate if this intendedPayee is an admin of the equb
    //   const isAdmin = equb.admins.some(admin => admin.originalUserId.toString() === intendedPayeeOriginalUserId);
    //   if (!isAdmin) {
    //     return NextResponse.json({ error: "Intended payee is not a valid admin for this Equb." }, { status: 400 });
    //   }
    //   payeeOriginalUserIdToSet = intendedPayeeOriginalUserId;
    // } else
    if (equb.admins && equb.admins.length > 0) {
      // Find an admin with role 'sebsabi' (collector) or 'dagna' (judge/overseer) first, else take any.
      const collectorAdmin = equb.admins.find(admin => admin.roleInThisEqub === 'sebsabi');
      const dagnaAdmin = equb.admins.find(admin => admin.roleInThisEqub === 'dagna');
      payeeOriginalUserIdToSet = collectorAdmin ? collectorAdmin.originalUserId : (dagnaAdmin ? dagnaAdmin.originalUserId : equb.admins[0].originalUserId);

    } else {
      return NextResponse.json({ error: "No admins configured for this Equb to assign as payee." }, { status: 400 });
    }

    // 4. Create the NewPayment record
    const newPayment = new NewPayment({
      newEqubId,
      payerMemberId,
      payeeOriginalUserId: payeeOriginalUserIdToSet, // Admin who will eventually verify/approve
      amount,
      imageProof,
      selfPaid: true, // Key flag for self-submitted payments
      isApproved: false, // Default is false, explicitly setting it for clarity
      paymentDate: new Date(), // Or allow member to set payment date
      // approvedByOriginalUserId will be null until an admin approves it
    });

    await newPayment.save();

    return NextResponse.json({
      message: "Payment proof submitted successfully. Awaiting approval.",
      payment: newPayment,
    }, { status: 201 });

  } catch (err) {
    console.error("Error submitting self-payment:", err);
    return NextResponse.json({ error: err.message || "Failed to submit payment proof." }, { status: 500 });
  }
};