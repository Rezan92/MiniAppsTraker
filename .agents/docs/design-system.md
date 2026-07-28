---
name: Industri-Logic
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#43474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f88'
  primary: '#002045'
  on-primary: '#ffffff'
  primary-container: '#1a365d'
  on-primary-container: '#86a0cd'
  inverse-primary: '#adc7f7'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#182033'
  on-tertiary: '#ffffff'
  tertiary-container: '#2d354a'
  on-tertiary-container: '#969eb7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f7'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  table-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

The design system is engineered for high-utility B2B environments where reliability and clarity are paramount. The aesthetic blends **Corporate Modern** professionalism with **Industrial Utilitarianism**. It is designed to evoke a sense of "tools that work"—sturdy, dependable, and precise.

The target audience consists of service professionals and business administrators who require quick access to complex data. To facilitate this, the UI prioritizes a clean, high-contrast interface with generous whitespace to reduce cognitive load during high-stakes field operations or complex administrative tasks.

**Design Principles:**
- **Clarity Over Flair:** Every element serves a functional purpose; decorative elements are minimized.
- **Rugged Precision:** Alignments are strict, and visual weights are balanced to feel grounded.
- **High-Trust Interaction:** Feedback loops are immediate and clear, utilizing a robust status-color system to communicate job and invoice states.

## Colors

The palette is anchored by a deep Navy primary to establish institutional trust. An "Industrial Orange" serves as the secondary accent, reserved strictly for primary calls to action (CTA) and critical alerts to ensure they stand out against the professional backdrop.

- **Primary (Navy):** Used for navigation, headers, and primary branding elements.
- **Secondary (Orange):** Reserved for "Create New," "Submit," and critical interaction points. Use sparingly to maintain its impact.
- **Neutrals:** A sophisticated range of Cool Grays (Slate) provides the foundation for borders, backgrounds, and secondary text.
- **Functional Colors:** Success, Warning, and Error colors are high-chroma to ensure visibility on mobile devices in outdoor lighting conditions.

## Typography

This design system utilizes **Inter** for its exceptional legibility and systematic feel. For technical data—such as Invoice IDs, SKU numbers, or timestamps—**JetBrains Mono** is introduced to provide a clear visual distinction between narrative text and technical identifiers.

**Usage Guidelines:**
- **Hierarchy:** Use bold weights for headers to anchor the page.
- **Data Tables:** Use `table-data` (13px) for density in B2B dashboards, ensuring maximum information density without sacrificing readability.
- **Labels:** Small caps or monospaced labels should be used for metadata categories (e.g., "STATUS", "DUE DATE").

## Layout & Spacing

The layout follows a **Fluid Grid** model with fixed-width maximums for desktop to maintain line-length readability. A standard 8px linear scale governs all margins and padding.

- **Desktop (1240px+):** 12-column grid, 24px gutters, 40px side margins.
- **Tablet (768px - 1239px):** 8-column grid, 16px gutters, 24px side margins.
- **Mobile (<767px):** 4-column grid, 16px gutters, 16px side margins.

**Layout Philosophy:** Use "Card-based" grouping for logic blocks. Tables should occupy the full width of their containers, with horizontal scrolling enabled on mobile. Padding within cards should be "Generous" (24px) to ensure touch targets are accessible for field workers.

## Elevation & Depth

This design system employs **Tonal Layers** with very subtle **Ambient Shadows** to signify interactivity.

- **Level 0 (Background):** Used for the main canvas (`#F8FAFC`).
- **Level 1 (Cards/Sheets):** White surface with a 1px border (`#E2E8F0`). No shadow.
- **Level 2 (Hover/Active):** White surface with a soft, diffused shadow (0px 4px 12px rgba(26, 54, 93, 0.08)).
- **Level 3 (Modals/Popovers):** Elevated with a more pronounced shadow (0px 12px 24px rgba(15, 23, 42, 0.12)) to focus user attention.

Avoid heavy blacks in shadows; use tinted navy or slate shadows to maintain color harmony and professional warmth.

## Shapes

The shape language is "Rounded" but disciplined. A standard **8px (0.5rem)** radius is the default for buttons, inputs, and cards. This strikes a balance between the "hard" feel of construction tools and the "soft" modern feel of SaaS software.

- **Small elements (Checkboxes/Tags):** 4px radius.
- **Standard elements (Buttons/Inputs/Cards):** 8px radius.
- **Large containers (Modals):** 12px radius.

## Components

### Buttons
- **Primary:** Navy background, white text. Solid, blocky feel.
- **Secondary:** Slate outline (1px), Navy text.
- **Action (CTA):** Industrial Orange background, dark slate text for high contrast.
- **Size:** Minimum touch target of 44px height for mobile accessibility.

### Data Tables
- **Header:** Light gray background (`#F1F5F9`), bold 12px labels.
- **Rows:** 1px bottom border only. Use zebra-striping for tables wider than 6 columns.
- **Cells:** Vertical padding of 16px to accommodate larger fingers on mobile tablets.

### Inputs & Forms
- **Border:** 1px Slate (`#CBD5E1`) default, 2px Navy (`#1A365D`) on focus.
- **Labels:** Always visible above the input, never floating, to ensure clarity during data entry.
- **Status:** Integrated validation messages using the Status Color palette.

### Status Chips
- Small, high-contrast badges with a subtle tinted background (e.g., Success is Emerald text on 10% Emerald background) and a bold center dot for colorblind accessibility.

### Cards
- White background, 1px border. Headlines should be separated from body content by a subtle horizontal rule or a light gray header section.