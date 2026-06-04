import type React from "react";
import type { Metadata } from "next";
import {
        Rubik_Spray_Paint,
        Open_Sans,
        Schoolbell,
        Fontdiner_Swanky,
} from "next/font/google";
import "./globals.css";

// Only the two fonts actually used are loaded. Geist/Geist_Mono were dead
// imports; @vercel/analytics was dropped — tracking weight is off-ethos for a
// minimalist, client-only toy and it counts against the first-load budget.
const _rubikSprayPaint = Rubik_Spray_Paint({
        weight: "400",
        subsets: ["latin"],
        variable: "--font-spraypaint",
});
const _openSans = Open_Sans({
        subsets: ["latin"],
        variable: "--font-opensans",
});
// Schoolbell — the handwritten "kindergarten" face for the todo items.
const _schoolbell = Schoolbell({
        weight: "400",
        subsets: ["latin"],
        variable: "--font-schoolbell",
});
// Fontdiner Swanky — the retro-diner display face for the empty-state prompt.
const _fontdinerSwanky = Fontdiner_Swanky({
        weight: "400",
        subsets: ["latin"],
        variable: "--font-fontdiner",
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
                                <meta
                                        name="viewport"
                                        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
                                />
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
                                className={`font-sans antialiased ${_rubikSprayPaint.variable} ${_openSans.variable} ${_schoolbell.variable} ${_fontdinerSwanky.variable}`}
                        >
                                {children}
                        </body>
                </html>
        );
}
