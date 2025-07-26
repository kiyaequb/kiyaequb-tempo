import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/utils";
import { Penalty, User } from "@/lib/models";
import { auth } from "@/lib/auth";

export async function DELETE(req, { params }) {
  await connectToDb();
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const user = await User.findById(session.user.id);
  const isAdmin = user.isSystemAdmin === true;
  
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const { id } = params;
  
  try {
    const penalty = await Penalty.findByIdAndDelete(id);

    if (!penalty) {
      return NextResponse.json({ error: "Penalty not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting penalty:", error);
    return NextResponse.json({ error: "Failed to delete penalty" }, { status: 500 });
  }
} 