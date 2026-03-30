"use client";

import { ThemeProvider } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ThemeToggle className="hidden md:inline-flex" />
      {children}
    </ThemeProvider>
  );
}
