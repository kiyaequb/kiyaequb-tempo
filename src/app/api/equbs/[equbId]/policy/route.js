// new_website/app/api/equbs/[equbId]/policy/route.js
import { NewEqub } from "@/lib/new_models";
import { connectToNewDb } from "@/lib/new_utils";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

// GET handler (already provided in a previous response)
export const GET = async (request, { params }) => {
  const { equbId } = params;
  try {
    if (!mongoose.Types.ObjectId.isValid(equbId)) {
      return NextResponse.json({ error: "Invalid Equb ID" }, { status: 400 });
    }
    await connectToNewDb();
    const equb = await NewEqub.findById(equbId).select("policy").lean();

    if (!equb) {
      return NextResponse.json({ error: "Equb not found" }, { status: 404 });
    }
    return NextResponse.json({ policy: equb.policy || {} });
  } catch (err) {
    console.error("Error fetching equb policy:", err);
    return NextResponse.json({ error: "Failed to fetch policy." }, { status: 500 });
  }
};

// PATCH handler for updating the policy
export const PATCH = async (request, { params }) => {
  const { equbId } = params;
  try {
    const { policy } = await request.json(); // Expecting: { type: "image" | "text", content: ["string1", "string2..."] }

    if (!mongoose.Types.ObjectId.isValid(equbId)) {
      return NextResponse.json({ error: "Invalid Equb ID format." }, { status: 400 });
    }

    if (!policy || typeof policy !== 'object') {
      return NextResponse.json({ error: "Policy object is required in the request body." }, { status: 400 });
    }
    if (!policy.type || !["image", "text"].includes(policy.type)) {
      return NextResponse.json({ error: "Policy type must be 'image' or 'text'." }, { status: 400 });
    }
    if (!policy.content || !Array.isArray(policy.content) || !policy.content.every(item => typeof item === 'string')) {
      return NextResponse.json({ error: "Policy content must be an array of strings." }, { status: 400 });
    }
    // Optional: Add length validation for content array or individual strings if needed

    await connectToNewDb();

    // TODO: Add authorization check here
    // Ensure the user making this request is an admin of this Equb.
    // This would typically involve getting the authenticated user's originalUserId
    // and checking if they are in the NewEqub.admins array with an appropriate role.
    // For example:
    // const authenticatedUserOriginalId = getAuthenticatedUserOriginalId(request); // Placeholder function
    // const equbForAuth = await NewEqub.findById(equbId).select("admins").lean();
    // if (!equbForAuth.admins.some(admin => admin.originalUserId.toString() === authenticatedUserOriginalId)) {
    //   return NextResponse.json({ error: "Unauthorized. You are not an admin of this Equb." }, { status: 403 });
    // }

    const updatedEqub = await NewEqub.findByIdAndUpdate(
      equbId,
      { $set: { policy: policy } },
      { new: true, runValidators: true } // Return the updated document and run schema validators
    ).select("policy equbName"); // Select only relevant fields for the response

    if (!updatedEqub) {
      return NextResponse.json({ error: "Equb not found." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Equb policy updated successfully.",
      policy: updatedEqub.policy,
      equbName: updatedEqub.equbName
    });

  } catch (err) {
    console.error("Error updating equb policy:", err);
    if (err.name === 'ValidationError') {
        return NextResponse.json({ error: "Validation Error: " + err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Failed to update equb policy." }, { status: 500 });
  }
};