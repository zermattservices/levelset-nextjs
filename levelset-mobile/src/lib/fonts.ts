/**
 * Levelset Typography Configuration
 */

export const fontFamilies = {
  // Headings - Mont
  heading: "Mont-Bold",
  headingRegular: "Mont-Regular",

  // Body - Satoshi
  body: "Satoshi-Variable",
  bodyRegular: "Satoshi-Variable",
  bodyMedium: "Satoshi-Variable",
  bodyBold: "Satoshi-Variable",

  // Fallback
  mono: "SpaceMono-Regular",
} as const;

export const fontWeights = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// Typography presets
export const typography = {
  // Headings (Mont Bold)
  h1: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes["3xl"],
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes["3xl"] * lineHeights.tight,
  },
  h2: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes["2xl"] * lineHeights.tight,
  },
  h3: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes.xl * lineHeights.tight,
  },
  h4: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes.lg * lineHeights.tight,
  },

  // Body (Satoshi)
  bodyLarge: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.lg * lineHeights.normal,
  },
  bodyMedium: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.base * lineHeights.normal,
  },
  bodySmall: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.sm * lineHeights.normal,
  },

  // Labels
  labelLarge: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.base * lineHeights.normal,
  },
  labelMedium: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.sm * lineHeights.normal,
  },
  labelSmall: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.xs * lineHeights.normal,
  },

  // Button text
  button: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.base * lineHeights.tight,
  },
  buttonSmall: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.sm * lineHeights.tight,
  },
} as const;
