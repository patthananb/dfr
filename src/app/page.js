import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-center">
        Digital Fault Recorder
      </h1>
      <Link
        href="/graph"
        className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-center"
      >
        Go to Graph
      </Link>
    </main>
  );
}
