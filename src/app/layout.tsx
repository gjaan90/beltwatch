import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SKF BeltSight",
  description:
    "Conveyor vision for misalignment, oversized load, and splice & clips. SKF Australia preview.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
