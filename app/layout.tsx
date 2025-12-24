import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Rubik_Spray_Paint } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _rubikSprayPaint = Rubik_Spray_Paint({
        weight: "400",
        subsets: ["latin"],
        variable: "--font-spraypaint",
});

export const metadata: Metadata = {
        title: "checklisting... ✅",
        description: "An infinite carousel checklist experience",
        generator: "v0.app",
        icons: {
                icon: "/icon.svg",
                shortcut: "/icon.svg",
                apple: "/icon.svg",
        },
        manifest: "/manifest.json",
};

export default function RootLayout({
        children,
}: Readonly<{
        children: React.ReactNode;
}>) {
        return (
                <html lang="en">
                        <head>
                                <link
                                        rel="icon"
                                        href="/icon.svg"
                                        type="image/svg+xml"
                                />
                                <link
                                        rel="shortcut icon"
                                        href="/favicon.svg"
                                        type="image/svg+xml"
                                />
                        </head>
                        <body
                                className={`font-sans antialiased ${_rubikSprayPaint.variable}`}
                        >
                                {children}
                                <Analytics />
                        </body>
                </html>
        );
}
