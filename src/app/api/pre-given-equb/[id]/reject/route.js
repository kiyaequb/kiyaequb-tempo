import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/utils";
import { PreGivenEqubDetails, User } from "@/lib/models";
import { auth } from "@/lib/auth";

export async function POST(req, { params }) {
  await connectToDb();
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await User.findById(session.user.id);
  const isAdmin = user.isSystemAdmin === true;
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = params;
  const updated = await PreGivenEqubDetails.findByIdAndUpdate(
    id,
    { status: "rejected" },
    { new: true }
  );
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
} 