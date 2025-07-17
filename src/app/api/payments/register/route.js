// ... common imports ...
// At the top of your new website API route files:
import { NewEqub, NewMember, NewPayment } from "@/lib/new_models"; // Models for the NEW database
import { connectToNewDb } from "@/lib/new_utils"; // Connection to the NEW database
import { NextResponse } from "next/server";
import { validatePhoneNumber, hashPassword, callOriginalApi } from "@/lib/helpers"; // Shared helpers
import mongoose from "mongoose"; // For ObjectId validation and transactions
// ... common imports ... 
export const POST = async (request) => {
    try {
      const {
        newEqubId,
        payerMemberId, // This is NewMember._id
        payeeOriginalUserId, // This is OriginalUser._id of the admin/collector
        amount,
        imageProof,
        selfPaid = false, // Default to false if not provided
        // Other fields like firstName, fatherName, phoneNumber, fileNumber for the payment record
        // are part of the NewPayment schema but should be derived from payerMemberId or payeeOriginalUserId.
        // The prompt includes them directly on payment, which suggests denormalization or direct input.
        // For now, assuming payerId (payerMemberId) and payeeId (payeeOriginalUserId) are key.
        // The `approved` field is `isApproved` in the schema, and it's true as per prompt.
      } = await request.json();
  
      if (!newEqubId || !payerMemberId || !payeeOriginalUserId || !amount) {
        return NextResponse.json({ error: "Missing required fields for payment." }, { status: 400 });
      }
      if (!mongoose.Types.ObjectId.isValid(newEqubId) ||
          !mongoose.Types.ObjectId.isValid(payerMemberId) ||
          !mongoose.Types.ObjectId.isValid(payeeOriginalUserId)) {
          return NextResponse.json({ error: "Invalid ID format." }, { status: 400 });
      }
  
  
      await connectToNewDb();
  
      // Fetch payer member to validate and potentially get denormalized info
      const payerMember = await NewMember.findById(payerMemberId);
      if (!payerMember || payerMember.newEqubId.toString() !== newEqubId) {
          return NextResponse.json({ error: "Payer member not found or does not belong to this Equb." }, { status: 404 });
      }
      // Fetch payee original user (admin) to validate
      // This would ideally involve a call to original API to check if payeeOriginalUserId is a valid admin for this equb
      // For simplicity, we assume payeeOriginalUserId is correct.
  
      const newPayment = new NewPayment({
        newEqubId,
        payerMemberId,
        payeeOriginalUserId,
        amount,
        imageProof,
        selfPaid,
        isApproved: true, // As per prompt "approved set to true"
        paymentDate: new Date(),
        // approvedByOriginalUserId could be set to payeeOriginalUserId if they are the one "receiving" and thus "approving"
        approvedByOriginalUserId: selfPaid ? null : payeeOriginalUserId, // If not selfPaid, payee is implicitly approving by registering
      });
  
      await newPayment.save();
      return NextResponse.json({ message: "Payment registered successfully", payment: newPayment }, { status: 201 });
  
    } catch (err) {
      console.error("Error registering payment:", err);
      return NextResponse.json({ error: err.message || "Failed to register payment." }, { status: 500 });
    }
  };