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
    <main className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8 text-gray-100">
      <div className="w-full max-w-2xl">
        <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-8 sm:p-10 text-center space-y-8">
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                Digital Fault Recorder
              </h1>
              <p className="text-gray-400 text-sm">Real-time fault monitoring and analysis system</p>
            </div>
            
            {fault ? (
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 p-6 rounded-xl shadow-inner border border-slate-600/50 space-y-3 transform hover:scale-[1.02] transition-transform duration-300">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400 font-semibold text-sm uppercase tracking-wide">Latest Fault Detected</span>
                </div>
                <div className="grid grid-cols-1 gap-3 text-left">
                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-blue-400 font-semibold min-w-[100px]">Fault Type:</span>
                    <span className="text-gray-200">{formatLabel(fault.faultType)}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-blue-400 font-semibold min-w-[100px]">Date & Time:</span>
                    <span className="text-gray-200">{formatDate(fault.date)} {formatTime(fault.time)}</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-blue-400 font-semibold min-w-[100px]">Location:</span>
                    <span className="text-gray-200">{formatLabel(fault.faultLocation)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/30 p-8 rounded-xl border border-slate-700/50">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-300 text-lg font-medium">All systems operational</p>
                  <p className="text-gray-500 text-sm">No faults recorded</p>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {fault && (
                <Link
                  href={`/graph?file=${latestFile}`}
                  className="flex-1 px-6 py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-lg hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105"
                >
                  View Latest Fault
                </Link>
              )}
              <Link
                href="/graph"
                className="flex-1 px-6 py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 transform hover:scale-105"
              >
                View All Graphs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
