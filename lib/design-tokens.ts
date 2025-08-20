export const designTokens = {
  colors: {
    background: {
      primary: "#F9F9F7",
      container: "#F3F4F6",
      white: "#FFFFFF",
      sidebar: "#FAFAFA",
    },
    text: {
      primary: "#111827",
      secondary: "#6B7280",
      tertiary: "#9CA3AF",
    },
    border: {
      default: "#E5E7EB",
      light: "#F3F4F6",
    },
    semantic: {
      success: "#10B981",
      info: "#8B5CF6",
      warning: "#F59E0B",
      orange: "#FF8D4D",
    },
    status: {
      highly: "#10B981",
      good: "#8B5CF6",
      needs: "#F59E0B",
    },
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    fontSize: {
      xl: "24px",
      lg: "16px",
      md: "14px",
      sm: "12px",
    },
    fontWeight: {
      bold: 700,
      medium: 500,
      regular: 400,
    },
  },
  spacing: {
    unit2: "8px",
    unit4: "16px",
    unit6: "24px",
    unit8: "32px",
  },
  borderRadius: {
    md: "8px",
    full: "9999px",
  },
} as const
