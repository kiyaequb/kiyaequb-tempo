"use client";
import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import Image from "next/image";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
const CompleteEqubForm = ({ equbId, ownerId }) => {
  const [showModal, setShowModal] = useState(false);
  const [fee, setFee] = useState("");
  const [image, setImage] = useState(null); // File object
  const [imageUrl, setImageUrl] = useState(""); // Cloudinary URL
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Handle image selection and upload
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (!file) return;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      toast.error("Cloudinary config missing. Please set env vars.");
      setImageUrl("");
      return;
    }
    setIsUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: data,
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Image upload failed: " + (err.error?.message || res.statusText));
        setImageUrl("");
        return;
      }
      const result = await res.json();
      setImageUrl(result.secure_url);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      toast.error("Image upload failed: " + (err.message || "Unknown error"));
      setImageUrl("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fee || !imageUrl) {
      toast.error("Please provide both a fee and an image.");
      return;
    }
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setShowModal(false);
    setIsLoading(true);
    try {
      // Send data to our backend
      const backendData = new FormData();
      backendData.append("equbId", equbId);
      backendData.append("fee", fee);
      backendData.append("imageURL", imageUrl);
      backendData.append("ownerId", ownerId);

      const backendRes = await fetch("/api/complete-equb", {
        method: "POST",
        body: backendData,
      });

      if (backendRes.ok) {
        toast.success("Equb completed successfully!");
        setFee("");
        setImage(null);
        setImageUrl("");
        setTimeout(() => window.location.reload(), 1200);
      } else {
        const err = await backendRes.json();
        throw new Error(err.error || "Failed to complete equb.");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="fee" className="block text-sm font-medium text-gray-300">
              Fee
            </label>
            <input
              type="number"
              id="fee"
              name="fee"
              placeholder="Amount of Fee"
              className="mt-1 w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-300">
              Upload Completion Proof (Image)
            </label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
              required
              disabled={isLoading || isUploading}
            />
            {isUploading && <p className="text-blue-400 text-sm mt-1">Uploading image...</p>}
            {imageUrl && (
              <div className="mt-2">
                <Image src={imageUrl} alt="Uploaded preview" width={128} height={128} className="w-32 h-32 object-cover rounded border border-gray-500" />
              </div>
            )}
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
            disabled={isLoading || isUploading || !fee || !imageUrl}
          >
            Complete Equb
          </button>
        </div>
      </form>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 text-white">Confirm Completion</h2>
            <p className="mb-6 text-gray-300">
              Are you sure? This action will finalize the equb.
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white"
                onClick={() => setShowModal(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? "Completing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteEqubForm; 