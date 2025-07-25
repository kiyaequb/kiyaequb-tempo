import { Penalty, Equb, User } from "@/lib/models";
import { connectToDb } from "@/lib/utils";
import { auth } from "@/lib/auth";
import PenaltiesClient from "./PenaltiesClient";
import { startOfDay, endOfDay } from "date-fns";

export default async function PenaltiesPage({ searchParams }) {
  await connectToDb();
  const session = await auth();
  if (!session || !session.user) {
    return <div className="text-red-500">Unauthorized</div>;
  }
  const user = await User.findById(session.user.id);
  let role = null;
  if (user.isSystemAdmin === true && user.oprator !== true) {
    role = "admin";
  } else if (user.managerMembers !== null && user.oprator !== true && !user.isSystemAdmin) {
    role = "manager";
  } else if (user.oprator === true && !user.isSystemAdmin) {
    role = "operator";
  } else if (user.collectorOf !== null && !user.isSystemAdmin && user.oprator !== true) {
    role = "collector";
  }
  // Fallback: if no role matched, but user is an operator, show operator menu
  if (!role && user.oprator === true) {
    role = "operator";
  }
  if (!role) {
    return <div className="text-red-500">Unauthorized</div>;
  }

  // Date filter
  const today = new Date();
  const selectedDate = searchParams?.date ? new Date(searchParams.date) : today;
  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);

  // Build query based on role
  let penaltyQuery = { date: { $gte: dayStart, $lte: dayEnd } };
  if (role === "operator" || role === "collector") {
    penaltyQuery.status = "approved";
  }

  // Fetch penalties for the day
  let penalties = await Penalty.find(penaltyQuery)
    .populate({ path: "equbId", model: Equb })
    .populate({ path: "approvedBy", model: User })
    .lean();

  // Fetch owner names for each penalty
  for (let p of penalties) {
    if (p.equbId && p.equbId.owner) {
      const owner = await User.findById(p.equbId.owner).lean();
      p.ownerName = owner ? `${owner.firstName || ""} ${owner.lastName || ""}` : "-";
      p.equbAmount = p.equbId.amount;
    } else {
      p.ownerName = "-";
      p.equbAmount = "-";
    }
  }

  return <PenaltiesClient penalties={penalties} role={role} selectedDate={selectedDate} />;
} 