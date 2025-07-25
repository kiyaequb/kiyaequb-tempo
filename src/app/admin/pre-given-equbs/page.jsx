import { auth } from "@/lib/auth";
import { PreGivenEqubDetails, Equb, User, Payment } from "@/lib/models";
import { connectToDb } from "@/lib/utils";
import PreGivenEqubsClient from "./PreGivenEqubsClient";
import { redirect } from "next/navigation";

export default async function PreGivenEqubsPage({ searchParams }) {
  const { user } = await auth();
  if (!user) redirect("/admin");
  await connectToDb();
  const currentUser = await User.findById(user.id);
  const isAdmin = currentUser.isSystemAdmin === true;
  const isManager = currentUser.managerMembers !== null && currentUser.oprator !== true && !currentUser.isSystemAdmin;
  if (!isAdmin && !isManager) redirect("/admin");

  const userId = String(currentUser._id);

  // Determine tab
  const tab = searchParams?.tab || "pending";

  // Date filtering logic (server-side, for initial load)
  const today = new Date();
  const selectedDate = searchParams?.date ? new Date(searchParams.date) : today;
  const dateString = selectedDate.toISOString().slice(0, 10);

  // Server-side queries for each tab
  let rows = [];
  let totals = { penaltyReserve: 0, remaining: 0 };

  if (tab === "pending") {
    // Pending / Rejected tab
    let preGivenEqubsQuery = { status: { $in: ["pending", "rejected"] } };
    if (isManager) {
      preGivenEqubsQuery.underManager = userId;
    }
    // Date filter: createdAt is on the selected day
    const startOfDay = new Date(dateString);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateString);
    endOfDay.setHours(23, 59, 59, 999);
    preGivenEqubsQuery.createdAt = { $gte: startOfDay, $lte: endOfDay };
    const preGivenEqubs = await PreGivenEqubDetails.find(preGivenEqubsQuery)
      .populate({ path: "equbId", populate: { path: "owner", model: "User" } })
      .lean();
    rows = preGivenEqubs.map((row) => {
      return {
        _id: row._id,
        images: row.completionImages || [],
        ownerName: row.ownerName || "",
        ownerPhone: row.ownerPhone || "",
        ownerId: row.ownerId,
        amount: row.equbAmount,
        dateStarted: row.startDate ? new Date(row.startDate) : null,
        total: (row.penaltyReserve || 0) + (row.fee || 0) + (row.amountGiven || 0),
        fee: row.fee,
        penaltyReserve: row.penaltyReserve,
        remainingPenaltyReserve: row.remainingPenaltyReserve,
        amountGiven: row.amountGiven,
        status: row.status,
        equbId: row.equbId,
        penalties: row.penalties || [],
      };
    });
    totals.penaltyReserve = rows.reduce((sum, r) => sum + (r.penaltyReserve || 0), 0);
    totals.remaining = rows.reduce((sum, r) => sum + (r.remaining || 0), 0);
  } else if (tab === "active" || tab === "finished") {
    let preGivenEqubsQuery = { status: ["approved", "finished"], active: true };
    if (isManager) {
      preGivenEqubsQuery.underManager = userId;
    }
    // If searching by owner, ignore date filter and fetch all
    const searchOwner = searchParams?.searchOwner || "";
    if (!searchOwner) {
      const startOfDay = new Date(dateString);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateString);
      endOfDay.setHours(23, 59, 59, 999);
      preGivenEqubsQuery.updatedAt = { $gte: startOfDay, $lte: endOfDay };
    }
    const preGivenEqubs = await PreGivenEqubDetails.find(preGivenEqubsQuery)
      .populate({ path: "equbId", populate: { path: "owner", model: "User" } })
      .lean();
    console.log('DEBUG: preGivenEqubsQuery', preGivenEqubsQuery);
    console.log('DEBUG: preGivenEqubs result', preGivenEqubs.map(e => ({ _id: e._id, status: e.status, active: e.active, updatedAt: e.updatedAt })));
    // For each, fetch payments and auto-finish if needed
    rows = await Promise.all(preGivenEqubs.map(async (row) => {
      const equb = row.equbId || {};
      const owner = equb.owner || {};
      let payments = [];
      let isFinished = false;
      if (equb._id) {
        payments = await Payment.find({ forEqub: equb._id });
        if (payments.length === 30 && equb.amount && payments.reduce((sum, p) => sum + (p.amount || 0), 0) === equb.amount * 30) {
          isFinished = true;
          if (row.status !== "finished") {
            await PreGivenEqubDetails.updateOne({ _id: row._id }, { $set: { status: "finished" } });
          }
        }
      }
      // Use DB status for tab filtering
      if ((tab === "active" && (row.status === "approved" || row.status === "finished")) || (tab === "finished" && row.status === "finished")) {
        console.log('DEBUG: Row included in tab', { _id: row._id, status: row.status, active: row.active, isFinished });
        // If searching, filter by owner name
        if (searchOwner && !(owner.firstName && `${owner.firstName} ${owner.lastName || ""}`.toLowerCase().includes(searchOwner.toLowerCase()))) {
          return null;
        }
        return {
          _id: row._id,
          images: row.completionImages || [],
          ownerName: row.ownerName || "",
          ownerPhone: row.ownerPhone || "",
          ownerId: row.ownerId,
          amount: row.equbAmount,
          dateStarted: row.startDate ? new Date(row.startDate) : null,
          total: (row.penaltyReserve || 0) + (row.fee || 0) + (row.amountGiven || 0),
          fee: row.fee,
          penaltyReserve: row.penaltyReserve,
          remainingPenaltyReserve: row.remainingPenaltyReserve,
          amountGiven: row.amountGiven,
          status: row.status,
          equbId: row.equbId,
          penalties: row.penalties || [],
          isFinished, // pass this for the Return button logic
        };
      }
      return null;
    }));
    console.log('DEBUG: Final rows for tab', rows.filter(Boolean).map(r => ({ _id: r._id, status: r.status, active: r.active, isFinished: r.isFinished })));
    rows = rows.filter(Boolean);
    totals.penaltyReserve = rows.reduce((sum, r) => sum + (r.penaltyReserve || 0), 0);
    totals.remaining = rows.reduce((sum, r) => sum + (r.remaining || 0), 0);
  } else if (tab === "returned") {
    // Returned tab
    let preGivenEqubsQuery = { status: "finished", active: false };
    if (isManager) {
      preGivenEqubsQuery.underManager = userId;
    }
    // Date filter: updatedAt is on the selected day
    const startOfDay = new Date(dateString);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateString);
    endOfDay.setHours(23, 59, 59, 999);
    preGivenEqubsQuery.updatedAt = { $gte: startOfDay, $lte: endOfDay };
    const preGivenEqubs = await PreGivenEqubDetails.find(preGivenEqubsQuery)
      .populate({ path: "equbId", populate: { path: "owner", model: "User" } })
      .populate({ path: "returnedBy", model: User })
      .lean();
    rows = preGivenEqubs.map((row) => {
      const equb = row.equbId || {};
      const owner = equb.owner || {};
      let returnedByName = "-";
      if (row.returnedBy && row.returnedBy.firstName) {
        returnedByName = `${row.returnedBy.firstName} ${row.returnedBy.lastName || ""}`;
      }
      return {
        _id: row._id,
        images: row.completionImages || [],
        ownerName: row.ownerName || "",
        ownerPhone: row.ownerPhone || "",
        ownerId: row.ownerId,
        amount: row.equbAmount,
        dateStarted: row.startDate ? new Date(row.startDate) : null,
        total: (row.penaltyReserve || 0) + (row.fee || 0) + (row.amountGiven || 0),
        fee: row.fee,
        penaltyReserve: row.penaltyReserve,
        remainingPenaltyReserve: row.remainingPenaltyReserve,
        amountGiven: row.amountGiven,
        status: row.status,
        equbId: row.equbId,
        penalties: row.penalties || [],
        returnedByName,
      };
    });
    totals.penaltyReserve = rows.reduce((sum, r) => sum + (r.penaltyReserve || 0), 0);
    totals.remaining = rows.reduce((sum, r) => sum + (r.remaining || 0), 0);
  }

  return (
    <div className="bg-gray-900 p-5 rounded-lg min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-white">Pre Given Equbs</h1>
      <PreGivenEqubsClient
        rows={rows}
        isAdmin={isAdmin}
        isManager={isManager}
        tab={tab}
        totals={totals}
        initialDate={dateString}
        searchOwner={searchParams?.searchOwner || ""}
      />
    </div>
  );
} 