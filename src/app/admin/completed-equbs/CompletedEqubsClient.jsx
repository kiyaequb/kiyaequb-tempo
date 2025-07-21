"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";
import { format } from "date-fns";
import styles from "./completed-equbs.module.css";
import Image from "next/image";

const CompletedEqubsClient = ({ completedEqubs, totals, isSystemAdmin, initialDate }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showModal, setShowModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Use completedEqubs prop directly (already filtered server-side)
  const filteredEqubs = completedEqubs;

  // Date navigation helpers
  function getDateString(date) {
    return format(date, 'yyyy-MM-dd');
  }
  const prevDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    return getDateString(d);
  }, [selectedDate]);
  const nextDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    return getDateString(d);
  }, [selectedDate]);

  // Handle date change
  const handleDateChange = (e) => {
    const value = e.target.value;
    if (value > getDateString(new Date())) return; // Prevent selecting future dates
    setSelectedDate(value);
    router.replace(`?date=${value}`);
  };
  const handlePrev = () => {
    setSelectedDate(prevDate);
    router.replace(`?date=${prevDate}`);
  };
  const handleNext = () => {
    if (selectedDate >= getDateString(new Date())) return;
    setSelectedDate(nextDate);
    router.replace(`?date=${nextDate}`);
  };

  function convertToEthiopianDate(gregorianDate) {
    try {
      const ethiopianMonthNames = [
        "መስከረም", "ጥቅምት", "ህዳር", "ታህሳስ", "ጥር", "የካቲት",
        "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሀምሌ", "ነሀሴ", "ጳጉሜ"
      ];
      const year = gregorianDate.getFullYear();
      const month = gregorianDate.getMonth() + 1;
      const day = gregorianDate.getDate();
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

  const handleView = (equbId) => {
    router.push(`/admin/completed-equbs/${equbId}`);
  };

  const handleDelete = async (equbId) => {
    setPendingDeleteId(equbId);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      const response = await fetch(`/api/completed-equbs/${pendingDeleteId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setShowModal(false);
        setPendingDeleteId(null);
        toast.success("Completed equb deleted successfully.");
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast.error("Failed to delete completed equb.");
      }
    } catch (error) {
      toast.error("Error deleting completed equb.");
    }
  };

  const cancelDelete = () => {
    setShowModal(false);
    setPendingDeleteId(null);
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/completed-equbs/export?date=${selectedDate}`);
      if (!res.ok) {
        toast.error("Failed to export CSV");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set filename directly using the selected date
      const year = new Date(selectedDate).getFullYear();
      const month = String(new Date(selectedDate).getMonth() + 1).padStart(2, '0');
      const day = String(new Date(selectedDate).getDate()).padStart(2, '0');
      const filename = `completed-equbs-${year}-${month}-${day}.csv`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Exported CSV successfully.");
    } catch (error) {
      toast.error("Error exporting data");
    }
  };

  // Delete all for selected date
  const handleDeleteAll = () => {
    setShowDeleteAllModal(true);
  };

  const confirmDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const response = await fetch(`/api/completed-equbs?date=${selectedDate}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success("All completed equbs for this day deleted successfully.");
        setShowDeleteAllModal(false);
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast.error("Failed to delete all completed equbs for this day.");
      }
    } catch (error) {
      toast.error("Error deleting all completed equbs for this day.");
    } finally {
      setDeletingAll(false);
    }
  };

  const cancelDeleteAll = () => {
    setShowDeleteAllModal(false);
  };

  const isExportDisabled = !filteredEqubs || filteredEqubs.length === 0;

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-white">Completed Equbs</h1>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            name="date"
            value={selectedDate}
            className="p-2 rounded border border-gray-400 text-black"
            onChange={handleDateChange}
            max={getDateString(new Date())}
          />
          <button
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
            onClick={handlePrev}
            title="Previous Day"
          >
            &#8592;
          </button>
          <button
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
            onClick={handleNext}
            title="Next Day"
            disabled={selectedDate >= getDateString(new Date())}
          >
            &#8594;
          </button>
          <button 
            onClick={handleExport}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isExportDisabled}
            title={isExportDisabled ? "No completed equbs to export" : "Export CSV"}
          >
            Export CSV
          </button>
          {isSystemAdmin && (
            <button
              onClick={handleDeleteAll}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isExportDisabled || deletingAll}
              title={isExportDisabled ? "No completed equbs to delete" : "Delete All Completed Equbs"}
            >
              {deletingAll ? "Deleting..." : "Delete All"}
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="bg-gray-700 text-white font-semibold p-4 text-left border-b-2 border-gray-600">Image</th>
              <th className="bg-gray-700 text-white font-semibold p-4 text-left border-b-2 border-gray-600">Owner Name</th>
              <th className="bg-gray-700 text-white font-semibold p-4 text-left border-b-2 border-gray-600">Amount</th>
              <th className="bg-gray-700 text-white font-semibold p-4 text-left border-b-2 border-gray-600">Start Date</th>
              <th className="bg-gray-700 text-white font-semibold p-4 text-left border-b-2 border-gray-600">End Date</th>
              <th className="bg-gray-700 text-white font-semibold p-4 text-left border-b-2 border-gray-600">Total Paid</th>
              <th className="bg-gray-700 text-white font-semibold p-4 text-left border-b-2 border-gray-600">Fee</th>
              <th className="bg-gray-700 text-white font-semibold p-4 text-left border-b-2 border-gray-600">Paid to Client</th>
              <th className="bg-gray-700 text-white font-semibold p-4 text-left border-b-2 border-gray-600">Completed By</th>
              <th className="bg-gray-700 text-white font-semibold p-4 text-left border-b-2 border-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEqubs.map((equb) => (
              <tr key={equb._id} className="hover:bg-gray-700">
                <td className="p-4 border-b border-gray-600 text-white">
                  {equb.imageURL && equb.imageURL.trim() !== "" ? (
                    <a href={equb.imageURL} target="_blank" rel="noopener noreferrer">
                      <Image src={equb.imageURL} alt="Equb Proof" width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #444' }} />
                    </a>
                  ) : (
                    <span className="text-gray-400">No Image</span>
                  )}
                </td>
                <td className="p-4 border-b border-gray-600 text-white">{equb.ownerName || "Unknown Owner"}</td>
                <td className="p-4 border-b border-gray-600 text-white">${(equb.equbAmount || 0).toLocaleString()}</td>
                <td className="p-4 border-b border-gray-600 text-white">{equb.equbStartDate ? convertToEthiopianDate(new Date(equb.equbStartDate)) : "N/A"}</td>
                <td className="p-4 border-b border-gray-600 text-white">{equb.endDate ? convertToEthiopianDate(new Date(equb.endDate)) : <span className="text-gray-400">-</span>}</td>
                <td className="p-4 border-b border-gray-600 text-white">${(equb.totalPayment || 0).toLocaleString()}</td>
                <td className="p-4 border-b border-gray-600 text-white">${(equb.fee || 0).toLocaleString()}</td>
                <td className="p-4 border-b border-gray-600 text-white">${((equb.totalPayment || 0) - (equb.fee || 0)).toLocaleString()}</td>
                <td className="p-4 border-b border-gray-600 text-white">
                  {equb.completedBy ? `${equb.completedBy.firstName || ""} ${equb.completedBy.lastName || ""}`.trim() || "Unknown" : "Unknown"}
                </td>
                <td className="p-4 border-b border-gray-600">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const ownerId = equb.ownerId;
                        if (ownerId && ownerId.trim() !== "") {
                          window.location.href = `/admin/users/${ownerId}`;
                        } else {
                          toast.error("Owner ID not available for this completed equb");
                        }
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white border-none py-1 px-3 rounded text-xs transition-colors"
                    >
                      View
                    </button>
                    {isSystemAdmin && !equb.archived && (
                      <button 
                        onClick={() => handleDelete(equb._id)}
                        className="bg-red-500 hover:bg-red-600 text-white border-none py-1 px-3 rounded text-xs transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="bg-gray-700 font-bold border-t-2 border-gray-600">
              <td className="p-4 text-white"></td> {/* Image */}
              <td className="p-4 text-white">Total</td> {/* Owner Name */}
              <td className="p-4 text-white"></td> {/* Amount (no sum) */}
              <td className="p-4 text-white"></td> {/* Start Date */}
              <td className="p-4 text-white"></td> {/* End Date */}
              <td className="p-4 text-white">${totals.totalPayment.toLocaleString()}</td>
              <td className="p-4 text-white">${totals.totalFee.toLocaleString()}</td>
              <td className="p-4 text-white">${totals.totalPaidToClient.toLocaleString()}</td>
              <td className="p-4 text-white"></td> {/* Completed By */}
              <td className="p-4 text-white"></td> {/* Actions */}
            </tr>
          </tbody>
        </table>
      </div>
      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Confirm Deletion</h2>
            <p className="mb-6 text-gray-800">Are you sure you want to delete this completed equb? This will delete the equb, its payments, and archive the completed equb.</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-900"
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Confirm Delete All</h2>
            <p className="mb-6 text-gray-800">Are you sure you want to delete ALL completed equbs? This will delete all equbs, all their payments, and archive all completed equbs. This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-900"
                onClick={cancelDeleteAll}
                disabled={deletingAll}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDeleteAll}
                disabled={deletingAll}
              >
                {deletingAll ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedEqubsClient; 