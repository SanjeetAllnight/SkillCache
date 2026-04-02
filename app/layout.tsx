import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Manrope } from "next/font/google";

import "@/app/globals.css";
import { MockUserProvider } from "@/components/providers/mock-user-provider";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: {
    default: "SkillCache",
    template: "%s | SkillCache",
  },
  description:
    "A curated digital atelier for mentorship, sessions, and premium learning resources.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isLoggedIn =
    cookieStore.get(AUTH_COOKIE_NAME)?.value === AUTH_COOKIE_VALUE;

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body
        className={`${inter.variable} ${manrope.variable} bg-surface font-body text-on-surface antialiased`}
      >
        <MockUserProvider initialIsLoggedIn={isLoggedIn}>
          {children}
        </MockUserProvider>
      </body>
    </html>
  );
}
