"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { playClick } from "@/lib/click-sound";

export const THEME_KEY = "contour-theme";

/** Switches the whole site between dark and light, with a click you can hear. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // The pre-paint script in the layout already applied the saved theme; mirror it.
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    playClick();
    setTheme(next);
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not remembered, still switched.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === "light"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={`btn-secondary h-9 w-9 shrink-0 px-0 active:scale-90 ${className}`}
    >
      {theme === "dark" ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
    </button>
  );
}
