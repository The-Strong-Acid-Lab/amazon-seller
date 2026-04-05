import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amazon Listing Boost",
  description: "Amazon seller strategy workspace for reviews, listing optimization, and image planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans text-stone-950 flex flex-col">
        {children}
      </body>
    </html>
  );
}
