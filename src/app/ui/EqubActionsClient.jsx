"use client";
import { useState } from "react";
import PreGivenEqubForm from "./PreGivenEqubForm";
import CompleteEqubForm from "./CompleteEqubForm";

const EqubActionsClient = ({ preGivenDetails, completedEqubExists, isSystemAdmin, equbId, ownerId, userId, disableForms }) => {
  const [showPreGivenForm, setShowPreGivenForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localPreGivenPending, setLocalPreGivenPending] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Only admin/manager can see actions or status
  const isAdminOrManager = userId === ownerId; // Assuming ownerId is the user who created the equb

  // If forms are disabled, show a message and do not render forms
  if (disableForms) {
    let statusMsg = null;
    if (preGivenDetails) {
      switch (preGivenDetails.status) {
        case "pending":
          statusMsg = "A Pre Given Equb request is pending admin approval for this Equb.";
          break;
        case "approved":
          statusMsg = "This Equb is an active Pre Given Equb.";
          break;
        case "finished":
          statusMsg = "This Equb's Pre Given cycle is finished.";
          break;
        default:
          statusMsg = "A Pre Given Equb request is already in progress or completed for this Equb.";
      }
    } else {
      statusMsg = "A Pre Given Equb request is already in progress or completed for this Equb.";
    }
    return <div className="text-yellow-400 font-bold my-4">{statusMsg}</div>;
  }

  // If preGivenDetails is pending or locally pending, only show to admin/manager
  if ((preGivenDetails && preGivenDetails.status === "pending") || localPreGivenPending) {
    if (isAdminOrManager) {
      return <div className="text-yellow-400 font-bold my-4">Waiting for admin approval</div>;
    } else {
      return null;
    }
  }
  // If preGivenDetails is active/approved/finished, only show to admin/manager
  if (preGivenDetails && preGivenDetails.status !== "pending") {
    if (isAdminOrManager) {
      return <div className="text-blue-400 font-bold my-4">This Equb is a Pre Given (Penalty Reserve) Equb.</div>;
    } else {
      return null;
    }
  }

  const underManager = userId;

  // Delete logic (admin only)
  const handleDelete = () => {
    setShowDeleteModal(true);
    setDeleteError("");
  };
  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/equbs/${equbId}`, { method: "DELETE" });
      if (response.ok) {
        setShowDeleteModal(false);
        setDeleting(false);
        window.location.reload();
      } else {
        const data = await response.json();
        setDeleteError(data.error || "Failed to delete equb.");
        setDeleting(false);
      }
    } catch (err) {
      setDeleteError("Error deleting equb.");
      setDeleting(false);
    }
  };
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteError("");
  };

  if (!completedEqubExists) {
    return (
      <>
        {/* Remove admin-only delete button and modal here */}
        {!showPreGivenForm ? (
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => setShowPreGivenForm(true)}
          >
            Activate as Pre Given Equb
          </button>
        ) : (
          <PreGivenEqubForm
            equbId={equbId}
            userId={userId}
            onProcessing={setIsProcessing}
            onSubmitted={() => {
              setLocalPreGivenPending(true);
              setShowPreGivenForm(false);
            }}
          />
        )}
        {/* Only show CompleteEqubForm if not showing PreGiven form */}
        {!showPreGivenForm && (
          <CompleteEqubForm equbId={equbId} ownerId={ownerId} />
        )}
        {isProcessing && (
          <div className="text-blue-400 font-bold my-2">Processing...</div>
        )}
      </>
    );
  }

  // Fallback: show nothing
  return null;
};

export default EqubActionsClient; 