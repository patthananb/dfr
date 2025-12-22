import Link from "next/link";

export default function FirmwareGuidePage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8 text-gray-100">
      <div className="w-full max-w-5xl">
        <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-6 sm:p-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  How to Get .bin File
                </h1>
                <p className="text-gray-400 mt-2">from Arduino Sketch</p>
              </div>
              <Link
                href="/firmware"
                className="px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-lg hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105 whitespace-nowrap"
              >
                Back to Upload
              </Link>
            </div>

            <div className="space-y-8 text-gray-200">
              <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-colors duration-300">
                <h2 className="text-2xl font-bold mb-4 text-blue-400 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-lg text-lg">1</span>
                  Using Arduino IDE 2.x
                </h2>
                <ol className="list-decimal list-inside space-y-3 ml-4 text-gray-300">
                  <li className="pl-2">Open your sketch in Arduino IDE 2.x</li>
                  <li className="pl-2">
                    Click on <strong className="text-white">Sketch</strong> menu → <strong className="text-white">Export Compiled Binary</strong>
                  </li>
                  <li className="pl-2">Wait for the compilation to complete</li>
                  <li className="pl-2">
                    The .bin file will be saved in your sketch folder (same directory as your .ino file)
                  </li>
                  <li className="pl-2">
                    Look for a file with the extension <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400 font-mono text-sm">.bin</code>
                  </li>
                </ol>
              </section>

              <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-colors duration-300">
                <h2 className="text-2xl font-bold mb-4 text-blue-400 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-lg text-lg">2</span>
                  Using Arduino IDE 1.x
                </h2>
                <ol className="list-decimal list-inside space-y-3 ml-4 text-gray-300">
                  <li className="pl-2">Open your sketch in Arduino IDE 1.x</li>
                  <li className="pl-2">
                    Hold <strong className="text-white">Shift</strong> and click <strong className="text-white">Sketch</strong> menu → <strong className="text-white">Export compiled Binary</strong>
                  </li>
                  <li className="pl-2">Wait for the compilation to complete</li>
                  <li className="pl-2">The .bin file will be saved in your sketch folder</li>
                </ol>
              </section>

              <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-colors duration-300">
                <h2 className="text-2xl font-bold mb-4 text-blue-400 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-lg text-lg">3</span>
                  Finding Temporary Build Files
                </h2>
                <ol className="list-decimal list-inside space-y-3 ml-4 text-gray-300">
                  <li className="pl-2">
                    In Arduino IDE, go to <strong className="text-white">File</strong> → <strong className="text-white">Preferences</strong>
                  </li>
                  <li className="pl-2">
                    Enable <strong className="text-white">"Show verbose output during: compilation"</strong>
                  </li>
                  <li className="pl-2">Compile your sketch by clicking the Verify button</li>
                  <li className="pl-2">
                    Look at the output console for a path containing <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400 font-mono text-sm">/tmp/arduino_build_</code> or similar
                  </li>
                  <li className="pl-2">Navigate to that temporary directory and find the .bin file</li>
                </ol>
              </section>

              <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-colors duration-300">
                <h2 className="text-2xl font-bold mb-4 text-blue-400 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-lg text-lg">4</span>
                  Using Arduino CLI
                </h2>
                <ol className="list-decimal list-inside space-y-3 ml-4 text-gray-300">
                  <li className="pl-2">Install Arduino CLI if not already installed</li>
                  <li className="pl-2">
                    Run:{" "}
                    <code className="bg-slate-900 px-3 py-2 rounded text-cyan-400 font-mono text-sm block mt-2 overflow-x-auto">
                      arduino-cli compile --fqbn {"<board_fqbn>"} --output-dir ./output {"<sketch_path>"}
                    </code>
                  </li>
                  <li className="pl-2">
                    Replace <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400 font-mono text-sm">{"<board_fqbn>"}</code> with your board's fully qualified name (e.g., <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400 font-mono text-sm">esp32:esp32:esp32</code>)
                  </li>
                  <li className="pl-2">The .bin file will be in the output directory</li>
                </ol>
              </section>

              <section className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 p-6 rounded-xl border border-yellow-600/50 shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-yellow-400 flex items-center gap-3">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Important Notes
                </h2>
                <ul className="list-disc list-inside space-y-3 ml-4 text-gray-300">
                  <li className="pl-2">Make sure you have selected the correct board and port before compiling</li>
                  <li className="pl-2">The .bin file name typically matches your sketch name</li>
                  <li className="pl-2">For ESP32/ESP8266 boards, you may see multiple .bin files (bootloader, partitions, app). Use the main application .bin file</li>
                  <li className="pl-2">Ensure your sketch compiles successfully without errors before looking for the .bin file</li>
                </ul>
              </section>

              <div className="flex justify-center mt-8">
                <Link
                  href="/firmware"
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500 shadow-xl hover:shadow-green-500/50 transition-all duration-300 font-semibold text-lg transform hover:scale-105"
                >
                  Ready to Upload Firmware
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
