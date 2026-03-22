import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amazon Seller Research Console",
  description: "Import and normalize seller review exports before VOC analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-stone-50 font-sans text-stone-950 flex flex-col">
        {children}
      </body>
    </html>
  );
}
