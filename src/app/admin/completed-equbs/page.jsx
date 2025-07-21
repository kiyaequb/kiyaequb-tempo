import { auth } from "@/lib/auth";
import { User } from "@/lib/models";
import { connectToDb } from "@/lib/utils";
import CompletedEqubsClient from "./CompletedEqubsClient";
import { getCompletedEqubs } from "./getCompletedEqubs";
import { redirect } from "next/navigation";

const CompletedEqubsPage = async ({ searchParams }) => {
  // Auth and role checks
  const { user } = await auth();
  if (!user) {
    redirect("/admin");
  }
  await connectToDb();
  const currentUser = await User.findById(user.id);
  const isAdmin = currentUser.isSystemAdmin === true;
  const isManager = currentUser.managerMembers !== null && currentUser.oprator !== true && !currentUser.isSystemAdmin;
  if (!isAdmin && !isManager) {
    redirect("/admin");
  }

  // Date filtering logic (server-side, for initial load)
  const today = new Date();
  const selectedDate = searchParams?.date ? new Date(searchParams.date) : today;
  const dateString = selectedDate.toISOString().slice(0, 10);

  // Fetch completed equbs for the selected date (server-side)
  const completedEqubs = await getCompletedEqubs(dateString);

  // Map and flatten for client
  const completedEqubsForClient = completedEqubs.map((item) => {
    return {
      _id: item._id,
      ownerName: item.ownerName || "",
      ownerId: item.ownerId || "",
      equbAmount: item.equbAmount || 0,
      equbStartDate: item.equbStartDate ? new Date(item.equbStartDate) : null,
      endDate: item.createdAt ? new Date(item.createdAt) : null,
      imageURL: item.imageURL || "",
      totalPayment: item.totalPayment || 0,
      fee: item.fee || 0,
      paidToClient: (item.totalPayment || 0) - (item.fee || 0),
      completedBy: item.completedBy || {},
      completedAt: item.completedAt ? new Date(item.completedAt) : null,
      archived: item.archived || false,
    };
  });

  // Calculate totals
  const totals = completedEqubsForClient.reduce((acc, equb) => {
    acc.totalPayment += equb.totalPayment;
    acc.totalFee += equb.fee;
    acc.totalPaidToClient += equb.paidToClient;
    return acc;
  }, {
    totalPayment: 0,
    totalFee: 0,
    totalPaidToClient: 0
  });

  // Pass initial data and date to client component
  return (
    <div className="bg-gray-900 p-5 rounded-lg min-h-screen">
      <CompletedEqubsClient 
        completedEqubs={completedEqubsForClient}
        totals={totals}
        isSystemAdmin={currentUser.isSystemAdmin}
        initialDate={dateString}
      />
    </div>
  );
};

export default CompletedEqubsPage; 