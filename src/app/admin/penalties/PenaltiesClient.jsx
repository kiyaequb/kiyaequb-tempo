"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { format, addDays, subDays, isToday } from "date-fns";
import { convertToEthiopianDateMoreEnhanced } from "@/lib/convertToEthiopianDateMoreEnhanced";

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
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmPenalty, setConfirmPenalty] = useState(null);

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

  // Action handlers
  const handleApprove = async (id) => {
    const penalty = penalties.find(p => p._id === id);
    setConfirmPenalty(penalty);
    setConfirmAction("approve");
    setShowConfirmModal(true);
  };

  const handleApproveConfirm = async () => {
    if (!confirmPenalty) return;
    
    setProcessingId(confirmPenalty._id);
    setProcessingAction("approve");
    try {
      const res = await fetch(`/api/penalty/${confirmPenalty._id}/approve`, { method: "POST" });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to approve penalty");
      }
    } catch (error) {
      alert("Failed to approve penalty");
    } finally {
      setProcessingId(null);
      setProcessingAction("");
      setShowConfirmModal(false);
      setConfirmPenalty(null);
      setConfirmAction(null);
    }
  };
  
  const handleReject = async (id) => {
    setProcessingId(id);
    setProcessingAction("reject");
    try {
      const res = await fetch(`/api/penalty/${id}/reject`, { method: "POST" });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to reject penalty");
      }
    } catch (error) {
      alert("Failed to reject penalty");
    } finally {
      setProcessingId(null);
      setProcessingAction("");
    }
  };
  
  const handleCancel = async (id) => {
    const penalty = penalties.find(p => p._id === id);
    setConfirmPenalty(penalty);
    setConfirmAction("cancel");
    setShowConfirmModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!confirmPenalty) return;
    
    setProcessingId(confirmPenalty._id);
    setProcessingAction("cancel");
    try {
      const res = await fetch(`/api/penalty/${confirmPenalty._id}/reject`, { method: "POST" });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to cancel penalty");
      }
    } catch (error) {
      alert("Failed to cancel penalty");
    } finally {
      setProcessingId(null);
      setProcessingAction("");
      setShowConfirmModal(false);
      setConfirmPenalty(null);
      setConfirmAction(null);
    }
  };
  
  const handleDelete = async (id) => {
    const penalty = penalties.find(p => p._id === id);
    setConfirmPenalty(penalty);
    setConfirmAction("delete");
    setShowConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmPenalty) return;
    
    setProcessingId(confirmPenalty._id);
    setProcessingAction("delete");
    try {
      const res = await fetch(`/api/penalty/${confirmPenalty._id}`, { method: "DELETE" });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete penalty");
      }
    } catch (error) {
      alert("Failed to delete penalty");
    } finally {
      setProcessingId(null);
      setProcessingAction("");
      setShowConfirmModal(false);
      setConfirmPenalty(null);
      setConfirmAction(null);
    }
  };
  
  const handleView = (id) => {
    // Find the penalty to get the owner ID
    const penalty = penalties.find(p => p._id === id);
    if (penalty && penalty.equbId && penalty.equbId.owner) {
      router.push(`/admin/users/${penalty.equbId.owner}`);
    }
  };
  
  const handleSendSms = async (penalty) => {
    // Get owner phone number from the penalty data
    const ownerPhone = penalty.ownerPhone;
    if (ownerPhone && ownerPhone !== "-") {
      try {
        // Fetch PreGivenEqubDetails for this penalty's equb
        const res = await fetch(`/api/pre-given-equb/details/${penalty.equbId._id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch PreGivenEqubDetails');
        }
        const preGivenDetails = await res.json();
        
        // Get penalty data from PreGivenEqubDetails
        const penaltyReserve = preGivenDetails.penaltyReserve || 0;
        const remainingPenaltyReserve = preGivenDetails.remainingPenaltyReserve || 0;
        
        // Calculate 10% penalty
        const tenPercentPenalty = Math.round(penaltyReserve * 0.1);
        const result = remainingPenaltyReserve - tenPercentPenalty;
        
        // Format missed date (Ethiopian)
        let missedDate = "-";
        if (penalty.date) {
          const ethDate = convertToEthiopianDateMoreEnhanced(new Date(penalty.date));
          if (ethDate) missedDate = `${ethDate.dayName} ${ethDate.day}-${ethDate.month}-${ethDate.year}`;
        }
        
        // Compose message
        const message = `ውድ ደንበኛችን እቁቦን  እየከፈሉ ስላልሆነ ካሎት ተቀማጭ ገንዘብ ላይ የቀን ${missedDate} ${tenPercentPenalty} ብር ተቀናሽ ተደርጓል ።\n${remainingPenaltyReserve} ብር - ${tenPercentPenalty} ብር = ${result} ብር\nለማንኛውም አስተያየት ወይም ጥያቄ ወደ 0905059016 ወይም 0716892549 ይደውሉ። \nእናመሰግናለን! ኪያ እቁብ`;
        
        // Open device SMS app
        const smsUrl = `sms:${ownerPhone}?body=${encodeURIComponent(message)}`;
        window.open(smsUrl, '_blank');
        
        // Show confirmation modal
        setSelectedPenalty(penalty);
        setShowSmsModal(true);
      } catch (error) {
        console.error('Error fetching PreGivenEqubDetails:', error);
        alert('Failed to fetch penalty data. Please try again.');
      }
    } else {
      alert("Owner phone number not found");
    }
  };

  const confirmSmsSent = async () => {
    if (!selectedPenalty) return;
    
    setProcessingId(selectedPenalty._id);
    setProcessingAction("sms");
    
    try {
      const res = await fetch(`/api/penalty/${selectedPenalty._id}/sms-sent`, { method: "POST" });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to mark SMS as sent");
      }
    } catch (error) {
      alert("Failed to mark SMS as sent");
    } finally {
      setProcessingId(null);
      setProcessingAction("");
      setShowSmsModal(false);
      setSelectedPenalty(null);
    }
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
              <td className="p-2 text-center">
                {p.date ? (() => {
                  const ethiopianDate = convertToEthiopianDateMoreEnhanced(new Date(p.date));
                  return `${ethiopianDate.dayName} ${ethiopianDate.day}-${ethiopianDate.month}-${ethiopianDate.year}`;
                })() : "-"}
              </td>
              <td className="p-2 text-center">
                <span className={`px-2 py-1 rounded text-xs capitalize ${statusColors[p.status] || ""}`}>
                  {p.status}
                </span>
              </td>
              <td className="p-2 text-center">{p.handledBy ? `${p.handledBy.firstName || ""} ${p.handledBy.lastName || ""}` : "-"}</td>
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
                {role === "admin" && p.status === "approved" && (
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
                {(role === "admin" || role === "manager" || role === "operator") && p.status === "approved" && !p.smsSent && (
                  <button
                    className="bg-purple-600 px-2 py-1 rounded text-white"
                    disabled={processingId === p._id && processingAction === "sms"}
                    onClick={() => handleSendSms(p)}
                  >Send SMS</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {penalties.length === 0 && <div className="text-gray-400 mt-4">No penalties for this day.</div>}

      {/* SMS Confirmation Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 text-white">Confirm SMS Sent</h2>
            <p className="mb-6 text-gray-300">
              Did you successfully send the SMS to the owner?
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white"
                onClick={() => {
                  setShowSmsModal(false);
                  setSelectedPenalty(null);
                }}
                disabled={processingId === selectedPenalty?._id && processingAction === "sms"}
              >
                No
              </button>
              <button
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
                onClick={confirmSmsSent}
                disabled={processingId === selectedPenalty?._id && processingAction === "sms"}
              >
                {processingId === selectedPenalty?._id && processingAction === "sms" ? "Confirming..." : "Yes, SMS Sent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {showConfirmModal && confirmPenalty && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 text-white">
              Confirm {confirmAction === "approve" ? "Approve" : confirmAction === "cancel" ? "Cancel" : "Delete"} Penalty
            </h2>
            <p className="mb-6 text-gray-300">
              Are you sure you want to {confirmAction === "approve" ? "approve" : confirmAction === "cancel" ? "cancel" : "delete"} this penalty for {confirmPenalty.ownerName}?
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmPenalty(null);
                  setConfirmAction(null);
                }}
                disabled={processingId === confirmPenalty._id && processingAction === confirmAction}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded text-white ${
                  confirmAction === "approve" 
                    ? "bg-green-600 hover:bg-green-700" 
                    : confirmAction === "cancel" 
                    ? "bg-yellow-600 hover:bg-yellow-700" 
                    : "bg-red-600 hover:bg-red-700"
                }`}
                onClick={
                  confirmAction === "approve" 
                    ? handleApproveConfirm 
                    : confirmAction === "cancel" 
                    ? handleCancelConfirm 
                    : handleDeleteConfirm
                }
                disabled={processingId === confirmPenalty._id && processingAction === confirmAction}
              >
                {processingId === confirmPenalty._id && processingAction === confirmAction 
                  ? "Processing..." 
                  : confirmAction === "approve" 
                    ? "Approve" 
                    : confirmAction === "cancel" 
                    ? "Cancel" 
                    : "Delete"
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 