"use client";

import { useState } from "react";
import Link from "next/link";

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
    if (!file) return;
    if (!file.name.endsWith(".bin")) {
      setMessage("Only .bin files are allowed");
      return;
    }
    uploadFile(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".bin")) {
      setMessage("Only .bin files are allowed");
      return;
    }
    uploadFile(file);
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
        <p className="mt-2 text-sm text-yellow-400">Please upload only .bin files.</p>
        <Link
          href="/firmware/guide"
          className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300 underline transition-colors"
        >
          How to get .bin file from Arduino sketch?
        </Link>
        <input
          id="fileInput"
          type="file"
          accept=".bin"
          className="hidden"
          onChange={handleFileChange}
        />
        {message && <p className="mt-4">{message}</p>}
      </div>
    </div>
  );
}
