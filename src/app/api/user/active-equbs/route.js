// ... common imports ...
// At the top of your new website API route files:
import { NewEqub, NewMember, NewPayment } from "@/lib/new_models"; // Models for the NEW database
import { connectToNewDb } from "@/lib/new_utils"; // Connection to the NEW database
import { NextResponse } from "next/server";
import { validatePhoneNumber, hashPassword, callOriginalApi } from "@/lib/helpers"; // Shared helpers
import mongoose from "mongoose"; // For ObjectId validation and transactions
export const POST = async (request) => { // Changed to POST to accept userId in body
    try {
      const { userId } = await request.json(); // This is originalUserId
  
      if (!userId) {
        return NextResponse.json({ error: "Original userId is required" }, { status: 400 });
      }
  
      // 1. Get memberAtEqubIdList from the original website
      const { memberAtEqubIdList } = await callOriginalApi(`/original-user/${userId}/member-equb-ids`);
  
      if (!memberAtEqubIdList || memberAtEqubIdList.length === 0) {
        return NextResponse.json({ activeEqubs: [] });
      }
  
      // 2. Find those equbs in the new website's database
      await connectToNewDb();
      const activeEqubs = await NewEqub.find({ _id: { $in: memberAtEqubIdList } })
        // .select("equbName amount equbType startDate status") // Project desired fields
        .lean();
      
      // Optionally, for each equb, find the specific member details for this user
       const detailedActiveEqubs = await Promise.all(activeEqubs.map(async (equb) => {
          const memberInfo = await NewMember.findOne({ newEqubId: equb._id, originalUserId: userId })
                                            .select('fileNumber memberEqubType joinDate')
                                            .lean();
          return { ...equb, memberDetails: memberInfo };
      }));
  
  
      return NextResponse.json({ activeEqubs: detailedActiveEqubs });
  
    } catch (err) {
      console.error("Error fetching user's active equbs:", err);
      return NextResponse.json({ error: err.message || "Failed to fetch active equbs." }, { status: 500 });
    }
  };