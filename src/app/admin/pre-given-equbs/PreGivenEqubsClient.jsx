"use client";
import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import { format } from "date-fns";
import { convertToEthiopianDateMoreEnhanced } from "@/lib/convertToEthiopianDateMoreEnhanced";

const TABS = [
  { key: "pending", label: "Pending / Rejected" },
  { key: "active", label: "Active / Finished" },
  { key: "returned", label: "Returned" },
];

const PreGivenEqubsClient = ({ rows, isAdmin, isManager, tab, totals, initialDate }) => {
  // console.log('PreGivenEqubs rows:', rows);
  const [penaltyModal, setPenaltyModal] = useState({ open: false, penalties: [] });
  const [processingId, setProcessingId] = useState(null);
  const [processingAction, setProcessingAction] = useState("");
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null, row: null });
  const [imageModal, setImageModal] = useState({ open: false, images: [], index: 0 });
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(initialDate || (() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  }));
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchOwner, setSearchOwner] = useState("");
  // Search owner state for client-side search
  const [searchOwnerClient, setSearchOwnerClient] = useState("");

  // Set default status filter to "all" for active/finished tab
  useEffect(() => {
    if (tab === 'active' || tab === 'finished') {
      setStatusFilter('all');
    }
  }, [tab]);

  // Tab switching
  const handleTab = (key) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    // Reset status filter to "all" when switching to active tab
    if (key === 'active') {
      setStatusFilter('all');
    }
    router.replace(`?${params.toString()}`);
  };

  // Action handlers
  const doDelete = async (id) => {
    setProcessingId(id);
    setProcessingAction("delete");
    try {
      const res = await fetch(`/api/pre-given-equb/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Request deleted");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
      }
    } finally {
      setProcessingId(null);
      setProcessingAction("");
      setConfirmModal({ open: false, action: null, row: null });
    }
  };
  const doApprove = async (id) => {
    setProcessingId(id);
    setProcessingAction("approve");
    try {
      const res = await fetch(`/api/pre-given-equb/${id}/accept`, { method: "POST" });
      if (res.ok) {
        toast.success("Request approved");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to approve");
      }
    } finally {
      setProcessingId(null);
      setProcessingAction("");
      setConfirmModal({ open: false, action: null, row: null });
    }
  };
  const doReject = async (id) => {
    setProcessingId(id);
    setProcessingAction("reject");
    try {
      const res = await fetch(`/api/pre-given-equb/${id}/reject`, { method: "POST" });
      if (res.ok) {
        toast.success("Request rejected");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to reject");
      }
    } finally {
      setProcessingId(null);
      setProcessingAction("");
      setConfirmModal({ open: false, action: null, row: null });
    }
  };
  // Add a handler for the Return action
  const doReturn = async (id) => {
    setProcessingId(id);
    setProcessingAction("return");
    try {
      const res = await fetch(`/api/pre-given-equb/${id}/return`, { method: "POST" });
      if (res.ok) {
        toast.success("Marked as returned");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to return");
      }
    } finally {
      setProcessingId(null);
      setProcessingAction("");
      setConfirmModal({ open: false, action: null, row: null });
    }
  };

  // Columns per tab
  const columns = [
    { key: "images", label: "Images" },
    { key: "ownerName", label: "Owner" },
    { key: "amount", label: "Amount" },
    { key: "dateStarted", label: "Start Date" },
    { key: "total", label: "Total" },
    { key: "fee", label: "Fee" },
    { key: "penaltyReserve", label: "Penalty Reserve" },
    // Only show 'Remaining Penalty Reserve' for active/finished/returned tabs
    ...(tab === 'active' || tab === 'finished' || tab === 'returned' ? [{ key: "remainingPenaltyReserve", label: "Remaining Penalty Reserve" }] : []),
    { key: "amountGiven", label: "Amount Given" },
  ];
  if (tab === "returned") columns.push({ key: "returnedByName", label: "Returned By" });
  columns.push({ key: "status", label: "Status" });
  columns.push({ key: "actions", label: "Actions" });

  // Totals calculation for all relevant columns
  const sum = (key) => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

  // Filter rows by status for pending/rejected and active/finished tabs
  let filteredRows = rows;

// Filter by status
if (tab === 'pending') {
  if (statusFilter === 'pending') {
    filteredRows = rows.filter(r => r.status === 'pending');
  } else if (statusFilter === 'rejected') {
    filteredRows = rows.filter(r => r.status === 'rejected');
  }
} else if (tab === 'active' || tab === 'finished') {
  if (statusFilter === 'active') {
    filteredRows = rows.filter(r => r.status === 'approved');
  } else if (statusFilter === 'finished') {
    filteredRows = rows.filter(r => r.status === 'finished');
  } else {
    // statusFilter === 'all' — show both approved and finished
    filteredRows = rows.filter(r => r.status === 'approved' || r.status === 'finished');
  }
}

// Filter by owner name (client-side search)
if (searchOwnerClient.trim()) {
  filteredRows = filteredRows.filter(
    r =>
      r.ownerName &&
      r.ownerName.toLowerCase().includes(searchOwnerClient.trim().toLowerCase())
  );
}


  // Confirmation modal logic
  const openConfirm = (action, row) => setConfirmModal({ open: true, action, row });
  const closeConfirm = () => setConfirmModal({ open: false, action: null, row: null });
  const confirmAction = () => {
    if (!confirmModal.row) return;
    if (confirmModal.action === "approve") doApprove(confirmModal.row._id);
    if (confirmModal.action === "delete") doDelete(confirmModal.row._id);
    if (confirmModal.action === "redo") doDelete(confirmModal.row._id);
    if (confirmModal.action === "reject") {
      if (isAdmin) doReject(confirmModal.row._id);
      else if (isManager) doDelete(confirmModal.row._id);
    }
    if (confirmModal.action === "return") doReturn(confirmModal.row._id);
  };

  // Image modal logic
  const openImageModal = (images, index) => setImageModal({ open: true, images, index });
  const closeImageModal = () => setImageModal({ open: false, images: [], index: 0 });
  const nextImage = () => setImageModal((m) => ({ ...m, index: (m.index + 1) % m.images.length }));
  const prevImage = () => setImageModal((m) => ({ ...m, index: (m.index - 1 + m.images.length) % m.images.length }));

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
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", value);
    router.replace(`?${params.toString()}`);
  };
  const handlePrev = () => {
    setSelectedDate(prevDate);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", prevDate);
    router.replace(`?${params.toString()}`);
  };
  const handleNext = () => {
    if (selectedDate >= getDateString(new Date())) return;
    setSelectedDate(nextDate);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", nextDate);
    router.replace(`?${params.toString()}`);
  };

  // Table rendering
  return (
    <div className="overflow-x-auto">
      <Toaster position="top-right" />
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded-t ${tab === t.key ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
            onClick={() => handleTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Date navigation for pending/rejected and returned tabs */}
      {(tab === "pending" || tab === "returned" || tab === "active" || tab === "finished") && (
        <div className="flex gap-2 items-center mb-4">
          {/* Status filter dropdown */}
          {(tab === 'pending' || tab === 'active' || tab === 'finished') && (
            <select
              className="p-2 rounded border border-gray-400 text-black"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              {tab === 'pending' && <><option value="pending">Pending</option><option value="rejected">Rejected</option></>}
              {(tab === 'active' || tab === 'finished') && <><option value="active">Active</option><option value="finished">Finished</option></>}
            </select>
          )}
          {/* Date picker and arrows for all relevant tabs */}
          {(tab === "pending" || tab === "returned" || tab === "active" || tab === "finished") && !searchOwner && (
            <>
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
                disabled={getDateString(selectedDate) >= getDateString(new Date())}
              >
                &#8594;
              </button>
            </>
          )}
          {/* Owner search for active/finished tabs */}
          {(tab === 'active' || tab === 'finished') && (
            <div className="flex gap-1 items-center">
              <input
                type="text"
                placeholder="Search by owner name"
                className="p-2 rounded border border-gray-400 text-black"
                value={searchOwnerClient}
                onChange={e => setSearchOwnerClient(e.target.value)}
                style={{ minWidth: 200 }}
              />
              {searchOwnerClient && (
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded"
                  onClick={() => setSearchOwnerClient("")}
                  title="Clear search"
                >X</button>
              )}
            </div>
          )}
        </div>
      )}
      <table className="min-w-full bg-gray-800 text-white rounded-lg">
        <thead>
          <tr className="bg-gray-900">
            {columns.map((col) => (
              <th key={col.key} className="p-2 text-center">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => {
            const danger = row.remainingPenaltyReserve <= 0;
            return (
              <tr
                key={row._id}
                className={danger ? "bg-red-900" : "hover:bg-gray-700 cursor-pointer"}
                onClick={() => setPenaltyModal({ open: true, penalties: row.penalties || [] })}
              >
                <td className="p-2 flex items-center gap-2 justify-center text-center">
                  {row.images && row.images.length > 0 && (
                    <>
                      <Image
                        src={row.images[0]}
                        alt="proof"
                        width={40}
                        height={40}
                        className="rounded border border-gray-600 object-cover"
                        style={{ minWidth: 40, minHeight: 40 }}
                        onClick={e => { e.stopPropagation(); openImageModal(row.images, 0); }}
                      />
                      {row.images.length > 1 && (
                        <span
                          className="ml-1 px-0.5 py-0.5 bg-gray-600 rounded-full text-[10px] text-white select-none cursor-default"
                          title={`+${row.images.length - 1} more images`}
                        >
                          +{row.images.length - 1} more
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="p-2 text-center">{row.ownerName}</td>
                <td className="p-2 text-center">{row.amount}</td>
                <td className="p-2 text-center">{row.dateStarted ? `${convertToEthiopianDateMoreEnhanced(new Date(row.dateStarted)).dayName} ${convertToEthiopianDateMoreEnhanced(new Date(row.dateStarted)).day}-${convertToEthiopianDateMoreEnhanced(new Date(row.dateStarted)).month}-${convertToEthiopianDateMoreEnhanced(new Date(row.dateStarted)).year}` : "-"}</td>
                <td className="p-2 text-center">{row.total}</td>
                <td className="p-2 text-center">{row.fee}</td>
                <td className="p-2 text-center">{row.penaltyReserve}</td>
                {/* Only show 'Remaining Penalty Reserve' cell for active/finished/returned tabs */}
                {(tab === 'active' || tab === 'finished' || tab === 'returned') && (
                  <td className="p-2 flex items-center gap-1 justify-center text-center">{row.remainingPenaltyReserve}{row.remainingPenaltyReserve <= 0 && <span title="No more payments allowed!" className="text-red-400 ml-1">&#9888;</span>}</td>
                )}
                <td className="p-2 text-center">{row.amountGiven}</td>
                {tab === "returned" && <td className="p-2 text-center">{row.returnedByName}</td>}
                <td className="p-2 capitalize text-center">
                  <span
                    className={
                      (tab === "pending"
                        ? row.status === "pending"
                          ? "bg-yellow-600 text-black rounded px-2 py-0.5 text-xs"
                          : row.status === "rejected"
                          ? "bg-red-700 text-white rounded px-2 py-0.5 text-xs"
                          : ""
                        : tab === "active" || tab === "finished"
                        ? row.status === "approved"
                          ? "bg-green-700 text-white rounded px-2 py-0.5 text-xs"
                          : row.status === "finished"
                          ? "bg-black text-white rounded px-2 py-0.5 text-xs"
                          : ""
                        : tab === "returned"
                        ? row.status === "finished"
                          ? "bg-black text-white rounded px-2 py-0.5 text-xs"
                          : ""
                        : ""
                    )
                  }>
                    {row.status}
                  </span>
                </td>
                <td className="p-2 flex gap-2 justify-center text-center">
                  <button
                    className="bg-blue-600 px-2 py-1 rounded text-white"
                    onClick={e => { e.stopPropagation(); router.push(`/admin/users/${row.ownerId}`); }}
                  >View</button>
                  {/* Return button for finished rows in active/finished tab for admin/manager */}
                  {(tab === "active" || tab === "finished") && row.status === "finished" && row.isFinished && (isAdmin || isManager) && (
                    <button
                      className="bg-purple-600 px-2 py-1 rounded text-white"
                      disabled={processingId === row._id && processingAction === "return"}
                      onClick={e => { e.stopPropagation(); openConfirm("return", row); }}
                    >Return</button>
                  )}
                  {tab === "pending" && row.status === "pending" && isAdmin && (
                    <>
                      <button
                        className="bg-green-600 px-2 py-1 rounded text-white"
                        disabled={processingId === row._id && processingAction === "approve"}
                        onClick={e => { e.stopPropagation(); openConfirm("approve", row); }}
                      >Approve</button>
                      <button
                        className="bg-red-600 px-2 py-1 rounded text-white"
                        disabled={processingId === row._id && processingAction === "reject"}
                        onClick={e => { e.stopPropagation(); openConfirm("reject", row); }}
                      >Reject</button>
                    </>
                  )}
                  {tab === "pending" && row.status === "pending" && isManager && (
                    <button
                      className="bg-yellow-600 px-2 py-1 rounded text-white"
                      disabled={processingId === row._id && processingAction === "delete"}
                      onClick={e => { e.stopPropagation(); openConfirm("redo", row); }}
                    >Redo</button>
                  )}
                  {tab === "pending" && row.status === "rejected" && isAdmin && (
                    <button
                      className="bg-red-600 px-2 py-1 rounded text-white"
                      disabled={processingId === row._id && processingAction === "delete"}
                      onClick={e => { e.stopPropagation(); openConfirm("delete", row); }}
                    >Delete</button>
                  )}
                  {tab === "pending" && row.status === "rejected" && isManager && (
                    <></> // Remove redo button for rejected rows for managers
                  )}
                  {(tab === "active" || tab === "finished" || tab === "returned") && isAdmin && (
                    <button
                      className="bg-gray-700 px-2 py-1 rounded text-white"
                      disabled={processingId === row._id && processingAction === "delete"}
                      onClick={e => { e.stopPropagation(); openConfirm("delete", row); }}
                    >Delete</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        {/* Totals row */}
        <tfoot>
          <tr className="bg-gray-900 font-bold">
            <td className="p-2 text-center" colSpan={2}>Totals:</td>
            <td className="p-2 text-center">{sum("amount")}</td>
            <td className="p-2 text-center"></td>
            <td className="p-2 text-center">{sum("total")}</td>
            <td className="p-2 text-center">{sum("fee")}</td>
            <td className="p-2 text-center">{sum("penaltyReserve")}</td>
            {/* Only show 'Remaining Penalty Reserve' total for active/finished/returned tabs */}
            {(tab === 'active' || tab === 'finished' || tab === 'returned') && (
              <td className="p-2 text-center">{sum("remainingPenaltyReserve")}</td>
            )}
            <td className="p-2 text-center">{sum("amountGiven")}</td>
            {tab === "returned" && <td className="p-2 text-center"></td>}
            <td className="p-2 text-center"></td>
            <td className="p-2 text-center"></td>
          </tr>
        </tfoot>
      </table>
      {/* Image Modal */}
      {imageModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={closeImageModal}>
          <div className="relative bg-gray-900 rounded-lg p-4 flex flex-col items-center max-w-full max-h-full" style={{ minWidth: 320, minHeight: 240 }} onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-white text-2xl" onClick={closeImageModal}>&times;</button>
            <div className="flex items-center justify-center w-full h-full">
              <button
                className="text-white text-3xl px-2 py-1 bg-gray-700 rounded-full mr-2"
                onClick={e => { e.stopPropagation(); prevImage(); }}
                disabled={imageModal.images.length <= 1}
              >&lt;</button>
              <Image
                src={imageModal.images[imageModal.index]}
                alt={`proof ${imageModal.index + 1}`}
                width={320}
                height={320}
                className="rounded object-contain max-h-[60vh] max-w-[80vw]"
                style={{ minWidth: 120, minHeight: 120 }}
              />
              <button
                className="text-white text-3xl px-2 py-1 bg-gray-700 rounded-full ml-2"
                onClick={e => { e.stopPropagation(); nextImage(); }}
                disabled={imageModal.images.length <= 1}
              >&gt;</button>
            </div>
            <div className="text-gray-300 mt-2">{imageModal.index + 1} / {imageModal.images.length}</div>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={closeConfirm}>
          <div className="bg-gray-900 rounded-lg p-6 min-w-[320px] max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-white">Confirm Action</h2>
            <p className="mb-4 text-gray-300">
              {confirmModal.action === "approve" && "Are you sure you want to approve this request?"}
              {confirmModal.action === "delete" && "Are you sure you want to delete this request? This cannot be undone."}
              {confirmModal.action === "redo" && "Are you sure you want to redo (delete) this request? This cannot be undone."}
              {confirmModal.action === "reject" && "Are you sure you want to reject this request? This cannot be undone."}
              {confirmModal.action === "return" && "Are you sure you want to mark this as returned? This cannot be undone."}
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white"
                onClick={closeConfirm}
                disabled={processingId === confirmModal.row?._id}
              >Cancel</button>
              <button
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                onClick={confirmAction}
                disabled={processingId === confirmModal.row?._id}
              >
                {processingId === confirmModal.row?._id
                  ? (confirmModal.action === "approve" ? "Processing..." : "Processing...")
                  : (confirmModal.action === "approve"
                      ? "Approve"
                      : confirmModal.action === "reject"
                      ? "Reject"
                      : confirmModal.action === "redo"
                      ? "Redo"
                      : confirmModal.action === "return"
                      ? "Return"
                      : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Penalty Modal (optional, can be removed if not needed) */}
      {penaltyModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={() => setPenaltyModal({ open: false, penalties: [] })}>
          <div className="bg-gray-900 rounded-lg p-6 min-w-[320px] max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-white">Penalty History</h2>
            {penaltyModal.penalties.length === 0 ? (
              <div className="text-gray-400">No penalties.</div>
            ) : (
              <ul className="divide-y divide-gray-700">
                {penaltyModal.penalties.map((p, i) => (
                  <li key={i} className="py-2 flex flex-col">
                    <span>Date: {p.date ? new Date(p.date).toLocaleDateString() : "-"}</span>
                    <span>Amount: {p.amount}</span>
                    <span>Approved by: {p.approvedBy ? `${p.approvedBy.firstName || ""} ${p.approvedBy.lastName || ""}` : "-"}</span>
                  </li>
                ))}
              </ul>
            )}
            <button className="mt-4 bg-blue-600 px-4 py-2 rounded text-white" onClick={() => setPenaltyModal({ open: false, penalties: [] })}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreGivenEqubsClient; 