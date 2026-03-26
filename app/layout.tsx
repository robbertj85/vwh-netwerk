import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vrachtwagenheffing Netwerk - Tolnetwerk Kaart Nederland",
  description:
    "Interactieve kaart van het vrachtwagenheffing tolnetwerk in Nederland. Bekijk secties, bereken routes en kosten, en download data als GeoJSON of GeoPackage.",
  keywords: [
    "vrachtwagenheffing",
    "tolnetwerk",
    "Nederland",
    "vrachtwagenbelasting",
    "HGV toll",
    "NDW",
    "tolberekening",
  ],
  openGraph: {
    title: "Vrachtwagenheffing Netwerk - Tolnetwerk Kaart Nederland",
    description:
      "Interactieve kaart van het vrachtwagenheffing tolnetwerk in Nederland. Bereken routes, kosten en download data.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
