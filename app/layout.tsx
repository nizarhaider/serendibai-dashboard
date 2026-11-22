import type { Metadata } from "next";
import Script from "next/script";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { BerryTheme } from "@/components/berry-theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "SerendibAI · Customer Portal",
  description:
    "Your voice agents, knowledge and operations. One connected workspace.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><Script id="portal-theme" strategy="beforeInteractive">{`try{const t=localStorage.getItem("portal-theme");if(t==="dark"||(t===null&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch{}`}</Script><AppRouterCacheProvider options={{ enableCssLayer: true }}><BerryTheme>{children}</BerryTheme></AppRouterCacheProvider></body>
    </html>
  );
}
