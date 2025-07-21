import { NextResponse } from "next/server";
import { CompletedEqub, Payment, User } from "@/lib/models";
import { connectToDb } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { Parser as Json2csvParser } from "json2csv";

function convertToEthiopianDate(gregorianDate) {
  try {
    const ethiopianMonthNames = [
      "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት",
      "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሀምሌ", "ነሀሴ", "ጳጉሜ"
    ];
    const date = new Date(gregorianDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    const julianDay = day + Math.floor((153 * m + 2) / 5) + 365 * y + 
      Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    const ethiopianEpoch = 1723856;
    const r = (julianDay - ethiopianEpoch) % 1461;
    const n = (r % 365) + 365 * Math.floor(r / 1460);
    let ethYear = 4 * Math.floor((julianDay - ethiopianEpoch) / 1461) +
      Math.floor(r / 365) - Math.floor(r / 1460);
    let ethMonth = Math.floor(n / 30) + 1;
    let ethDay = (n % 30) + 1;
    if (ethMonth === 13 && ethDay > 5) {
      if ((ethYear + 1) % 4 === 0) {
        if (ethDay === 6) {
          ethDay = 1;
          ethMonth = 1;
          ethYear++;
        }
      } else {
        ethDay = 1;
        ethMonth = 1;
        ethYear++;
      }
    }
    if (n === 365) {
      ethDay = 6;
      ethMonth = 13;
    }
    const ethMonthName = ethiopianMonthNames[ethMonth - 1];
    return `${ethDay}-${ethMonthName}-${ethYear}`;
  } catch {
    return "Invalid Date";
  }
}

export async function GET(req, { params }) {
  try {
    await connectToDb();
    const session = await auth();
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const userId = session.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse("User not found", { status: 401 });
    }

    const completedEqub = await CompletedEqub.findById(params.id)
      .populate({
        path: "equbId",
        select: "name amount createdAt owner",
        populate: {
          path: "owner",
          select: "firstName lastName phoneNumber",
          model: "User"
        }
      })
      .populate({
        path: "completedBy",
        select: "firstName lastName",
        model: "User"
      })
      .lean();

    if (!completedEqub) {
      return new NextResponse("CompletedEqub not found", { status: 404 });
    }

    // Role-based access
    if (!user.isSystemAdmin && String(completedEqub.underManager) !== String(userId)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const equb = completedEqub.equbId || {};
    const owner = equb.owner || {};
    const completedBy = completedEqub.completedBy || {};

    // Main details table
    const equbDetails = [{
      "Owner Name": `${owner.firstName || ""} ${owner.lastName || ""}`.trim(),
      "Owner Phone": owner.phoneNumber || "",
      "Equb Name": equb.name || "",
      "Amount": equb.amount || 0,
      "Start Date": equb.createdAt ? convertToEthiopianDate(equb.createdAt) : "",
      "Total Paid": completedEqub.totalPayment || 0,
      "Fee": completedEqub.fee || 0,
      "Paid to Client": (completedEqub.totalPayment || 0) - (completedEqub.fee || 0),
      "Completed By": `${completedBy.firstName || ""} ${completedBy.lastName || ""}`.trim(),
      "Completed At": completedEqub.completedAt ? convertToEthiopianDate(completedEqub.completedAt) : ""
    }];

    // Payments table
    const payments = await Payment.find({ forEqub: String(equb._id) })
      .populate({
        path: "to",
        select: "firstName lastName",
        model: "User"
      })
      .sort({ date: 1 })
      .lean();

    const paymentsTable = payments.map((p) => ({
      "Payment Date": p.date ? convertToEthiopianDate(p.date) : "",
      "Collector": `${p.to?.firstName || ""} ${p.to?.lastName || ""}`.trim(),
      "Amount": p.amount || 0
    }));

    // Add total row
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    paymentsTable.push({ "Payment Date": "Total", "Collector": "", "Amount": totalPayments });

    // Generate CSVs
    const equbParser = new Json2csvParser({ header: true });
    const paymentsParser = new Json2csvParser({ header: true });
    const equbCsv = equbParser.parse(equbDetails);
    const paymentsCsv = paymentsParser.parse(paymentsTable);

    // Combine with a blank line between
    const combinedCsv = `${equbCsv}\n\n${paymentsCsv}`;

    // Filename: equbName-ownerName.csv
    const fileName = `${(equb.name || "equb").replace(/\s+/g, "_")}-${(owner.firstName || "")}_${(owner.lastName || "")}.csv`;

    return new NextResponse(combinedCsv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=${fileName}`
      }
    });
  } catch (err) {
    console.error("Error exporting completed equb CSV:", err);
    return new NextResponse("Server error", { status: 500 });
  }
} 