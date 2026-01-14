type Theme = "light" | "dark" | "system";
export declare const ThemeProvider: ({ children }: {
    children: React.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const useTheme: () => {
    theme: Theme;
    setTheme: (t: Theme) => void;
};
export {};
