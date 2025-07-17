// ... common imports ...
// At the top of your new website API route files:
import { NewEqub, NewMember, NewPayment } from "@/lib/new_models"; // Models for the NEW database
import { connectToNewDb } from "@/lib/new_utils"; // Connection to the NEW database
import { NextResponse } from "next/server";
import { validatePhoneNumber, hashPassword, callOriginalApi } from "@/lib/helpers"; // Shared helpers
import mongoose from "mongoose"; // For ObjectId validation and transactions
// ... common imports ... 
export const GET = async (request, { params }) => {
    const { equbId } = params;
    try {
      if (!mongoose.Types.ObjectId.isValid(equbId)) {
        return NextResponse.json({ error: "Invalid Equb ID" }, { status: 400 });
      }
      await connectToNewDb();
  
      // 1. Get all active members of the Equb
      const allMembers = await NewMember.find({ newEqubId: equbId, isActive: true })
        .select('_id originalUserId firstNameInEqub fatherNameInEqub fileNumber')
        .populate('originalUserId', 'firstName lastName')
        .lean();
  
      if (allMembers.length === 0) {
          return NextResponse.json({ membersWithPaymentCount: [] });
      }
  
      // 2. Aggregate approved payment counts for each member in this Equb
      const paymentCounts = await NewPayment.aggregate([
        { $match: { newEqubId: new mongoose.Types.ObjectId(equbId), isApproved: true } },
        { $group: { _id: "$payerMemberId", howManyTimePaid: { $sum: 1 } } },
      ]);
      
      // Create a map for easy lookup of payment counts
      const paymentCountMap = new Map();
      paymentCounts.forEach(pc => paymentCountMap.set(pc._id.toString(), pc.howManyTimePaid));
  
      let maxPayments = 0;
      if (paymentCounts.length > 0) {
          maxPayments = Math.max(...paymentCounts.map(pc => pc.howManyTimePaid));
      }
      
      // 3. Combine member info with their payment count, default to 0 if no payments
      const membersWithPaymentCount = allMembers.map(member => {
          const count = paymentCountMap.get(member._id.toString()) || 0;
          return {
              ...member,
              howManyTimePaid: count,
          };
      });
  
      // 4. Filter for members who paid less than maxPayments (or all if max is 0 and you want to show everyone)
      // The request is "less amount of times than a member who has top/max amount of payments"
      // This means if everyone paid 0 times, no one is returned. If max is > 0, then those with < max are returned.
      // If you want to list those who haven't paid when others have:
      let defaulters;
      if (maxPayments === 0) { // If no one has paid yet, or no approved payments
          defaulters = membersWithPaymentCount; // Or an empty array, depending on desired behavior
      } else {
          defaulters = membersWithPaymentCount.filter(member => member.howManyTimePaid < maxPayments);
      }
  
  
      return NextResponse.json({ members: defaulters, maxPaymentsMade: maxPayments });
  
    } catch (err) {
      console.error("Error fetching members by payment status:", err);
      return NextResponse.json({ error: "Failed to fetch members." }, { status: 500 });
    }
  };