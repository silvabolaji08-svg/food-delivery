import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { CartDrawer } from "@/components/cart-drawer";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BiteBox — food delivery",
    template: "%s — BiteBox",
  },
  description:
    "Order from local restaurants and track your delivery from kitchen to door.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border mt-16">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            {/* The supplied artwork in its original stacked form, tagline
                included — the header only has room for the pieces. */}
            <Image
              src="/bitebox-lockup.png"
              alt="BiteBox — Good Food. Right to You."
              width={539}
              height={392}
              className="h-20 w-auto dark:hidden"
            />
            <Image
              src="/bitebox-lockup-dark.png"
              alt="BiteBox — Good Food. Right to You."
              width={539}
              height={392}
              className="hidden h-20 w-auto dark:block"
            />

            <div className="sm:text-right">
              <p>A demo food delivery app.</p>
              <p className="mt-1">Orders and payments here are simulated.</p>
              <p className="mt-2">
                <Link
                  href="/credits"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Photo credits
                </Link>
              </p>
            </div>
          </div>
        </footer>
        <CartDrawer />
      </body>
    </html>
  );
}
