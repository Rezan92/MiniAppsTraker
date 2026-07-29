---
name: Industrial Tech Logic
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#534434'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#867461'
  outline-variant: '#d8c3ad'
  surface-tint: '#855300'
  primary: '#855300'
  on-primary: '#ffffff'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#ffb95f'
  secondary: '#555f6f'
  on-secondary: '#ffffff'
  secondary-container: '#d6e0f3'
  on-secondary-container: '#596373'
  tertiary: '#555f6d'
  on-tertiary: '#ffffff'
  tertiary-container: '#a8b2c2'
  on-tertiary-container: '#3b4552'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#d9e3f6'
  secondary-fixed-dim: '#bdc7d9'
  on-secondary-fixed: '#121c2a'
  on-secondary-fixed-variant: '#3d4756'
  tertiary-fixed: '#d9e3f4'
  tertiary-fixed-dim: '#bdc7d8'
  on-tertiary-fixed: '#121c28'
  on-tertiary-fixed-variant: '#3e4755'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
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
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 280px
  gutter: 24px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is engineered for efficiency, precision, and reliability in industrial and logistics environments. The aesthetic is "Tech-Industrial"—a fusion of high-utility SaaS functionalism with the rugged, high-contrast visual cues of industrial safety systems. 

The personality is authoritative and systematic. It prioritizes scannability and structural clarity to reduce cognitive load during complex workflows. The visual language uses heavy architectural divisions, purposeful use of safety-inspired color accents, and a "workspace-first" mentality that separates global navigation from the operational canvas.

## Colors
The palette is built on high-contrast functionalism.
- **Primary (Industrial Amber):** Reserved exclusively for critical actions, status indicators, and key highlights. It serves as the "attention" layer.
- **Surface (Ghost White):** The main workspace background, providing a clean, low-strain canvas for data-heavy views.
- **Sidebar (Slate/Charcoal):** Deep tones derived from the reference image create a rigid structural container for navigation, ensuring it remains visually distinct from the workspace.
- **Semantic Accents:** Use Amber for warnings/actions, Slate for information, and standard Emerald/Rose for success/error states to maintain industrial logic standards.

## Typography
The typography system uses a tri-font strategy for maximum utility:
1. **Hanken Grotesk (Headlines):** A sharp, contemporary grotesque that provides a professional, engineered feel for titles.
2. **Inter (Body):** The workhorse for UI text, chosen for its exceptional legibility in data grids and forms.
3. **JetBrains Mono (Labels/Technical):** Used for IDs, SKU numbers, and status labels to evoke a technical, precise environment.

All headings should use tighter tracking, while labels use expanded tracking for better scannability at small sizes.

## Layout & Spacing
This design system utilizes a **Fixed Sidebar + Fluid Workspace** model. 

- **Sidebar:** A static 280px container on desktop. It uses internal vertical stacking of 8px (sm) for navigation items.
- **Workspace:** A fluid container that adapts to screen width. It utilizes a 12-column grid for dashboard widgets and a single-column layout for detailed forms.
- **Density:** High-density spacing is preferred for data tables (8px cell padding) while larger 32px margins define the major functional zones of the application.
- **Breakpoints:**
  - **Mobile (<768px):** Sidebar collapses into a bottom-sheet or hamburger menu. Margins reduce to 16px.
  - **Tablet (768px - 1280px):** Sidebar collapses to an icon-only "rail" (72px).
  - **Desktop (>1280px):** Full expanded sidebar and fluid workspace.

## Elevation & Depth
Depth is created through **Tonal Layering** rather than heavy shadows to maintain a "flat-industrial" look.

1. **Level 0 (Floor):** Ghost White (#F9FAFB) workspace background.
2. **Level 1 (Cards):** Pure White (#FFFFFF) containers with 1px borders in Slate-100.
3. **Level 2 (Sidebar):** Deep Slate (#1F2937) providing the strongest visual anchor.
4. **Interactive (Feedback):** Only the primary action buttons and active navigation states use a subtle "industrial glow"—a low-opacity Amber shadow (#F59E0B @ 20%) to indicate "active" status.

## Shapes
The shape language is "Soft-Industrial." While the grid is rigid, elements use a 0.25rem (4px) base radius to soften the technical edge and improve touch/click targets. 

- **Standard Elements:** 4px radius (Buttons, Input fields).
- **Large Containers:** 8px radius (Dashboard cards, Modals).
- **Status Pills:** Fully rounded (Pill) for high contrast against the rectangular grid.

## Components
- **Buttons:** 
  - *Primary:* Industrial Amber background, Black text (high contrast), 4px radius. 
  - *Secondary:* Ghost White background, Slate border, Slate text.
- **Sidebar Nav:** High-contrast Slate background. Active states use a 4px Amber vertical stripe on the left edge and a subtle lighten of the background.
- **Input Fields:** 1px Slate-200 border, Ghost White background. Focus state switches border to Industrial Amber.
- **Data Tables:** Zebra-striping using Ghost White and Pure White. Headers are Slate with JetBrains Mono labels.
- **Chips/Status:** High-saturation background with 10% opacity and 100% opacity text of the same color (e.g., Amber for "Pending," Emerald for "Complete").
- **Cards:** White background, 1px Slate-100 border, no shadow unless hovered (then apply a 4px soft Slate shadow).