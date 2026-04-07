import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import { ClerkProvider, Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const RobotoSans = Roboto({
  variable: "--font-roboto-sans",
  subsets: ["latin"],
});

const RobotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Easy Timesheets",
    template: "%s | Easy Timesheets",
  },
  description:
    "Easy Timesheets helps teams track work hours, submit timesheets, and streamline manager approvals.",
  applicationName: "Easy Timesheets",
  keywords: [
    "timesheets",
    "time tracking",
    "employee hours",
    "manager approvals",
    "payroll workflow",
  ],
  authors: [{ name: "Easy Timesheets" }],
  creator: "Easy Timesheets",
  publisher: "Easy Timesheets",
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: "Easy Timesheets",
    title: "Easy Timesheets",
    description:
      "Track employee hours, submit timesheets, and keep approvals moving in one simple workflow.",
  },
  twitter: {
    card: "summary",
    title: "Easy Timesheets",
    description:
      "Track employee hours, submit timesheets, and keep approvals moving in one simple workflow.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${RobotoSans.variable} ${RobotoMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <header className="border-b bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
            <a
              href="/dashboard"
              className="font-semibold text-lg tracking-tight"
            >
              Easy Timesheets
            </a>
            <div className="flex items-center gap-3">
              <Show when="signed-out">
                <SignInButton><button className="text-sm font-medium px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Sign In</button></SignInButton>
              </Show>
              <Show when="signed-in">
                <a
                  href="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </a>
                <UserButton />
              </Show>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <Toaster richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
