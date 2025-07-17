// new_website/app/api/equbs/[newEqubId]/bank-accounts/route.js
import { NewEqub } from "@/lib/new_models";
import { connectToNewDb } from "@/lib/new_utils";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const PUT = async (request, { params }) => {
  const { equbId } = params;

  try {
    const { listOfBankAccount } = await request.json(); // Expecting an array of bank account objects

    if (!mongoose.Types.ObjectId.isValid(equbId)) {
      return NextResponse.json({ error: "Invalid Equb ID format." }, { status: 400 });
    }

    if (!listOfBankAccount || !Array.isArray(listOfBankAccount)) {
      return NextResponse.json({ error: "listOfBankAccount must be an array." }, { status: 400 });
    }

    // Validate each bank account object in the array
    for (const bankAccount of listOfBankAccount) {
      if (!bankAccount.bankName || typeof bankAccount.bankName !== 'string' ||
          !bankAccount.accountOwnerName || typeof bankAccount.accountOwnerName !== 'string' ||
          !bankAccount.accountNumber || typeof bankAccount.accountNumber !== 'string') {
        return NextResponse.json({ error: "Each bank account must have bankName, accountOwnerName, and accountNumber as strings." }, { status: 400 });
      }
    }

    await connectToNewDb();

    // TODO: Add authorization check here (similar to policy update)
    // Ensure the user making this request is an admin of this Equb.
    // const authenticatedUserOriginalId = getAuthenticatedUserOriginalId(request);
    // const equbForAuth = await NewEqub.findById(equbId).select("admins").lean();
    // if (!equbForAuth.admins.some(admin => admin.originalUserId.toString() === authenticatedUserOriginalId)) {
    //   return NextResponse.json({ error: "Unauthorized. You are not an admin of this Equb." }, { status: 403 });
    // }

    const updatedEqub = await NewEqub.findByIdAndUpdate(
      equbId,
      { $set: { listOfBankAccount: listOfBankAccount } },
      { new: true, runValidators: true } // Return updated document, run schema validators
    ).select("listOfBankAccount equbName");

    if (!updatedEqub) {
      return NextResponse.json({ error: "Equb not found." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Equb bank accounts updated successfully.",
      listOfBankAccount: updatedEqub.listOfBankAccount,
      equbName: updatedEqub.equbName
    });

  } catch (err) {
    console.error("Error updating equb bank accounts:", err);
    if (err.name === 'ValidationError') {
        return NextResponse.json({ error: "Validation Error: " + err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Failed to update equb bank accounts." }, { status: 500 });
  }
};

// Optional: GET handler to fetch current bank accounts
export const GET = async (request, { params }) => {
  const { equbId } = params;
  try {
    if (!mongoose.Types.ObjectId.isValid(equbId)) {
      return NextResponse.json({ error: "Invalid Equb ID" }, { status: 400 });
    }
    await connectToNewDb();
    const equb = await NewEqub.findById(equbId).select("listOfBankAccount equbName").lean();

    if (!equb) {
      return NextResponse.json({ error: "Equb not found" }, { status: 404 });
    }
    return NextResponse.json({
        listOfBankAccount: equb.listOfBankAccount || [],
        equbName: equb.equbName
    });
  } catch (err) {
    console.error("Error fetching equb bank accounts:", err);
    return NextResponse.json({ error: "Failed to fetch bank accounts." }, { status: 500 });
  }
};