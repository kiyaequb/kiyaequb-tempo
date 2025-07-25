"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { format, addDays, subDays, isToday } from "date-fns";

const statusColors = {
  approved: "bg-green-600 text-white",
  pending: "bg-yellow-600 text-black",
  rejected: "bg-red-700 text-white",
};

export default function PenaltiesClient({ penalties, role, selectedDate }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [processingId, setProcessingId] = useState(null);
  const [processingAction, setProcessingAction] = useState("");

  // Date navigation
  const getDateString = (date) => format(date, "yyyy-MM-dd");
  const todayString = getDateString(new Date());
  const handleDateChange = (e) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", value);
    router.replace(`?${params.toString()}`);
  };
  const handlePrev = () => {
    const prevDate = subDays(selectedDate, 1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", getDateString(prevDate));
    router.replace(`?${params.toString()}`);
  };
  const handleNext = () => {
    const nextDate = addDays(selectedDate, 1);
    if (getDateString(nextDate) > todayString) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", getDateString(nextDate));
    router.replace(`?${params.toString()}`);
  };

  // Action handlers (placeholders)
  const handleApprove = async (id) => {
    setProcessingId(id);
    setProcessingAction("approve");
    // TODO: Implement approve API call
    setTimeout(() => {
      setProcessingId(null);
      setProcessingAction("");
    }, 500);
  };
  const handleReject = async (id) => {
    setProcessingId(id);
    setProcessingAction("reject");
    // TODO: Implement reject API call
    setTimeout(() => {
      setProcessingId(null);
      setProcessingAction("");
    }, 500);
  };
  const handleCancel = async (id) => {
    setProcessingId(id);
    setProcessingAction("cancel");
    // TODO: Implement cancel API call
    setTimeout(() => {
      setProcessingId(null);
      setProcessingAction("");
    }, 500);
  };
  const handleDelete = async (id) => {
    setProcessingId(id);
    setProcessingAction("delete");
    // TODO: Implement delete API call
    setTimeout(() => {
      setProcessingId(null);
      setProcessingAction("");
    }, 500);
  };
  const handleView = (id) => {
    // TODO: Implement view logic (modal or page)
  };
  const handleSendSms = (id) => {
    // TODO: Implement send SMS logic
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Penalties</h1>
      <div className="mb-4 flex gap-2 items-center">
        <label htmlFor="date" className="mr-2">Date:</label>
        <input
          type="date"
          id="date"
          value={getDateString(selectedDate)}
          onChange={handleDateChange}
          className="p-2 rounded border border-gray-400 text-black"
          max={todayString}
        />
        <button
          className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
          onClick={handlePrev}
          title="Previous Day"
        >&#8592;</button>
        <button
          className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
          onClick={handleNext}
          title="Next Day"
          disabled={getDateString(selectedDate) >= todayString}
        >&#8594;</button>
      </div>
      <table className="min-w-full bg-gray-800 text-white rounded-lg">
        <thead>
          <tr className="bg-gray-900">
            <th className="p-2 text-center">Owner</th>
            <th className="p-2 text-center">Equb Amount</th>
            <th className="p-2 text-center">Missed Date</th>
            <th className="p-2 text-center">Status</th>
            <th className="p-2 text-center">Approved By</th>
            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {penalties.map((p) => (
            <tr key={p._id} className="hover:bg-gray-700">
              <td className="p-2 text-center">{p.ownerName}</td>
              <td className="p-2 text-center">{p.equbAmount}</td>
              <td className="p-2 text-center">{p.date ? format(new Date(p.date), "yyyy-MM-dd") : "-"}</td>
              <td className={`p-2 text-center capitalize ${statusColors[p.status] || ""}`}>{p.status}</td>
              <td className="p-2 text-center">{p.approvedBy ? `${p.approvedBy.firstName || ""} ${p.approvedBy.lastName || ""}` : "-"}</td>
              <td className="p-2 flex gap-2 justify-center">
                {/* Role-based actions */}
                {(role === "admin" || role === "manager") && p.status === "pending" && (
                  <>
                    <button
                      className="bg-green-600 px-2 py-1 rounded text-white"
                      disabled={processingId === p._id && processingAction === "approve"}
                      onClick={() => handleApprove(p._id)}
                    >Approve</button>
                    {role === "manager" && (
                      <button
                        className="bg-red-600 px-2 py-1 rounded text-white"
                        disabled={processingId === p._id && processingAction === "reject"}
                        onClick={() => handleReject(p._id)}
                      >Reject</button>
                    )}
                    {role === "admin" && (
                      <button
                        className="bg-yellow-600 px-2 py-1 rounded text-black"
                        disabled={processingId === p._id && processingAction === "cancel"}
                        onClick={() => handleCancel(p._id)}
                      >Cancel</button>
                      )}
                  </>
                )}
                {role === "admin" && (
                  <button
                    className="bg-red-700 px-2 py-1 rounded text-white"
                    disabled={processingId === p._id && processingAction === "delete"}
                    onClick={() => handleDelete(p._id)}
                  >Delete</button>
                )}
                {(role === "admin" || role === "manager" || role === "operator" || role === "collector") && (
                  <button
                    className="bg-blue-600 px-2 py-1 rounded text-white"
                    onClick={() => handleView(p._id)}
                  >View</button>
                )}
                {(role === "admin" || role === "manager" || role === "operator") && p.status === "approved" && (
                  <button
                    className="bg-purple-600 px-2 py-1 rounded text-white"
                    onClick={() => handleSendSms(p._id)}
                  >Send SMS</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {penalties.length === 0 && <div className="text-gray-400 mt-4">No penalties for this day.</div>}
    </div>
  );
} 