"use client";

import { useState } from "react";

export default function FirmwarePage() {
  const [message, setMessage] = useState("");

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/firmware", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      setMessage("Upload successful");
    } else {
      setMessage("Upload failed");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 text-gray-100">
      <div className="w-full max-w-xl bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-6 text-center">
        <h1 className="text-2xl mb-4 font-semibold">Upload Firmware</h1>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById("fileInput").click()}
          className="border-2 border-dashed border-gray-500 w-full h-48 flex items-center justify-center cursor-pointer rounded-lg bg-gray-700 hover:bg-gray-600 transition text-center"
        >
          Drag and drop a firmware file here or click to select
        </div>
        <input
          id="fileInput"
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        {message && <p className="mt-4">{message}</p>}
      </div>
    </div>
  );
}
