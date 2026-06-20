import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "decrypter-theme";

function isDark() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const [dark, setDark] = useState(isDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {
      // storage unavailable — ignore
    }
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? "Tema claro" : "Tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-on-chrome)]/70 hover:bg-white/10 hover:text-[var(--text-on-chrome)] transition-colors"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
