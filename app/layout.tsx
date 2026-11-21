import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, Geist_Mono, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const heading = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading" });
const sans = Inter({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
export const metadata: Metadata = {
  title: "SerendibAI · Customer Portal",
  description:
    "Your voice agents, knowledge and operations. One connected workspace.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(sans.variable, mono.variable, heading.variable, "font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
