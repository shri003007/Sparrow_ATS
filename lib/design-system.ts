export const designSystem = {
  colors: {
    // Backgrounds
    primary: "#F9F9F7", // Main canvas - soft off-white/beige
    container: "#F3F4F6", // Light gray for containers like tab bar
    white: "#FFFFFF",
    sidebar: "#FAFAFA", // Slightly off-white for sidebar

    // Text
    primary: "#111827", // Near-black for high readability
    secondary: "#6B7280", // Medium gray for secondary text
    tertiary: "#9CA3AF", // Lighter gray for metadata

    // Borders
    default: "#E5E7EB", // Light gray for dividers and borders
    light: "#F3F4F6",

    // Semantic colors (exact from analysis)
    success: "#10B981", // Green for "Highly recommended"
    info: "#8B5CF6", // Purple/blue for "Good hire"
    warning: "#F59E0B", // Orange for "Needs discussion"
    brand: "#FF8D4D", // Orange for branding
  },

  typography: {
    // Font family - using system fonts
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",

    // Font sizes (exact from analysis)
    h1: "24px", // Page titles
    bodyLarge: "16px", // Primary data like names
    bodyRegular: "14px", // Standard body text
    bodySmall: "12px", // Metadata and labels

    // Font weights
    bold: 700, // For headings
    medium: 500, // For emphasized text like names
    regular: 400, // Standard body text
  },

  spacing: {
    // 8px base unit system
    xs: "4px", // 0.5 units
    sm: "8px", // 1 unit
    md: "16px", // 2 units
    lg: "24px", // 3 units
    xl: "32px", // 4 units
    xxl: "48px", // 6 units
  },

  borderRadius: {
    sm: "4px",
    md: "8px", // Standard for buttons, tags, inputs
    lg: "12px",
    full: "9999px", // For pill shapes
  },

  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  },
} as const
