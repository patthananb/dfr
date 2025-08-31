import Link from "next/link";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const formatLabel = (str) =>
  str
    ? str
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

const formatTime = (timeStr) => (timeStr ? timeStr.slice(0, 5) : "");

export default async function Home() {
  const dataDir = join(process.cwd(), "data");
  let latestFile = "";
  let fault = null;

  try {
    let files = await readdir(dataDir);
    files = files.filter((name) => name !== ".gitkeep").sort();
    if (files.length > 0) {
      latestFile = files[files.length - 1];
      const content = await readFile(join(dataDir, latestFile), "utf-8");
      fault = JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading latest fault:", err);
  }

  return (
    <main className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
      <div className="w-full max-w-xl bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 text-center space-y-6">
        <h1 className="text-3xl sm:text-4xl font-bold">Digital Fault Recorder</h1>
        {fault ? (
          <div className="bg-gray-50 p-4 rounded-lg shadow-inner space-y-1">
            <p>
              <strong>Fault Type:</strong> {formatLabel(fault.faultType)}
            </p>
            <p>
              <strong>Date:</strong> {formatDate(fault.date)} {formatTime(fault.time)}
            </p>
            <p>
              <strong>Location:</strong> {formatLabel(fault.faultLocation)}
            </p>
          </div>
        ) : (
          <p className="text-gray-700">No faults recorded.</p>
        )}
        {fault && (
          <Link
            href={`/graph?file=${latestFile}`}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors block sm:inline-block w-full sm:w-auto"
          >
            View Latest Fault
          </Link>
        )}
        <Link
          href="/graph"
          className="px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors block sm:inline-block w-full sm:w-auto"
        >
          Go to Graph
        </Link>
      </div>
    </main>
  );
}
