import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">Sensor Dashboard</h1>
      <p className="mb-4 text-center">
        Upload sensor CSV data and explore charts on the graph page.
      </p>
      <Link href="/graph" className="text-blue-600 underline">
        View Graphs
      </Link>
    </main>
  );
}
