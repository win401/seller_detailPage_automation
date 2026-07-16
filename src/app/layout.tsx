import type { Metadata } from "next";
import { Manrope, Noto_Sans_KR, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Detail-page canvas font choices (docs/TASKS.md typography preset work).
// Self-hosted (not next/font/google — none of these three are on Google
// Fonts) so the ZIP export capture (html-to-image) never hits a
// cross-origin font issue. Intentionally not added to --font-sans /
// --font-heading in globals.css: those stay the fixed app-chrome font,
// these are opt-in per-section/style-set choices only.
const pretendard = localFont({
  variable: "--font-pretendard",
  src: [
    { path: "./fonts/Pretendard-Regular.woff2", weight: "400" },
    { path: "./fonts/Pretendard-Bold.woff2", weight: "700" },
  ],
});

const gmarketSans = localFont({
  variable: "--font-gmarket-sans",
  src: [
    { path: "./fonts/GmarketSansMedium.woff2", weight: "500" },
    { path: "./fonts/GmarketSansBold.woff2", weight: "700" },
  ],
});

const sCoreDream = localFont({
  variable: "--font-s-core-dream",
  src: [
    { path: "./fonts/SCDreamRegular.woff2", weight: "400" },
    { path: "./fonts/SCDreamBold.woff2", weight: "700" },
  ],
});

export const metadata: Metadata = {
  title: "셀러페이지 AI",
  description: "상품 정보와 사진으로 상세페이지 초안을 생성하는 셀러용 AI 제작 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${manrope.variable} ${notoSansKr.variable} ${geistMono.variable} ${pretendard.variable} ${gmarketSans.variable} ${sCoreDream.variable}`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
