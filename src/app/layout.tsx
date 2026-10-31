import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Link from "next/link";
import { DemoToggle } from "@/components/ui";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["600", "700", "900"] });

export const metadata: Metadata = {
  title: "Product on Trial: is your skincare actually working?",
  description:
    "Put your skincare on trial. YouCam Skin AI scans are the evidence, and the court rules: acquitted, guilty, or case continued.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>⚖️</span>
              <span className="font-serif text-xl font-bold tracking-tight">Product on Trial</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/" className="btn btn-ghost !py-2 text-sm">Docket</Link>
              <Link href="/case/new" className="btn btn-primary !py-2 text-sm">File a case</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          Evidence analyzed by YouCam Skin AI · Not medical advice · <DemoToggle />
        </footer>
      </body>
    </html>
  );
}
