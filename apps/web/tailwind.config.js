import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-container-lowest": "#ffffff",
        "secondary-fixed": "#ffddb8",
        "primary-fixed-dim": "#adc7f7",
        "secondary-container": "#fea619",
        "primary": "#002045",
        "on-primary": "#ffffff",
        "on-tertiary-fixed": "#131b2e",
        "tertiary": "#182033",
        "tertiary-fixed-dim": "#bec6e0",
        "surface-bright": "#f8f9ff",
        "error": "#ba1a1a",
        "inverse-primary": "#adc7f7",
        "primary-fixed": "#d6e3ff",
        "outline": "#74777f",
        "on-secondary-fixed-variant": "#653e00",
        "surface": "#f8f9ff",
        "surface-tint": "#455f88",
        "on-error": "#ffffff",
        "surface-container": "#e5eeff",
        "on-tertiary-container": "#969eb7",
        "on-surface": "#0b1c30",
        "surface-container-highest": "#d3e4fe",
        "surface-variant": "#d3e4fe",
        "on-error-container": "#93000a",
        "on-surface-variant": "#43474e",
        "primary-container": "#1a365d",
        "on-secondary": "#ffffff",
        "on-secondary-fixed": "#2a1700",
        "secondary-fixed-dim": "#ffb95f",
        "background": "#f8f9ff",
        "secondary": "#855300",
        "surface-dim": "#cbdbf5",
        "tertiary-fixed": "#dae2fd",
        "surface-container-low": "#eff4ff",
        "surface-container-high": "#dce9ff",
        "inverse-surface": "#213145",
        "on-tertiary-fixed-variant": "#3f465c",
        "inverse-on-surface": "#eaf1ff",
        "on-background": "#0b1c30",
        "tertiary-container": "#2d354a",
        "outline-variant": "#c4c6cf",
        "on-primary-container": "#86a0cd",
        "on-primary-fixed-variant": "#2d476f",
        "error-container": "#ffdad6",
        "on-tertiary": "#ffffff",
        "on-primary-fixed": "#001b3c",
        "on-secondary-container": "#684000"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "gutter": "24px",
        "sm": "12px",
        "xl": "32px",
        "md": "16px",
        "lg": "24px",
        "xs": "4px",
        "container-max": "1440px",
        "base": "8px"
      },
      fontFamily: {
        "display-lg": ["Inter"],
        "body-lg": ["Inter"],
        "headline-md": ["Inter"],
        "headline-lg": ["Inter"],
        "headline-lg-mobile": ["Inter"],
        "label-md": ["JetBrains Mono"],
        "title-md": ["Inter"],
        "body-md": ["Inter"],
        "table-data": ["Inter"]
      },
      fontSize: {
        "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "body-lg": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "headline-lg-mobile": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
        "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "500" }],
        "title-md": ["18px", { "lineHeight": "24px", "fontWeight": "600" }],
        "body-md": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "table-data": ["13px", { "lineHeight": "18px", "fontWeight": "400" }]
      }
    },
  },
  plugins: [forms, containerQueries],
}
