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
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl mb-4">Upload Firmware</h1>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById("fileInput").click()}
        className="border-2 border-dashed border-gray-400 w-[600px] h-[200px] flex items-center justify-center cursor-pointer"
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
  );
}
