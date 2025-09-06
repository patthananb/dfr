import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between py-4">
        <Link href="/" className="text-2xl font-semibold mb-2 sm:mb-0">
          DFR
        </Link>
        <ul className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-center sm:text-left">
          <li>
            <Link href="/" className="hover:text-gray-200 transition-colors">
              Home
            </Link>
          </li>
          <li>
            <Link href="/graph" className="hover:text-gray-200 transition-colors">
              Graph
            </Link>
          </li>
          <li>
            <Link href="/firmware" className="hover:text-gray-200 transition-colors">
              Firmware
            </Link>
          </li>
          <li>
            <Link href="/about" className="hover:text-gray-200 transition-colors">
              About
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
