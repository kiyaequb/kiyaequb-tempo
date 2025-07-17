// new_website/app/api/equbs/route.js
import { NewEqub } from "@/lib/new_models";
import { connectToNewDb } from "@/lib/new_utils";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const GET = async (request) => {
  try {
    await connectToNewDb();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const query = {};
    if (status && ["new", "old", "active", "ended"].includes(status)) {
      query.equbStatus = status;
    }
    if (type && ["daily", "weekly", "monthly"].includes(type)) {
      query.equbType = type;
    }

    const skip = (page - 1) * limit;

    const equbs = await NewEqub.find(query)
      .populate({ // Optional: Populate minimal admin info or creator info
        path: 'admins.originalUserId',
        select: 'firstName lastName phoneNumber' // From original User model
      })
      .populate({
        path: 'creatorOriginalUserId',
        select: 'firstName lastName' // From original User model
      })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(); // Use .lean() for faster queries if you don't need Mongoose instance methods

    const totalEqubs = await NewEqub.countDocuments(query);
    const totalPages = Math.ceil(totalEqubs / limit);

    return NextResponse.json({
      equbs,
      currentPage: page,
      totalPages,
      totalEqubs,
    });

  } catch (err) {
    console.error("Error fetching all equbs:", err);
    return NextResponse.json({ error: "Failed to fetch equbs." }, { status: 500 });
  }
};