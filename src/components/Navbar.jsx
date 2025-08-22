import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <ul className="flex gap-4">
        <li>
          <Link href="/" className="hover:underline">Home</Link>
        </li>
        <li>
          <Link href="/graph" className="hover:underline">Graph</Link>
        </li>
      </ul>
    </nav>
  );
}
