import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/utils";
import { PreGivenEqubDetails, User } from "@/lib/models";
import { auth } from "@/lib/auth";

export async function DELETE(req, { params }) {
  await connectToDb();
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await User.findById(session.user.id);
  const isAdmin = user.isSystemAdmin === true;
  const isManager = user.managerMembers !== null && user.oprator !== true && !user.isSystemAdmin;
  if (!isAdmin && !isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = params;
  const deleted = await PreGivenEqubDetails.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
} 