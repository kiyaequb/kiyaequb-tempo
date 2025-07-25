import { Equb, Payment } from "@/lib/models";
import { connectToDb } from "@/lib/utils";
import { NextResponse } from "next/server";

export const POST = async (request) => {

  try {
    await connectToDb();

    const { id } = await request.json();

    // Find payments for these Equbs
    const payments = await Payment.find({ forEqub: id });

    return NextResponse.json({ payments });
  } catch (err) {
    return NextResponse.json(
      { error: "field to get payments of the equb!" },
      { status: 500 }
    );
  }
};
