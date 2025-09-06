export default function AboutPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 text-gray-100">
      <div className="w-full max-w-xl bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-6 text-center space-y-4">
        <h1 className="text-2xl font-semibold">About Me</h1>
        <p>
          This project visualizes digital fault recorder data and demonstrates a simple
          Next.js app with Tailwind CSS and Chart.js.
        </p>
      </div>
    </div>
  );
}
