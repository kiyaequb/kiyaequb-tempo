"use client";
import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import Image from "next/image";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const PreGivenEqubForm = ({ equbId, userId, onProcessing, onSubmitted, underManager }) => {
  const [fee, setFee] = useState("");
  const [penaltyReserve, setPenaltyReserve] = useState("");
  const [amountGiven, setAmountGiven] = useState("");
  const [images, setImages] = useState([]); // Array of Cloudinary URLs
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle multiple image uploads
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      toast.error("Cloudinary config missing. Please set env vars.");
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
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
          continue;
        }
        const result = await res.json();
        uploaded.push(result.secure_url);
        toast.success("Image uploaded!");
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      toast.error("Image upload failed: " + (err.message || "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fee || !penaltyReserve || !amountGiven || images.length === 0) {
      toast.error("All fields and at least one image are required.");
      return;
    }
    setIsLoading(true);
    if (onProcessing) onProcessing(true);
    try {
      const res = await fetch("/api/pre-given-equb/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equbId,
          fee: Number(fee),
          penaltyReserve: Number(penaltyReserve),
          amountGiven: Number(amountGiven),
          completionImages: images,
          requestedBy: userId,
          ...(underManager ? { underManager } : {}),
        }),
      });
      if (res.ok) {
        toast.success("PreGiven Equb request submitted!");
        if (onSubmitted) onSubmitted();
        setTimeout(() => window.location.reload(), 1200);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit request.");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
      if (onProcessing) onProcessing(false);
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
            <label htmlFor="penaltyReserve" className="block text-sm font-medium text-gray-300">
              Penalty Reserve (Original Amount)
            </label>
            <input
              type="number"
              id="penaltyReserve"
              name="penaltyReserve"
              placeholder="Penalty Reserve"
              className="mt-1 w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white"
              value={penaltyReserve}
              onChange={(e) => setPenaltyReserve(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="amountGiven" className="block text-sm font-medium text-gray-300">
              Amount Given
            </label>
            <input
              type="number"
              id="amountGiven"
              name="amountGiven"
              placeholder="Amount Given"
              className="mt-1 w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white"
              value={amountGiven}
              onChange={(e) => setAmountGiven(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="images" className="block text-sm font-medium text-gray-300">
              Upload Approval Images (multiple allowed)
            </label>
            <input
              type="file"
              id="images"
              name="images"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
              required
              disabled={isLoading || isUploading}
            />
            {isUploading && <p className="text-blue-400 text-sm mt-1">Uploading images...</p>}
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((url, idx) => (
                  <Image key={idx} src={url} alt="Uploaded preview" width={64} height={64} className="w-16 h-16 object-cover rounded border border-gray-500" />
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
            disabled={isLoading || isUploading || !fee || !penaltyReserve || !amountGiven || images.length === 0}
          >
            {isLoading ? "Processing..." : "Activate as PreGiven Equb"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PreGivenEqubForm; 