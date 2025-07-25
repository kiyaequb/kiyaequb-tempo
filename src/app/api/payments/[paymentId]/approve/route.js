// ... common imports ...
// At the top of your new website API route files:
import { NewEqub, NewMember, NewPayment } from "@/lib/new_models"; // Models for the NEW database
import { connectToNewDb } from "@/lib/new_utils"; // Connection to the NEW database
import { NextResponse } from "next/server";
import { validatePhoneNumber, hashPassword, callOriginalApi } from "@/lib/helpers"; // Shared helpers
import mongoose from "mongoose"; // For ObjectId validation and transactions
import { Payment, PreGivenEqubDetails } from "@/lib/models";
// ... common imports ... 
export const PATCH = async (request, { params }) => {
    const { paymentId } = params;
    try {
      const { approverOriginalUserId } = await request.json(); // ID of the admin approving
  
      if (!mongoose.Types.ObjectId.isValid(paymentId) || !mongoose.Types.ObjectId.isValid(approverOriginalUserId)) {
        return NextResponse.json({ error: "Invalid Payment ID or Approver ID" }, { status: 400 });
      }
  
      await connectToNewDb();
      const payment = await NewPayment.findById(paymentId);
  
      if (!payment) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }
      if (!payment.selfPaid) {
        return NextResponse.json({ error: "Payment was not self-paid, cannot approve this way." }, { status: 400 });
      }
      if (payment.isApproved) {
        return NextResponse.json({ error: "Payment is already approved." }, { status: 400 });
      }
  
      // Optional: Validate that approverOriginalUserId is an admin of payment.newEqubId
      // const equb = await NewEqub.findById(payment.newEqubId);
      // if (!equb.admins.some(admin => admin.originalUserId.toString() === approverOriginalUserId)) {
      //    return NextResponse.json({ error: "Approver is not an admin of this Equb." }, { status: 403 });
      // }
  
      payment.isApproved = true;
      payment.approvedByOriginalUserId = approverOriginalUserId;
      payment.status = "received";
      await payment.save();

      // The prompt mentioned setting `payerId`. In `NewPayment` schema, `payerMemberId` is already set.
      // If "setting payerId" means something else, clarify. Assuming it's covered by `payerMemberId`.
  
      return NextResponse.json({ message: "Payment approved successfully", payment });
    } catch (err) {
      console.error("Error approving payment:", err);
      return NextResponse.json({ error: "Failed to approve payment." }, { status: 500 });
    }
  };