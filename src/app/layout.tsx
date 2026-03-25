import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AnglerIQ — Tournament-Proven Fishing Intel",
  description: "Search tournament-winning techniques, baits, and conditions by body of water.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
