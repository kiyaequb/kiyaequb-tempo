"use client";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@nextui-org/card";
import {
  Avatar,
  Image,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/react";
import axios from "axios";
// import LoadingSkeleton from "./LoadingSkeleton";
import styles from "@/app/ui/dashboard/users/users.module.css";
import { format } from "timeago.js";

const BhB = ({ equb, isSystemAdmin }) => {
  console.log('BhB equb:', equb);
  console.log('BhB equb._id:', equb?._id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEqubId, setSelectedEqubId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Delete equb (admin only)
  const deleteEqub = async (id) => {
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/equbs/${id}`, { method: "DELETE" });
      if (response.ok) {
        setIsModalOpen(false);
        setDeleting(false);
        window.location.reload();
      } else {
        const data = await response.json();
        setDeleteError(data.error || "Failed to delete equb.");
        setDeleting(false);
      }
    } catch (error) {
      setDeleteError("Error deleting equb.");
      setDeleting(false);
    }
  };

  const handleDelete = (id) => {
    setSelectedEqubId(id);
    setIsModalOpen(true);
    setDeleteError("");
  };

  if (!isSystemAdmin || !equb || !equb._id) return null;

  return (
    <div className="">
      {/* Modal for approval/deletion confirmation */}
      <button
        onClick={() => handleDelete(equb._id.toString())}
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mb-2"
        disabled={deleting}
      >
        Delete
      </button>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <ModalContent>
          <ModalHeader>
            <h2 className="text-xl font-bold text-black-900" style={{ color: "black" }}>
              Confirm Deletion
            </h2>
          </ModalHeader>
          <ModalBody>
            <p className="text-black-900" style={{ color: "black" }}>
              Are you sure you want to delete this equb? This will delete the equb, all its payments, and archive the completed equb if it exists.
            </p>
            {deleteError && <div className="text-red-600 mb-2">{deleteError}</div>}
          </ModalBody>
          <ModalFooter>
            <button
              onClick={() => setIsModalOpen(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700"
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              onClick={() => deleteEqub(selectedEqubId)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              disabled={deleting}
            >
              {deleting ? "Processing..." : "Delete"}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default BhB;
