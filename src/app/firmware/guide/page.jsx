import Link from "next/link";

export default function FirmwareGuidePage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 text-gray-100">
      <div className="w-full max-w-4xl bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">How to Get .bin File from Arduino Sketch</h1>
          <Link
            href="/firmware"
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Back to Upload
          </Link>
        </div>

        <div className="space-y-6 text-gray-200">
          <section>
            <h2 className="text-xl font-semibold mb-3 text-blue-400">Method 1: Using Arduino IDE 2.x</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Open your sketch in Arduino IDE 2.x</li>
              <li>
                Click on <strong>Sketch</strong> menu → <strong>Export Compiled Binary</strong>
              </li>
              <li>Wait for the compilation to complete</li>
              <li>
                The .bin file will be saved in your sketch folder (same directory as your .ino file)
              </li>
              <li>
                Look for a file with the extension <code className="bg-gray-700 px-2 py-1 rounded">.bin</code>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-blue-400">Method 2: Using Arduino IDE 1.x</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Open your sketch in Arduino IDE 1.x</li>
              <li>
                Hold <strong>Shift</strong> and click <strong>Sketch</strong> menu → <strong>Export compiled Binary</strong>
              </li>
              <li>Wait for the compilation to complete</li>
              <li>
                The .bin file will be saved in your sketch folder
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-blue-400">Method 3: Finding Temporary Build Files</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                In Arduino IDE, go to <strong>File</strong> → <strong>Preferences</strong>
              </li>
              <li>
                Enable <strong>"Show verbose output during: compilation"</strong>
              </li>
              <li>Compile your sketch by clicking the Verify button</li>
              <li>
                Look at the output console for a path containing <code className="bg-gray-700 px-2 py-1 rounded">/tmp/arduino_build_</code> or similar
              </li>
              <li>
                Navigate to that temporary directory and find the .bin file
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-blue-400">Method 4: Using Arduino CLI</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Install Arduino CLI if not already installed</li>
              <li>
                Run:{" "}
                <code className="bg-gray-700 px-2 py-1 rounded block mt-2">
                  arduino-cli compile --fqbn {"<board_fqbn>"} --output-dir ./output {"<sketch_path>"}
                </code>
              </li>
              <li>
                Replace <code className="bg-gray-700 px-2 py-1 rounded">{"<board_fqbn>"}</code> with your board's fully qualified name (e.g., <code className="bg-gray-700 px-2 py-1 rounded">esp32:esp32:esp32</code>)
              </li>
              <li>The .bin file will be in the output directory</li>
            </ol>
          </section>

          <section className="bg-yellow-900/30 p-4 rounded-lg border border-yellow-600/50">
            <h2 className="text-xl font-semibold mb-3 text-yellow-400">Important Notes</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Make sure you have selected the correct board and port before compiling</li>
              <li>The .bin file name typically matches your sketch name</li>
              <li>For ESP32/ESP8266 boards, you may see multiple .bin files (bootloader, partitions, app). Use the main application .bin file</li>
              <li>Ensure your sketch compiles successfully without errors before looking for the .bin file</li>
            </ul>
          </section>

          <div className="flex justify-center mt-8">
            <Link
              href="/firmware"
              className="px-6 py-3 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold"
            >
              Ready to Upload Firmware
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
