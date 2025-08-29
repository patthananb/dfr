'use client';

import Link from "next/link";
import { useEffect, useState } from 'react';

// Utility functions for formatting
const formatLabel = str =>
  str
    ? str
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : '';

const formatDate = dateStr => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatTime = timeStr => (timeStr ? timeStr.slice(0, 5) : '');

export default function Home() {
  const [latestFault, setLatestFault] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestFault = async () => {
      try {
        const res = await fetch('/api/data?latest=true');
        const result = await res.json();
        
        if (result.success && result.files?.[0]) {
          const fileContent = result.files[0];
          const json = JSON.parse(fileContent);
          
          setLatestFault({
            faultType: json.faultType,
            faultLocation: json.faultLocation,
            date: json.date,
            time: json.time,
            filename: result.latestFile
          });
        }
      } catch (error) {
        console.error('Error fetching latest fault data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestFault();
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">
        Digital Fault Recorder
      </h1>
      
      {/* Latest Fault Data Section */}
      <div className="w-full max-w-md mb-8 p-6 bg-gray-100 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-800">
          Latest Fault Data
        </h2>
        
        {loading ? (
          <p className="text-center text-gray-600">Loading...</p>
        ) : latestFault ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Fault Type:</span>
              <span className="text-gray-900">{formatLabel(latestFault.faultType)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Location:</span>
              <span className="text-gray-900">{formatLabel(latestFault.faultLocation)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Date:</span>
              <span className="text-gray-900">{formatDate(latestFault.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Time:</span>
              <span className="text-gray-900">{formatTime(latestFault.time)}</span>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-600">No fault data available</p>
        )}
      </div>

      <Link
        href="/graph"
        className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-center"
      >
        Go to Graph
      </Link>
    </main>
  );
}
