import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border-b border-slate-700/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between py-5">
        <Link href="/" className="text-3xl font-bold mb-3 sm:mb-0 tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent hover:from-blue-300 hover:to-cyan-300 transition-all duration-300">
          DFR
        </Link>
        <ul className="flex flex-col sm:flex-row gap-3 sm:gap-8 text-center sm:text-left">
          <li>
            <Link href="/" className="text-gray-300 hover:text-white transition-all duration-200 font-medium hover:scale-105 inline-block relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-blue-400 after:to-cyan-400 hover:after:w-full after:transition-all after:duration-300">
              Home
            </Link>
          </li>
          <li>
            <Link href="/graph" className="text-gray-300 hover:text-white transition-all duration-200 font-medium hover:scale-105 inline-block relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-blue-400 after:to-cyan-400 hover:after:w-full after:transition-all after:duration-300">
              Graph
            </Link>
          </li>
          <li>
            <Link href="/firmware" className="text-gray-300 hover:text-white transition-all duration-200 font-medium hover:scale-105 inline-block relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-blue-400 after:to-cyan-400 hover:after:w-full after:transition-all after:duration-300">
              Firmware
            </Link>
          </li>
          <li>
            <Link href="/status" className="text-gray-300 hover:text-white transition-all duration-200 font-medium hover:scale-105 inline-block relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-blue-400 after:to-cyan-400 hover:after:w-full after:transition-all after:duration-300">
              Status
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
