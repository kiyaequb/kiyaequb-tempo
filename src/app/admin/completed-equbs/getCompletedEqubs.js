import { CompletedEqub, Equb, User } from "@/lib/models";
import { auth } from "@/lib/auth";
import { connectToDb } from "@/lib/utils";

export async function getCompletedEqubs(dateString) {
  await connectToDb();
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");
  const userId = session.user.id;
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Only allow admin or manager
  const isAdmin = user.isSystemAdmin === true;
  const isManager = user.managerMembers !== null && user.oprator !== true && !user.isSystemAdmin;
  if (!isAdmin && !isManager) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  let filter = {};
  if (!isAdmin) {
    // Manager: only show completed equbs under themselves
    filter.underManager = userId;
  }
  if (dateString) {
    const selectedDate = new Date(dateString);
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
    filter.completedAt = { $gte: startOfDay, $lte: endOfDay };
  }

  // Fetch and return CompletedEqub documents with completedBy populated
  const completedEqubs = await CompletedEqub.find(filter)
    .select('_id equbId ownerId completedBy underManager fee totalPayment archived completedAt createdAt updatedAt equbName equbAmount equbStartDate ownerName ownerPhone imageURL')
    .populate({ path: 'completedBy', select: 'firstName lastName' })
    .sort({ completedAt: -1 })
    .lean();
  
  return completedEqubs;
} 