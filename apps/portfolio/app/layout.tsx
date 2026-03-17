import { NavBar } from "@/components/NavBar/NavBar";
import { LoadingScreen } from "@/components/LoadingScreen/LoadingScreen";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yohaan Khan",
  description: "AI Systems & Experiments",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-primary">
        <LoadingScreen />
        <NavBar />
        {children}
        <Analytics />
      </body>
    </html>
  );
}