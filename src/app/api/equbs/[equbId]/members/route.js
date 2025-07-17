// ... common imports ...
// At the top of your new website API route files:
import { NewEqub, NewMember, NewPayment } from "@/lib/new_models"; // Models for the NEW database
import { connectToNewDb } from "@/lib/new_utils"; // Connection to the NEW database
import { NextResponse } from "next/server";
import { validatePhoneNumber, hashPassword, callOriginalApi } from "@/lib/helpers"; // Shared helpers
import mongoose from "mongoose"; // For ObjectId validation and transactions
export const POST = async (request, { params }) => {
    const { equbId: newEqubId } = params; // This is NewEqub._id
  
    try {
      const {
        firstName, fatherName, fileNumber, memberEqubType, phoneNumber, password, // For creating original user
        initialAmount, // For NewMember record
        // motherName for original user creation
        motherName 
      } = await request.json();
  
      if (!mongoose.Types.ObjectId.isValid(newEqubId)) {
          return NextResponse.json({ error: "Invalid Equb ID." }, { status: 400 });
      }
      if (!firstName || !fatherName || !fileNumber || !memberEqubType || !phoneNumber || !password || !initialAmount) {
          return NextResponse.json({ error: "Missing required fields for new member." }, { status: 400 });
      }
  
      await connectToNewDb(); // Connect to new DB for NewMember, NewEqub operations
  
      // Check if Equb exists
      const equb = await NewEqub.findById(newEqubId);
      if (!equb) {
          return NextResponse.json({ error: "Equb not found." }, { status: 404 });
      }
      
      // Check for duplicate fileNumber within this Equb
      const existingMemberWithFileNumber = await NewMember.findOne({ newEqubId, fileNumber });
      if (existingMemberWithFileNumber) {
          return NextResponse.json({ error: `File number ${fileNumber} already exists in this Equb.` }, { status: 409 });
      }
  
  
      // 1. Create/Update user in the original system
      const originalUserData = await callOriginalApi(
        '/original-user/find-or-create-and-assign-member',
        'POST',
        {
          firstName,
          lastName: fatherName, // Assuming fatherName maps to lastName in original User model
          motherName: motherName || firstName, // Provide a default
          phoneNumber,
          password, // Plain password
          newEqubIdForMemberList: newEqubId.toString(), // Add this equbId to their member list
        }
      );
  
      if (!originalUserData || !originalUserData.userId) {
        throw new Error("Failed to create/assign user in original system.");
      }
      const originalUserId = originalUserData.userId;
  
      // 2. Create NewMember record in the new database
      const newMember = new NewMember({
        originalUserId,
        newEqubId,
        firstNameInEqub: firstName,
        fatherNameInEqub: fatherName,
        fileNumber: fileNumber.trim(),
        memberEqubType,
        phoneNumberInEqub: validatePhoneNumber(phoneNumber), // Store validated version
        initialAmount,
      });
      await newMember.save();
  
  
      return NextResponse.json({ message: "Member added successfully", member: newMember }, { status: 201 });
  
    } catch (err) {
      console.error("Error adding member to equb:", err);
      // Check for duplicate key error for fileNumber explicitly if not caught above
      if (err.code === 11000 && err.message.includes("fileNumber")) {
           return NextResponse.json({ error: "File number already exists for this Equb." }, { status: 409 });
      }
      return NextResponse.json({ error: err.message || "Failed to add member." }, { status: 500 });
    }
  };