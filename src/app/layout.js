import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import Shell from "@/components/Shell";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--jetbrains-mono",
});

export const metadata = {
  title: "DFR — Digital Fault Recorder",
};

const themeBootstrap = `
(function () {
  try {
    var raw = localStorage.getItem("dfr-tweaks");
    var t = raw ? JSON.parse(raw) : {};
    var html = document.documentElement;
    html.setAttribute("data-theme", t.theme || "dark");
    html.setAttribute("data-accent", t.accent || "amber");
    html.setAttribute("data-density", t.density || "comfortable");
  } catch (e) {
    var html = document.documentElement;
    html.setAttribute("data-theme", "dark");
    html.setAttribute("data-accent", "amber");
    html.setAttribute("data-density", "comfortable");
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" data-accent="amber" data-density="comfortable" className={jetbrainsMono.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
