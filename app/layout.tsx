import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter_Tight, Sora } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import QueryProvider from "@/src/providers/QueryProvider";
import { Toaster } from "sileo";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});


export const metadata: Metadata = {
  title: "Pedilo",
  description: "Recibe pedidos claros, directo en WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${interTight.variable} ${sora.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >

      <body className="flex min-h-full flex-col bg-background text-foreground">
        <QueryProvider>
          <Toaster position="top-right" />
          {children}</QueryProvider>
      </body>
    </html>
  );
}
