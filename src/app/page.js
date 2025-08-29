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
    <main className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">
        Digital Fault Recorder
      </h1>
      {fault ? (
        <div className="bg-gray-100 p-4 rounded w-full max-w-md mb-4 text-center space-y-1">
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
        <p className="mb-4">No faults recorded.</p>
      )}
      {fault && (
        <Link
          href={`/graph?file=${latestFile}`}
          className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-center mb-2"
        >
          View Latest Fault
        </Link>
      )}
      <Link
        href="/graph"
        className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-center"
      >
        Go to Graph
      </Link>
    </main>
  );
}
