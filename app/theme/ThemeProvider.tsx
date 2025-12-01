import React, { createContext, useContext, useState, ReactNode } from "react";

interface Colors {
  background: string;
  card: string;
  text: string;
  subtext: string;
  accent: string;
  success: string;
  successBg: string;
  error: string;
  errorBg: string;
  warning: string;
  warningBg: string;
  primary: string;
  info: string
  border: string;
}

interface ThemeContextType {
  darkMode: boolean;
  toggleTheme: () => void;
  colors: Colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightColors: Colors = {
  background: "#fff",
  card: "#fff",
  text: "#333",
  subtext: "#555",
  accent: "#f5a623",
  primary: "#3498db",
  info: "#3498db",
  border: "#cccccc",

  // Status colors
  success: "#16a34a",
  successBg: "#DCFCE7",
  error: "#DC2626",
  errorBg: "#FEE2E2",
  warning: "#D97706",
  warningBg: "#FEF3C7",
};

const darkColors: Colors = {
  background: "#121212",
  card: "#1e1e1e",
  text: "#eee",
  subtext: "#aaa",
  accent: "#f5a623",
  primary: "#3498db",
  info: "#3498db",
  border: "#333333",

  // Status colors (dark mode)
  success: "#4ade80",
  successBg: "rgba(74, 222, 128, 0.15)",
  error: "#f87171",
  errorBg: "rgba(248, 113, 113, 0.15)",
  warning: "#fbbf24",
  warningBg: "rgba(251, 191, 36, 0.15)",
};

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = (): void => setDarkMode((prev) => !prev);

  const value: ThemeContextType = {
    darkMode,
    toggleTheme,
    colors: darkMode ? darkColors : lightColors,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
