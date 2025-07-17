// At the top of your new website API route files:
import { NewEqub, NewMember, NewPayment } from "@/lib/new_models"; // Models for the NEW database
import { connectToNewDb } from "@/lib/new_utils"; // Connection to the NEW database
import { NextResponse } from "next/server";
import { validatePhoneNumber, hashPassword, callOriginalApi } from "@/lib/helpers"; // Shared helpers
import mongoose from "mongoose"; // For ObjectId validation and transactions
// ... common imports ...

export const POST = async (request) => {
    try {
      const { userId } = await request.json(); // This is originalUserId
  
      if (!userId) {
        return NextResponse.json({ error: "Original userId is required" }, { status: 400 });
      }
  
      // 1. Get adminAtEqubIdList from the original website
      const { adminAtEqubIdList } = await callOriginalApi(`/original-user/${userId}/admin-equb-ids`);
  
      if (!adminAtEqubIdList || adminAtEqubIdList.length === 0) {
        return NextResponse.json({ equbs: [] }); // No equbs administered by this user in the new system
      }
  
      // 2. Find those equbs in the new website's database
      await connectToNewDb();
      const equbs = await NewEqub.find({ _id: { $in: adminAtEqubIdList } })
        .select("equbName amount nPeople startDate equbType") // Project required fields
        .lean();
      
      // You might want to count actual members for nPeople if nPeople is a target
      const equbsWithMemberCount = await Promise.all(equbs.map(async (equb) => {
          const memberCount = await NewMember.countDocuments({ newEqubId: equb._id, isActive: true });
          return { ...equb, currentMembers: memberCount, targetMembers: equb.nPeople };
      }));
  
  
      return NextResponse.json({ equbs: equbsWithMemberCount });
  
    } catch (err) {
      console.error("Error fetching admin equb details:", err);
      return NextResponse.json({ error: err.message || "Failed to fetch equb details." }, { status: 500 });
    }
  };