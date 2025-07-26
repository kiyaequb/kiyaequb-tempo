import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/utils";
import { Penalty, User } from "@/lib/models";
import { auth } from "@/lib/auth";

export async function POST(req, { params }) {
  await connectToDb();
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const user = await User.findById(session.user.id);
  const isAdmin = user.isSystemAdmin === true;
  const isManager = user.managerMembers !== null && user.oprator !== true && !user.isSystemAdmin;
  const isOperator = user.oprator === true && !user.isSystemAdmin;
  
  if (!isAdmin && !isManager && !isOperator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;
  
  try {
    const penalty = await Penalty.findByIdAndUpdate(
      id,
      { smsSent: true },
      { new: true }
    );

    if (!penalty) {
      return NextResponse.json({ error: "Penalty not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking SMS as sent:", error);
    return NextResponse.json({ error: "Failed to mark SMS as sent" }, { status: 500 });
  }
} 