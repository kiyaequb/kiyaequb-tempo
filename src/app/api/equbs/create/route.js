// new_website/app/api/equbs/create/route.js
// ... (common imports: NewEqub, connectToNewDb, NextResponse, callOriginalApi, mongoose) ...
import { NewEqub } from "@/lib/new_models";
import { connectToNewDb } from "@/lib/new_utils";
import { NextResponse } from "next/server";
import { callOriginalApi } from "@/lib/helpers"; // Assuming this helper exists
import mongoose from "mongoose";
// import { compareSync } from "bcryptjs";

export const POST = async (request) => {
//   const newDbSession = await mongoose.startSession();
//   newDbSession.startTransaction();
//  console.log("test: 1");
  try {
    await connectToNewDb();

    const {
      equbName, savingGoal, amount, nPeople, equbType, equbStatus,
      listOfBankAccount, policy,
      admins: adminDetailsArray, // Array of { firstName, fatherName, motherName, phoneNumber, password, role, fileNumberInThisEqub }
      creatorOriginalUserId
    } = await request.json();

    if (!equbName || !amount || !equbType || !adminDetailsArray || adminDetailsArray.length === 0 || !creatorOriginalUserId) {
      // await newDbSession.abortTransaction();
      // newDbSession.endSession();
      return NextResponse.json({ error: "Missing required fields for Equb creation." }, { status: 400 });
    }

    const processedAdminsForNewEqub = []; // To store { originalUserId, roleInThisEqub, fileNumberInThisEqub }

    // Step 1: Find or create each admin in the original system and get their originalUserId
    for (const adminInput of adminDetailsArray) {
      if (!adminInput.firstName || !adminInput.fatherName || !adminInput.phoneNumber || !adminInput.password || !adminInput.role) {
        throw new Error(`Missing details for admin: ${adminInput.phoneNumber}`);
      }

      // Call original API to find/create user and set their role.
      // This call should NOT try to add a NewEqub ID yet.
      const originalAdminUserResponse = await callOriginalApi(
        '/original-user/find-or-create-and-assign-admin', // Ensure this API can handle null newEqubIdForAdminList
        'POST',
        {
          firstName: adminInput.firstName,
          lastName: adminInput.fatherName,
          motherName: adminInput.motherName || adminInput.firstName,
          phoneNumber: adminInput.phoneNumber,
          password: adminInput.password,
          roleToAssign: adminInput.role,
          // newEqubIdForAdminList: null, // Explicitly null or API modified to not require it
          // agentIdForUser: null // This was potentially incorrect usage anyway
        }
      );

      if (!originalAdminUserResponse || !originalAdminUserResponse.user || !originalAdminUserResponse.user._id) {
        throw new Error(`Failed to create/retrieve admin ${adminInput.phoneNumber} in original system.`);
      }

      processedAdminsForNewEqub.push({
        originalUserId: originalAdminUserResponse.user._id,
        roleInThisEqub: adminInput.role,
        fileNumberInThisEqub: adminInput.fileNumberInThisEqub,
      });
    }

    // Step 2: Create the Equb in the new website's database
    const newEqub = new NewEqub({
      equbName, savingGoal, amount, nPeople, equbType, equbStatus,
      listOfBankAccount, policy,
      admins: processedAdminsForNewEqub, // Now stores { originalUserId, roleInThisEqub, ... }
      creatorOriginalUserId,
      startDate: new Date(),
    });
    await newEqub.save();

    // Step 3: Update each original admin user to add the NewEqub ID to their adminAtEqubIdList
    for (const admin of processedAdminsForNewEqub) {
      await callOriginalApi(
        `/original-user/${admin.originalUserId}/add-admin-equb`, // Use the new original API endpoint
        'PATCH',
        {
          newEqubId: newEqub._id.toString()
        }
      );
    }
console.log("test: 2");
    // await newDbSession.commitTransaction();
    // newDbSession.endSession();

    return NextResponse.json({ message: "Equb created successfully and admins linked", equb: newEqub }, { status: 201 });

  } catch (err) {
    console.log("test: 3");
    // await newDbSession.abortTransaction();
    // newDbSession.endSession();
    console.error("Error creating new equb:", err);
    // Check if error is from callOriginalApi and customize message
    if (err.message.includes("Original API request failed")) {
        return NextResponse.json({ error: `Failed during interaction with original system: ${err.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: err.message || "Failed to create equb." }, { status: 500 });
  }
};