import "./globals.css";
export const metadata = {
  title: "VibeForge — From idea to production",
  description:
    "Plan software, generate validated specifications, coordinate coding agents and review delivery evidence. A Ghazwah Group product.",
  applicationName: "VibeForge",
  openGraph: {
    title: "VibeForge — Build with direction. Ship with confidence.",
    description: "AI development workspace by Ghazwah Group.",
    type: "website",
  },
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
