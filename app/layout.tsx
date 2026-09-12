import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hridhaan Sahay — Cybersecurity × Space",
  description: "Hridhaan Sahay — student builder exploring cybersecurity, space, technology, engineering, and astrophotography through real projects.",
  keywords: ["Hridhaan Sahay", "cybersecurity", "space", "astrophotography", "BitBuzz", "student builder", "technology"],
  authors: [{ name: "Hridhaan Sahay" }],
  openGraph: {
    title: "Hridhaan Sahay — Cybersecurity × Space",
    description: "A student builder working where cybersecurity, space, science, and software meet.",
    type: "website",
    url: "https://hridhaan.me"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body>{children}</body></html>;
}
