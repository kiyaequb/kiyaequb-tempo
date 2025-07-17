// new_website/app/api/admin/manage-member/change-password/route.js
import { NewMember, NewEqub } from "@/lib/new_models";
import { connectToNewDb } from "@/lib/new_utils";
import { NextResponse } from "next/server";
import { callOriginalApi, validatePhoneNumber } from "@/lib/helpers"; // Assuming helpers exist
import mongoose from "mongoose";

export const POST = async (request) => {
  try {
    const {
      memberPhoneNumber, // Phone number of the member whose password needs changing
      newPassword,
      adminOriginalUserId // ID of the admin initiating this change
    } = await request.json();

    if (!memberPhoneNumber || !newPassword || !adminOriginalUserId) {
      return NextResponse.json({ error: "Member phone number, new password, and admin ID are required." }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(adminOriginalUserId)) {
        return NextResponse.json({ error: "Invalid Admin ID format." }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json({ error: "New password must be a string and at least 6 characters long." }, { status: 400 });
    }

    let validatedMemberPhoneNumber;
    try {
        validatedMemberPhoneNumber = validatePhoneNumber(memberPhoneNumber);
    } catch (err) {
        return NextResponse.json({ error: `Invalid member phone number: ${err.message}` }, { status: 400 });
    }

    await connectToNewDb();

    // 1. Find NewMember record(s) associated with the phone number.
    // The phone number in NewMember schema is `phoneNumberInEqub`.
    const memberEqubMemberships = await NewMember.find({ phoneNumberInEqub: validatedMemberPhoneNumber, isActive: true }).select("newEqubId originalUserId").lean();

    if (memberEqubMemberships.length === 0) {
      return NextResponse.json({ error: `No active member found with phone number: ${validatedMemberPhoneNumber}` }, { status: 404 });
    }

    // 2. Get the unique originalUserId of the member.
    // All these NewMember records should point to the SAME originalUserId if it's the same person.
    const targetOriginalUserId = memberEqubMemberships[0].originalUserId;
    // Optional: Add a check if multiple originalUserIds are found for the same phone, indicating a data issue.
    const allSameOriginalUser = memberEqubMemberships.every(m => m.originalUserId.toString() === targetOriginalUserId.toString());
    if (!allSameOriginalUser) {
        console.error(`Data inconsistency: Multiple originalUserIds found for phone number ${validatedMemberPhoneNumber}`);
        return NextResponse.json({ error: "Data inconsistency found for the member's phone number. Cannot proceed." }, { status: 500 });
    }


    // 3. Check if the adminOriginalUserId is an admin for ANY of the Equbs the member belongs to.
    let isAuthorizedAdmin = false;
    for (const membership of memberEqubMemberships) {
      const equb = await NewEqub.findById(membership.newEqubId).select("admins").lean();
      if (equb && equb.admins.some(admin => admin.originalUserId.toString() === adminOriginalUserId)) {
        isAuthorizedAdmin = true;
        break; // Admin found for one of the member's equbs, authorization granted
      }
    }

    if (!isAuthorizedAdmin) {
      return NextResponse.json({ error: "Unauthorized: You are not an admin of any Equb this member belongs to." }, { status: 403 });
    }

    // 4. Call the original website's API to change the password for the targetOriginalUserId.
    const changePasswordResponse = await callOriginalApi(
      `/original-user/${targetOriginalUserId.toString()}/force-change-password`,
      'PATCH',
      { newPassword: newPassword }
    );

    // callOriginalApi should throw an error if the original API call fails.
    // If it reaches here, the original API call was successful.

    return NextResponse.json({ message: `Password successfully changed for user associated with phone ${validatedMemberPhoneNumber}.` });

  } catch (err) {
    console.error("Error in admin change member password:", err);
    // Check if error is from callOriginalApi to provide a more specific message
    if (err.message && err.message.startsWith("Original API request failed")) {
        // err.message might contain the status and error from the original API
        return NextResponse.json({ error: `Failed to change password on original system: ${err.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: err.message || "Failed to process password change request." }, { status: 500 });
  }
};