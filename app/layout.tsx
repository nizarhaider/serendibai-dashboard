import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { BerryTheme } from "@/components/berry-theme";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-sans" });
export const metadata: Metadata = {
  title: "SerendibAI · Customer Portal",
  description:
    "Your voice agents, knowledge and operations. One connected workspace.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={roboto.variable}>
      <body><AppRouterCacheProvider options={{ enableCssLayer: true }}><BerryTheme>{children}</BerryTheme></AppRouterCacheProvider></body>
    </html>
  );
}
