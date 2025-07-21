import { NextResponse } from "next/server";
import { getCompletedEqubs } from "@/app/admin/completed-equbs/getCompletedEqubs";
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

export async function GET(req) {
  try {
    // Get the date parameter from the request URL
    const url = new URL(req.url, 'http://localhost');
    const dateParam = url.searchParams.get('date');
    
    // Fetch completed equbs for the specific date
    const completedEqubs = await getCompletedEqubs(dateParam);
    
    const rows = completedEqubs.map((item) => {
      const equb = item.equbId || {};
      const owner = equb.owner || {};
      const completedBy = item.completedBy || {};
      return {
        "Owner Name": item.ownerName || "",
        "Amount": item.equbAmount || 0,
        "Start Date": item.equbStartDate ? convertToEthiopianDate(item.equbStartDate) : "",
        "End Date": item.endDate ? convertToEthiopianDate(item.endDate) : "",
        "Total Paid": item.totalPayment || 0,
        "Fee": item.fee || 0,
        "Paid to Client": (item.totalPayment || 0) - (item.fee || 0),
        "Completed By": item.completedBy && item.completedBy.firstName ? `${item.completedBy.firstName} ${item.completedBy.lastName}` : "",
      };
    });
    // Add totals row
    const totals = rows.reduce((acc, row) => {
      acc["Total Paid"] += Number(row["Total Paid"]);
      acc["Fee"] += Number(row["Fee"]);
      acc["Paid to Client"] += Number(row["Paid to Client"]);
      return acc;
    }, { "Total Paid": 0, "Fee": 0, "Paid to Client": 0 });
    rows.push({
      "Owner Name": "Total",
      "Amount": "",
      "Start Date": "",
      "End Date": "",
      "Total Paid": totals["Total Paid"],
      "Fee": totals["Fee"],
      "Paid to Client": totals["Paid to Client"],
      "Completed By": "",
    });
    const parser = new Json2csvParser({ header: true });
    const csv = parser.parse(rows);
    
    // Use the selected date for the filename, or today if no date provided
    const selectedDate = dateParam ? new Date(dateParam) : new Date();
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const gregorianDate = `${year}-${month}-${day}`;
    const filename = `completed-equbs-${gregorianDate}.csv`;
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
      }
    });
  } catch (err) {
    console.error("Error exporting completed equbs CSV:", err);
    return new NextResponse("Server error", { status: 500 });
  }
} 