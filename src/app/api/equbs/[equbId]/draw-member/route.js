// ... common imports ...
// At the top of your new website API route files:
import { NewEqub, NewMember, NewPayment } from "@/lib/new_models"; // Models for the NEW database
import { connectToNewDb } from "@/lib/new_utils"; // Connection to the NEW database
import { NextResponse } from "next/server";
import { validatePhoneNumber, hashPassword, callOriginalApi } from "@/lib/helpers"; // Shared helpers
import mongoose from "mongoose"; // For ObjectId validation and transactions
// ... common imports ... 
export const PATCH = async (request, { params }) => {
    const { equbId } = params;
    try {
      const { fileNumber } = await request.json();
  
      if (!mongoose.Types.ObjectId.isValid(equbId)) {
        return NextResponse.json({ error: "Invalid Equb ID" }, { status: 400 });
      }
      if (!fileNumber || typeof fileNumber !== 'string' || fileNumber.trim() === "") {
        return NextResponse.json({ error: "File number is required." }, { status: 400 });
      }
  
      const trimmedFileNumber = fileNumber.trim();
  
      await connectToNewDb();
      
      // Ensure the member with this file number exists in this equb
      const memberExists = await NewMember.findOne({ newEqubId: equbId, fileNumber: trimmedFileNumber });
      if (!memberExists) {
          return NextResponse.json({ error: `Member with file number '${trimmedFileNumber}' not found in this Equb.` }, { status: 404 });
      }
  
      // Add to list if not already present
      const updatedEqub = await NewEqub.findByIdAndUpdate(
        equbId,
        { $addToSet: { drawnMembersFileNumberList: trimmedFileNumber } }, // $addToSet prevents duplicates
        { new: true } // Return the updated document
      );
  
      if (!updatedEqub) {
        return NextResponse.json({ error: "Equb not found" }, { status: 404 });
      }
  
      return NextResponse.json({ message: "File number added to drawn list.", equb: updatedEqub });
    } catch (err) {
      console.error("Error adding to drawn list:", err);
      return NextResponse.json({ error: "Failed to update drawn list." }, { status: 500 });
    }
  };