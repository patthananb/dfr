"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function FirmwarePage() {
  const [message, setMessage] = useState("");
  const [espIds, setEspIds] = useState([]);
  const [selectedEspId, setSelectedEspId] = useState("");

  const sortedEspIds = useMemo(
    () => [...espIds].sort((a, b) => a.localeCompare(b)),
    [espIds]
  );

  const loadEspIds = async () => {
    try {
      const res = await fetch("/api/sites");
      if (!res.ok) {
        throw new Error("Failed to load sites");
      }
      const data = await res.json();
      const sites = Array.isArray(data.sites) ? data.sites : [];
      const uniqueIds = new Set();
      sites.forEach((site) => {
        site.devices?.forEach((device) => {
          if (device.id) {
            uniqueIds.add(device.id);
          }
        });
      });
      const ids = Array.from(uniqueIds);
      setEspIds(ids);
      if (!ids.includes(selectedEspId)) {
        setSelectedEspId(ids[0] || "");
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to load ESP32 IDs. Visit Site Setup to register sites.");
    }
  };

  useEffect(() => {
    loadEspIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFile = async (file) => {
    if (!selectedEspId) {
      setMessage("Select an ESP32 ID before uploading.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("espId", selectedEspId);
    const res = await fetch("/api/firmware", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      setMessage(`Upload successful for ${selectedEspId}`);
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
      <div className="w-full max-w-2xl">
        <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-8 sm:p-10 text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Upload Firmware</h1>
              <p className="text-gray-400 text-sm">Deploy new firmware to each ESP32 manually</p>
            </div>

            <div className="text-left space-y-2">
              <label className="text-sm font-medium text-gray-200">
                Select ESP32 ID
              </label>
              <select
                value={selectedEspId}
                onChange={(e) => setSelectedEspId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              >
                {sortedEspIds.length === 0 ? (
                  <option value="">Set up a site first</option>
                ) : (
                  <>
                    <option value="">Choose an ESP32</option>
                    {sortedEspIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <p className="text-xs text-gray-500">
                Need to register devices? Visit the{" "}
                <Link href="/sites/setup" className="text-cyan-400 hover:text-cyan-300 underline">
                  Site Setup
                </Link>{" "}
                page to add sites and ESP32 IDs.
              </p>
            </div>
            
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById("fileInput").click()}
              className="border-2 border-dashed border-slate-600 hover:border-cyan-500 w-full h-56 flex items-center justify-center cursor-pointer rounded-xl bg-slate-800/50 hover:bg-slate-800/70 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-cyan-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex flex-col items-center gap-4 z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-200 mb-1">Drag and drop a firmware file here</p>
                  <p className="text-sm text-gray-400">or click to select from your computer</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-yellow-500 font-medium">Please upload only .bin files</p>
            </div>
            
            <Link
              href="/firmware/guide"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-cyan-400 underline transition-colors group"
            >
              <svg className="w-4 h-4 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How to get .bin file from Arduino sketch?
            </Link>
            
            <input
              id="fileInput"
              type="file"
              accept=".bin"
              className="hidden"
              onChange={handleFileChange}
            />
            
            {message && (
              <div className={`mt-4 p-4 rounded-xl border ${
                message.includes("successful") 
                  ? "bg-green-900/30 border-green-500/50 text-green-300" 
                  : "bg-red-900/30 border-red-500/50 text-red-300"
              } flex items-center gap-3 animate-in fade-in duration-300`}>
                {message.includes("successful") ? (
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="font-medium">{message}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
