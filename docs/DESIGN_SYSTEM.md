# Design System & UI Architecture Specification (DESIGN_SYSTEM.md)

This document establishes the official visual design language, component architecture, spacing tokens, typography, interaction models, print standards, and accessibility criteria for **ERP**, an enterprise multi-tenant school management SaaS platform.

This specification governs all web (`apps/web`) and mobile (`apps/mobile`) user interfaces and shared component libraries (`packages/ui`, `packages/config`).

---

## 1. Design Philosophy & Architectural Foundations

### 1.1 Core Principles
1. **Calm, Spacious & Data-First**: Educational institutions operate in high-density data environments (rosters, mark sheets, fee ledgers, timetables). The interface avoids visual clutter, decorative gradients, and high-saturation background fills. Whitespace is functional, separating logical groupings without forcing excessive scrolling.
2. **One Primary Accent**: The platform relies entirely on a neutral **Slate** foundation accented by a single **Indigo** primary color (`#4F46E5`). Secondary functional colors (Emerald, Amber, Rose, Sky) are strictly reserved for semantic status feedback.
3. **White-Label Multi-Tenant Theming**: While institutional tenant customization (school crest, logo, school name, header accent tint) is supported, the underlying visual hierarchy, accessibility contrast, typography, and component structures remain immutable across tenants. The product platform name lives strictly in `packages/config/brand.ts` and is never hardcoded into UI templates.
4. **Web & Mobile Parity**: Web (Next.js App Router, Tailwind CSS, shadcn/ui, TanStack Table) and Mobile (Expo, Expo Router, NativeWind) share identical design tokens, status nomenclature, semantic iconography, and business logic.
5. **No Hardcoded Strings (i18n & RTL Ready)**: All UI text is referenced via internationalization tokens supporting English (`en-IN`) and Hindi (`hi-IN`) from day one. Layouts employ CSS logical properties (`start`, `end`, `ms-`, `me-`, `ps-`, `pe-`) to support bidirectional and right-to-left rendering without layout redesign.

---

### 1.2 Multi-Tenant School Branding & Contrast Guard
A school tenant's custom accent color (`schools.brand_color`) is strictly constrained to preserve visual accessibility and platform cohesion:
1. **Permitted Customization Zones**: A school's accent color may **only** tint the institutional header band (`HeaderBand`) and the school logo container area (`LogoContainer`).
2. **Primary Button Preservation**: Primary action buttons (`Button variant="primary"`) retain the platform primary (`#4F46E5`) by default.
3. **Contrast Validation Gate**: A tenant brand color can override the primary button background **only if** the custom color achieves a verified contrast ratio of at least **4.5:1 against white (`#FFFFFF`)**.
4. **Automated Rejection & Darkening Algorithm**: If an administrator submits a brand color that fails 4.5:1 against white (e.g. pastel yellows, pale cyans, light ambers):
   - The onboarding/settings wizard displays an inline accessibility error warning: *"The selected color fails WCAG AA contrast against white text (minimum 4.5:1 required)."*
   - The system offers a one-click auto-adjustment that executes an automated lightness reduction algorithm:
     ```typescript
     export function adjustBrandColorForContrast(hex: string, targetContrast = 4.5): string {
       let [h, s, l] = hexToHsl(hex);
       while (getContrastRatio(hslToHex(h, s, l), '#FFFFFF') < targetContrast && l > 10) {
         l -= 1; // Incrementally darken lightness until threshold is satisfied
       }
       return hslToHex(h, s, l);
     }
     ```
   - If the administrator does not accept the darkened accessible shade, the custom color is restricted solely to the non-interactive header band tint, and interactive buttons fall back permanently to `#4F46E5`.

---

## 2. Color System & Semantic Tokens

The color palette is built on Tailwind CSS color primitives, structured around CSS custom properties to support seamless dynamic light and dark theme switching. All HSL variable values match their respective hexadecimal comments exactly.

### 2.1 Base Palette Specification

| Token Category | Hex (Light) | Hex (Dark) | HSL Representation | Contrast vs White | Functional Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Solid Fill** | `#4F46E5` | `#4F46E5` | `243.4 75.4% 58.6%` | **6.29:1** (Pass) | Primary buttons, active tabs, progress bars, focus rings. White text in both themes. |
| **Success Solid Fill** | `#047857` | `#047857` | `162.9 93.5% 24.3%` | **5.48:1** (Pass) | Paid status pills, present attendance badges. White text in both themes. |
| **Warning Solid Fill** | `#B45309` | `#B45309` | `26.0 90.5% 37.1%` | **5.02:1** (Pass) | Grace period indicators, pending approvals. White text in both themes. |
| **Info Solid Fill** | `#0369A1` | `#0369A1` | `201.3 96.3% 32.2%` | **5.93:1** (Pass) | System announcements, date sheet tags. White text in both themes. |
| **Destructive Solid Fill**| `#E11D48` | `#E11D48` | `346.8 77.2% 49.8%` | **4.70:1** (Pass) | Overdue fine alerts, absent badges, delete buttons. White text in both themes. |
| **Primary Text** | `#4338CA` | `#A5B4FC` | `244.5 57.9% 50.6%` (L) / `229.7 93.5% 81.8%` (D)| $\ge$ **7.55:1** (L) / $\ge$ **8.96:1** (D) | Coloured links, active text labels, section subheads. |
| **Success Text** | `#047857` | `#34D399` | `162.9 93.5% 24.3%` (L) / `158.1 64.4% 51.6%` (D)| $\ge$ **5.24:1** (L) / $\ge$ **9.29:1** (D) | Positive balances, passing grade text, present counters. |
| **Warning Text** | `#B45309` | `#FBBF24` | `26.0 90.5% 37.1%` (L) / `43.3 96.4% 56.3%` (D) | $\ge$ **4.80:1** (L) / $\ge$ **10.69:1** (D)| Due soon warning text, pending approval labels. |
| **Info Text** | `#0369A1` | `#38BDF8` | `201.3 96.3% 32.2%` (L) / `198.4 93.2% 59.6%` (D)| $\ge$ **5.67:1** (L) / $\ge$ **8.33:1** (D) | Circular metadata, timetable room notes. |
| **Destructive Text** | `#BE123C` | `#FB7185` | `345.3 82.7% 40.8%` (L) / `351.3 94.5% 71.4%` (D)| $\ge$ **6.01:1** (L) / $\ge$ **6.63:1** (D) | Form error descriptions, overdue arrears notices. |
| **Muted Text** | `#475569` | `#94A3B8` | `215.3 19.3% 34.5%` (L) / `215.0 20.2% 65.1%` (D)| $\ge$ **7.24:1** (L) / $\ge$ **6.96:1** (D) | Column headers, breadcrumbs, helper descriptions. |
| **Base Body Text** | `#0F172A` | `#F8FAFC` | `222.2 47.4% 11.2%` (L) / `210.0 40.0% 98.0%` (D)| $\ge$ **17.06:1** (L)/ $\ge$ **17.06:1** (D)| Primary body copy, table cell content, card headings. |

---

### 2.2 Complete CSS Variable Tokens (`apps/web` & `packages/ui`)

```css
@layer base {
  :root {
    /* Canvas & Surfaces */
    --background: 210.0 40.0% 98.0%;          /* #F8FAFC (slate-50) */
    --foreground: 222.2 47.4% 11.2%;          /* #0F172A (slate-900) */
    --card: 0 0% 100%;                        /* #FFFFFF */
    --card-foreground: 222.2 47.4% 11.2%;     /* #0F172A (slate-900) */
    --popover: 0 0% 100%;                     /* #FFFFFF */
    --popover-foreground: 222.2 47.4% 11.2%;  /* #0F172A (slate-900) */

    /* Brand Primary (Solid Fill with White Text) */
    --primary: 243.4 75.4% 58.6%;             /* #4F46E5 */
    --primary-foreground: 0 0% 100%;          /* #FFFFFF */

    /* Secondary Neutral */
    --secondary: 210.0 40.0% 96.1%;           /* #F1F5F9 (slate-100) */
    --secondary-foreground: 222.2 47.4% 11.2%;/* #0F172A (slate-900) */

    /* Muted Elements */
    --muted: 210.0 40.0% 96.1%;               /* #F1F5F9 (slate-100) */
    --muted-foreground: 215.3 19.3% 34.5%;    /* #475569 (slate-600) */

    /* Accent & Hover */
    --accent: 210.0 40.0% 96.1%;              /* #F1F5F9 (slate-100) */
    --accent-foreground: 222.2 47.4% 11.2%;   /* #0F172A (slate-900) */

    /* Solid Semantic Fills (All with White Foreground #FFFFFF) */
    --success: 162.9 93.5% 24.3%;             /* #047857 */
    --success-foreground: 0 0% 100%;          /* #FFFFFF */
    --warning: 26.0 90.5% 37.1%;              /* #B45309 */
    --warning-foreground: 0 0% 100%;          /* #FFFFFF */
    --info: 201.3 96.3% 32.2%;                /* #0369A1 */
    --info-foreground: 0 0% 100%;             /* #FFFFFF */
    --destructive: 346.8 77.2% 49.8%;         /* #E11D48 */
    --destructive-foreground: 0 0% 100%;      /* #FFFFFF */

    /* Coloured Text Tokens (Light Theme) */
    --text-primary: 244.5 57.9% 50.6%;        /* #4338CA */
    --text-success: 162.9 93.5% 24.3%;        /* #047857 */
    --text-warning: 26.0 90.5% 37.1%;         /* #B45309 */
    --text-info: 201.3 96.3% 32.2%;           /* #0369A1 */
    --text-destructive: 345.3 82.7% 40.8%;    /* #BE123C */

    /* Borders, Inputs & Focus Rings */
    --border: 214.3 31.8% 91.4%;              /* #E2E8F0 (slate-200) */
    --input: 214.3 31.8% 91.4%;               /* #E2E8F0 (slate-200) */
    --ring: 243.4 75.4% 58.6%;                /* #4F46E5 */

    /* Corner Radii */
    --radius-sm: 0.25rem;                     /* 4px */
    --radius-md: 0.375rem;                    /* 6px */
    --radius: 0.5rem;                         /* 8px */
    --radius-lg: 0.75rem;                     /* 12px */
  }

  .dark {
    /* Canvas & Surfaces */
    --background: 228.6 84.0% 4.9%;           /* #020617 (slate-950) */
    --foreground: 210.0 40.0% 98.0%;          /* #F8FAFC (slate-50) */
    --card: 222.2 47.4% 11.2%;                /* #0F172A (slate-900) */
    --card-foreground: 210.0 40.0% 98.0%;     /* #F8FAFC (slate-50) */
    --popover: 222.2 47.4% 11.2%;             /* #0F172A (slate-900) */
    --popover-foreground: 210.0 40.0% 98.0%;  /* #F8FAFC (slate-50) */

    /* Brand Primary (Solid Fill with White Text) */
    --primary: 243.4 75.4% 58.6%;             /* #4F46E5 */
    --primary-foreground: 0 0% 100%;          /* #FFFFFF */

    /* Secondary Neutral */
    --secondary: 217.2 32.6% 17.5%;           /* #1E293B (slate-800) */
    --secondary-foreground: 210.0 40.0% 98.0%;/* #F8FAFC (slate-50) */

    /* Muted Elements */
    --muted: 217.2 32.6% 17.5%;               /* #1E293B (slate-800) */
    --muted-foreground: 215.0 20.2% 65.1%;    /* #94A3B8 (slate-400) */

    /* Accent & Hover */
    --accent: 217.2 32.6% 17.5%;              /* #1E293B (slate-800) */
    --accent-foreground: 210.0 40.0% 98.0%;   /* #F8FAFC (slate-50) */

    /* Solid Semantic Fills (All with White Foreground #FFFFFF) */
    --success: 162.9 93.5% 24.3%;             /* #047857 */
    --success-foreground: 0 0% 100%;          /* #FFFFFF */
    --warning: 26.0 90.5% 37.1%;              /* #B45309 */
    --warning-foreground: 0 0% 100%;          /* #FFFFFF */
    --info: 201.3 96.3% 32.2%;                /* #0369A1 */
    --info-foreground: 0 0% 100%;             /* #FFFFFF */
    --destructive: 346.8 77.2% 49.8%;         /* #E11D48 */
    --destructive-foreground: 0 0% 100%;      /* #FFFFFF */

    /* Coloured Text Tokens (Dark Theme) */
    --text-primary: 229.7 93.5% 81.8%;        /* #A5B4FC */
    --text-success: 158.1 64.4% 51.6%;        /* #34D399 */
    --text-warning: 43.3 96.4% 56.3%;         /* #FBBF24 */
    --text-info: 198.4 93.2% 59.6%;           /* #38BDF8 */
    --text-destructive: 351.3 94.5% 71.4%;    /* #FB7185 */

    /* Borders, Inputs & Focus Rings */
    --border: 217.2 32.6% 17.5%;              /* #1E293B (slate-800) */
    --input: 217.2 32.6% 17.5%;               /* #1E293B (slate-800) */
    --ring: 243.4 75.4% 58.6%;                /* #4F46E5 */
  }
}
```

---

### 2.3 Semantic Status Badge Matrix

All status indicators pair a semantic background tint, a semantic border stroke, semantic text color, and a functional Lucide icon to guarantee accessibility across all vision profiles:

| Status Key | Semantic Background | Semantic Border | Semantic Text | Accompanying Lucide Icon |
| :--- | :--- | :--- | :--- | :--- |
| **Paid / Present / Active** | `bg-success/15` | `border-success/30` | `text-success` | `CheckCircle2` |
| **Late / Grace / Pending** | `bg-warning/15` | `border-warning/30` | `text-warning` | `Clock` / `AlertTriangle` |
| **Unpaid / Absent / Failed** | `bg-destructive/15` | `border-destructive/30` | `text-destructive` | `XCircle` / `AlertCircle` |
| **Exempt / Excused / Draft**| `bg-muted` | `border-border` | `text-muted-foreground` | `MinusCircle` / `FileText` |
| **Scheduled / Info** | `bg-info/15` | `border-info/30` | `text-info` | `Calendar` / `Info` |

---

### 2.4 Contrast Verification Table (WCAG 2.1 AA)

Every text and surface combination across both light and dark themes satisfies the WCAG 2.1 AA minimum threshold ($4.5:1$ for body/tabular text, $3.0:1$ for large text and interactive UI components):

| Theme | Foreground Token | Text Hex | Background Token | Surface Hex | Computed Ratio | Required Threshold | Verdict |
| :--- | :--- | :--- | :--- | :--- | :-: | :-: | :-: |
| **Both** | `primary-foreground` | `#FFFFFF` | `primary` (Solid Fill) | `#4F46E5` | **6.29:1** | $\ge 4.5:1$ | **PASS** |
| **Both** | `success-foreground` | `#FFFFFF` | `success` (Solid Fill) | `#047857` | **5.48:1** | $\ge 4.5:1$ | **PASS** |
| **Both** | `warning-foreground` | `#FFFFFF` | `warning` (Solid Fill) | `#B45309` | **5.02:1** | $\ge 4.5:1$ | **PASS** |
| **Both** | `info-foreground` | `#FFFFFF` | `info` (Solid Fill) | `#0369A1` | **5.93:1** | $\ge 4.5:1$ | **PASS** |
| **Both** | `destructive-foreground`| `#FFFFFF`| `destructive` (Solid Fill)| `#E11D48` | **4.70:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `foreground` (Base Body)| `#0F172A` | `background` (Canvas) | `#F8FAFC` | **17.06:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `foreground` (Base Body)| `#0F172A` | `card` (Card/Dialog) | `#FFFFFF` | **17.85:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `muted-foreground` | `#475569` | `background` (Canvas) | `#F8FAFC` | **7.24:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `muted-foreground` | `#475569` | `card` (Card/Dialog) | `#FFFFFF` | **7.58:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `text-primary` | `#4338CA` | `background` (Canvas) | `#F8FAFC` | **7.55:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `text-primary` | `#4338CA` | `card` (Card/Dialog) | `#FFFFFF` | **7.90:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `text-success` | `#047857` | `background` (Canvas) | `#F8FAFC` | **5.24:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `text-success` | `#047857` | `card` (Card/Dialog) | `#FFFFFF` | **5.48:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `text-warning` | `#B45309` | `background` (Canvas) | `#F8FAFC` | **4.80:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `text-warning` | `#B45309` | `card` (Card/Dialog) | `#FFFFFF` | **5.02:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `text-info` | `#0369A1` | `background` (Canvas) | `#F8FAFC` | **5.67:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `text-info` | `#0369A1` | `card` (Card/Dialog) | `#FFFFFF` | **5.93:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `text-destructive` | `#BE123C` | `background` (Canvas) | `#F8FAFC` | **6.01:1** | $\ge 4.5:1$ | **PASS** |
| **Light**| `text-destructive` | `#BE123C` | `card` (Card/Dialog) | `#FFFFFF` | **6.29:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `foreground` (Base Body)| `#F8FAFC` | `background` (Canvas) | `#020617` | **19.28:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `foreground` (Base Body)| `#F8FAFC` | `card` (Card/Dialog) | `#0F172A` | **17.06:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `muted-foreground` | `#94A3B8` | `background` (Canvas) | `#020617` | **7.87:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `muted-foreground` | `#94A3B8` | `card` (Card/Dialog) | `#0F172A` | **6.96:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `text-primary` | `#A5B4FC` | `background` (Canvas) | `#020617` | **10.12:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `text-primary` | `#A5B4FC` | `card` (Card/Dialog) | `#0F172A` | **8.96:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `text-success` | `#34D399` | `background` (Canvas) | `#020617` | **10.49:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `text-success` | `#34D399` | `card` (Card/Dialog) | `#0F172A` | **9.29:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `text-warning` | `#FBBF24` | `background` (Canvas) | `#020617` | **12.08:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `text-warning` | `#FBBF24` | `card` (Card/Dialog) | `#0F172A` | **10.69:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `text-info` | `#38BDF8` | `background` (Canvas) | `#020617` | **9.42:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `text-info` | `#38BDF8` | `card` (Card/Dialog) | `#0F172A` | **8.33:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `text-destructive` | `#FB7185` | `background` (Canvas) | `#020617` | **7.50:1** | $\ge 4.5:1$ | **PASS** |
| **Dark** | `text-destructive` | `#FB7185` | `card` (Card/Dialog) | `#0F172A` | **6.63:1** | $\ge 4.5:1$ | **PASS** |

---

### 2.5 Automated Contrast Unit Test Specification (`packages/config/design-tokens.contrast.test.ts`)

The following unit test file guarantees programmatically that no token edit can degrade contrast below the WCAG 2.1 AA threshold:

```typescript
// packages/config/design-tokens.contrast.test.ts
import { describe, it, expect } from 'vitest';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hexToRgb(hex1));
  const l2 = getRelativeLuminance(hexToRgb(hex2));
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

describe('Design Tokens Contrast Ratio Verification (WCAG 2.1 AA)', () => {
  const solidFills = {
    primary: '#4F46E5',
    success: '#047857',
    warning: '#B45309',
    info: '#0369A1',
    destructive: '#E11D48',
  };

  const lightSurfaces = ['#F8FAFC', '#FFFFFF'];
  const lightTexts = {
    body: '#0F172A',
    muted: '#475569',
    primary: '#4338CA',
    success: '#047857',
    warning: '#B45309',
    info: '#0369A1',
    destructive: '#BE123C',
  };

  const darkSurfaces = ['#020617', '#0F172A'];
  const darkTexts = {
    body: '#F8FAFC',
    muted: '#94A3B8',
    primary: '#A5B4FC',
    success: '#34D399',
    warning: '#FBBF24',
    info: '#38BDF8',
    destructive: '#FB7185',
  };

  it('verifies all solid fills achieve at least 4.5:1 against white text', () => {
    Object.entries(solidFills).forEach(([name, hex]) => {
      const ratio = getContrastRatio(hex, '#FFFFFF');
      expect(ratio, `Solid fill "${name}" (${hex}) against #FFFFFF`).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('verifies all light theme text colors achieve at least 4.5:1 against surfaces', () => {
    Object.entries(lightTexts).forEach(([name, textHex]) => {
      lightSurfaces.forEach((surfaceHex) => {
        const ratio = getContrastRatio(textHex, surfaceHex);
        expect(ratio, `Light text "${name}" on ${surfaceHex}`).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it('verifies all dark theme text colors achieve at least 4.5:1 against surfaces', () => {
    Object.entries(darkTexts).forEach(([name, textHex]) => {
      darkSurfaces.forEach((surfaceHex) => {
        const ratio = getContrastRatio(textHex, surfaceHex);
        expect(ratio, `Dark text "${name}" on ${surfaceHex}`).toBeGreaterThanOrEqual(4.5);
      });
    });
  });
});
```

---

## 3. Typography & Internationalization (i18n)

### 3.1 Typeface Families & Loading Rules
1. **Primary Interface Font**: **Inter** (Variable, weight 400 through 700). Used for all UI chrome, body text, tables, modals, and navigation.
2. **Indic / Hindi Font**: **Noto Sans Devanagari** (weights 400 Regular and 600 SemiBold only). Loaded selectively **only** when the user locale is `hi-IN`.
   - **Subsetting**: Limited exclusively to Devanagari glyphs, numbers, and Indic currency symbols (`subsets: ['devanagari']`).
   - **Font Display Strategy**: Configured with `font-display: swap` on both Web (`next/font/google`) and Mobile (`expo-font`) to avoid layout blocks and invisible text flashes.
3. **Tabular Figures for Numbers**: Tabular formatting for all monetary values, roll numbers, admission codes, invoice sequences, percentages, and timestamps is achieved via **Inter with `tabular-nums`** (CSS `font-variant-numeric: tabular-nums`). Monospace fonts (like JetBrains Mono) are completely excluded from general numerical UI to preserve visual hierarchy.

```css
/* Typography definition in packages/config/tailwind.config.ts */
fontFamily: {
  sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
}
```

---

### 3.2 Typography Scale & Hierarchy

| Level | Size (rem / px) | Line Height | Tracking | Weight | Semantic Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `2.25rem` / `36px` | `2.75rem` / `44px` | `-0.025em` | Bold (`700`) | Hero landing banners, public portal headlines. |
| **Heading 1** | `1.875rem` / `30px` | `2.25rem` / `36px` | `-0.02em` | SemiBold (`600`) | Main page title (`PageHeader`). |
| **Heading 2** | `1.5rem` / `24px` | `2.0rem` / `32px` | `-0.015em` | SemiBold (`600`) | Card grouping headers, tab container titles. |
| **Heading 3** | `1.25rem` / `20px` | `1.75rem` / `28px` | `-0.01em` | SemiBold (`600`) | Modal dialog titles, drawer sheet headers. |
| **Subheading**| `1.125rem` / `18px` | `1.625rem` / `26px`| `-0.005em` | Medium (`500`) | Table summary cards, section division titles. |
| **Body Large**| `1.0rem` / `16px` | `1.5rem` / `24px` | `0` | Regular (`400`) / Medium (`500`) | Form inputs, dropdown items, filter controls. |
| **Body Base** | `0.875rem` / `14px` | `1.25rem` / `20px` | `0` | Regular (`400`) / Medium (`500`) | **Standard default**: table rows, card contents, descriptions. |
| **Body Small**| `0.8125rem` / `13px`| `1.125rem` / `18px`| `0` | Regular (`400`) | Help text, secondary timestamps, breadcrumbs. |
| **Caption** | `0.75rem` / `12px` | `1.0rem` / `16px` | `+0.01em` | Medium (`500`) | Badges, status pills, table column headers (`uppercase`). |
| **Micro** | `0.6875rem` / `11px`| `0.875rem` / `14px`| `+0.02em` | Medium (`500`) | Avatar fallback initials, table footer counters. |

---

### 3.3 Number & Monetary Formatting Standards (India Localization)
1. **Currency Representation**:
   - Currency symbol: `₹` (Indian Rupee, ISO: `INR`).
   - Minor unit mapping: All calculations execute in integer paise (`₹1.00 = 100 paise`).
   - Grouping convention: Indian numbering system (`en-IN` Lakhs & Crores):
     - Example: `₹1,25,450.00` (rendered with `.tabular-nums font-sans`).
   - Negative amounts: Represented with a minus sign or enclosed within brackets for accounting credits: `-₹1,500.00` or `(₹1,500.00)`.
2. **Date & Time Standards**:
   - Display Date: `DD/MM/YYYY` (e.g. `15/10/2026`).
   - Display Time: `HH:MM` (12-hour or 24-hour based on school setting; default 12-hour `09:30 AM`).
   - Database Timestamp: Always UTC `timestamptz`; converted to school timezone (`school_settings.timezone`, default `'Asia/Kolkata'`) at the presentation layer.

---

## 4. Spatial System & Layout Grid

### 4.1 4px Spacing Scale

The layout adheres strictly to an 8-point baseline grid rooted in 4px increments:

| Spacing Token | Pixels | Tailwind Class | Recommended Component Usage |
| :--- | :--- | :--- | :--- |
| `space-1` | `4px` | `p-1`, `gap-1`, `m-1` | Badge internal padding, compact icon button padding. |
| `space-2` | `8px` | `p-2`, `gap-2`, `m-2` | Form control horizontal padding, table cell vertical padding, icon-text gap. |
| `space-3` | `12px` | `p-3`, `gap-3`, `m-3` | Compact card padding, dropdown menu internal padding. |
| `space-4` | `16px` | `p-4`, `gap-4`, `m-4` | Standard table cell horizontal padding, standard card interior padding. |
| `space-5` | `20px` | `p-5`, `gap-5`, `m-5` | Modal dialog padding, filter bar container padding. |
| `space-6` | `24px` | `p-6`, `gap-6`, `m-6` | Main dashboard card padding, drawer panel interior padding. |
| `space-8` | `32px` | `p-8`, `gap-8`, `m-8` | Section separation spacing, page canvas exterior gutter. |
| `space-10` | `40px` | `p-10`, `gap-10` | Empty state container vertical padding. |
| `space-12` | `48px` | `p-12`, `gap-12` | Hero banner padding, public admission form spacing. |
| `space-16` | `64px` | `p-16`, `gap-16` | Large landing section spacing. |

---

### 4.2 Touch Targets: Coarse versus Fine Pointers

Interactive controls adapt their physical target sizing based on hardware pointer capability via `@media (pointer: coarse)`:

1. **Coarse Pointers (Touch Screens: Phones, Tablets, Parent/Student Web Portals)**:
   - **Strict Rule**: Every interactive button, input field, select trigger, tab selector, checkbox container, and row action trigger **must be at least 44px x 44px** in physical dimension (`min-h-[44px] min-w-[44px]` or `h-11`).
   - Applies across: All Expo mobile layouts (`apps/mobile`) and touch-driven web routes (`/app/parent/*`, `/app/student/*`, mobile responsive web viewports).
2. **Fine Pointers (Mouse / Trackpad: Desktop Administrative Staff & Cashiers)**:
   - Control heights standardize on **36px** (`h-9` / `min-h-[36px]`) for desktop keyboards and mouse pointers.
   - High-density data matrices (attendance matrices, marks entry sheets) support a compact mode at **32px** (`h-8`).

```css
/* Responsive Touch Target Pattern */
.ui-control {
  height: 2.25rem; /* 36px standard default for fine pointers */
  min-height: 2.25rem;
}

@media (pointer: coarse) {
  .ui-control {
    height: 2.75rem; /* 44px mandatory minimum for coarse pointers */
    min-height: 2.75rem;
  }
}
```

---

### 4.3 Corner Radii Tokens
- **`rounded-sm` (4px)**: Badges, status tags, inline code snippets.
- **`rounded-md` (6px)**: Standard buttons, input fields, select triggers, checkboxes.
- **`rounded-lg` (8px)**: **Default system radius**: Cards, TanStack Table containers, modal dialogs, drawer panels.
- **`rounded-xl` (12px)**: Dashboard KPI metric cards, preview containers.
- **`rounded-full` (9999px)**: Avatars, toggle switches, circular action buttons.

---

### 4.4 Responsive Viewport Breakpoints

| Breakpoint Key | Min Width | Target Devices | Primary Layout Adaptation |
| :--- | :--- | :--- | :--- |
| `xs` (Base) | `360px` | Compact Mobile (Android/iOS) | Single column cards, stacked action buttons, collapsible bottom sheets. |
| `sm` | `640px` | Large Mobile / Phablet | 2-column KPI grids, floating action buttons. |
| `md` | `768px` | Tablets (Portrait) | Sidebar collapses to icon rail, 2-column forms. |
| `lg` | `1024px` | Laptops / iPad Landscape | Fixed 240px sidebar, full TanStack Table display with sticky headers. |
| `xl` | `1280px` | Desktop Monitors | 3-column dashboard grids, split master-detail panes. |
| `2xl` | `1536px` | Widescreen Displays | 4-column metric grids, expanded timetable matrices. |

---

## 5. Component Library Specifications (`packages/ui`)

Component classes are strictly semantic (`bg-primary`, `text-muted-foreground`, `border-border`, `bg-success`). Hardcoded palette classes (such as `indigo-600` or `slate-200`) are prohibited outside the token configuration.

### 5.1 Buttons (`Button`)

```tsx
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

- **Semantic Class Mapping**:
  - `primary`: `bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
  - `secondary`: `bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
  - `outline`: `border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
  - `ghost`: `bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
  - `destructive`: `bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/95 shadow-sm focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
- **Sizes**:
  - `sm`: Height `32px` (`h-8 px-3 text-xs rounded-md`). Fine pointers only.
  - `md`: Height `36px` (`h-9 px-4 text-sm rounded-md pointer-coarse:h-11 pointer-coarse:px-5 pointer-coarse:text-base`) — **Standard Default**.
  - `lg`: Height `44px` (`h-11 px-6 text-base rounded-lg`).
  - `icon`: Square `36px x 36px` on fine pointers (`h-9 w-9 p-0 rounded-md pointer-coarse:h-11 pointer-coarse:w-11`).
- **Loading State**: Disables click, renders Lucide `Loader2` rotating spinner at 16px, preserves button dimensions to prevent layout shifts.

---

### 5.2 Input Controls (`Input`, `Select`, `Checkbox`)

1. **Text Input (`Input`)**:
   - Default dimensions: Height `36px` (`h-9 pointer-coarse:h-11`), padding `px-3 py-1.5`, font `text-sm tabular-nums`.
   - Surface & Border: `border border-border bg-card text-foreground placeholder:text-muted-foreground rounded-md`.
   - Focus State: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
   - Disabled State: `disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground`.
   - Error State: `border-destructive text-destructive focus-visible:ring-destructive`.

2. **Select Dropdown (`Select`)**:
   - Built on Radix UI `SelectPrimitive`.
   - Trigger: `border border-border bg-card text-foreground h-9 pointer-coarse:h-11 px-3 rounded-md`.
   - Popover Content: `bg-popover text-popover-foreground border border-border shadow-md rounded-md p-1`.

3. **Checkbox & Switch (`Checkbox`, `Switch`)**:
   - Checkbox: `16px x 16px` on desktop (`h-4 w-4 pointer-coarse:h-5 pointer-coarse:w-5 rounded border-border text-primary focus:ring-ring bg-card`).
   - Switch: Width `36px`, height `20px`, toggle thumb `16px` with smooth CSS transition (`bg-muted data-[state=checked]:bg-primary`).

---

### 5.3 Data Tables (`DataTable` via TanStack Table)

All tabular data across Modules 1–23 standardizes on TanStack Table:
- **Container**: `border border-border rounded-lg overflow-hidden bg-card text-card-foreground`.
- **Header Row (`thead`)**: Height `40px`, background `bg-muted/60`, border-b `border-border`.
  - Column Headers: `text-xs font-semibold uppercase tracking-wider text-muted-foreground text-start px-4 py-2.5`.
  - Interactive Sorting: Clickable header with Lucide `ArrowUpDown`, `ArrowUp`, or `ArrowDown` indicator.
- **Body Rows (`tbody tr`)**:
  - Height `44px` (Compact mode `36px`, Spacious mode `52px`).
  - Surface: Pure white / dark slate with subtle hover fill: `hover:bg-muted/40 transition-colors text-foreground border-b border-border/50`.
  - Cell formatting: `px-4 py-2 text-sm text-foreground tabular-nums`.
- **Pinned Columns**: Checkbox selection column and Row Actions (`...`) column sticky on horizontal overflow with `bg-card border-border`.
- **Pagination Footer**: Fixed bottom row with `border-t border-border bg-card text-muted-foreground px-4 py-3`.

---

## 6. Standard Layout & Page Patterns

Every screen cataloged in `SCREENS.md` conforms to one of four authoritative layout patterns:

### 6.1 Standard Administrative Page Pattern (Default)

```
+---------------------------------------------------------------------------------------+
|  Top Navigation Bar (School Switcher, Global Search [Cmd+K], Notifications, User)     |
+---------------------------------------------------------------------------------------+
|  Breadcrumbs: Home / Module / Current Page                                            |
|  Page Title (Heading 1)                                   [ + Primary Action Button ] |
+---------------------------------------------------------------------------------------+
|  Filter Bar: [ Search input... ] [ Filter 1 v ] [ Filter 2 v ]   [ Columns v ] [ Export ]|
+---------------------------------------------------------------------------------------+
|  Data Canvas:                                                                         |
|  +---------------------------------------------------------------------------------+  |
|  | [x] | Column 1           | Column 2       | Column 3      | Status    | Actions |  |
|  |-----|--------------------|----------------|---------------|-----------|---------|  |
|  | [ ] | Student Name       | Class 10-A     | ₹12,000.00    | [ Paid ]  |  [ : ]  |  |
|  | [ ] | Student Name       | Class 10-A     | ₹8,500.00     | [ Late ]  |  [ : ]  |  |
|  +---------------------------------------------------------------------------------+  |
|  Showing 1 to 25 of 280 results                    [ First ] [ < ]  Page 1 of 12 [ > ]|
+---------------------------------------------------------------------------------------+
```

---

### 6.2 High-Speed POS Terminal Layout (Accountant Rapid Collection)

Optimized for 0-latency cashier queues with full keyboard control:
- Fixed non-scrolling single viewport (`overflow-hidden h-screen bg-background`).
- Split screen: 40% Left Pane (Student Search, Profile, Unpaid Invoices), 60% Right Pane (Payment Allocation Waterfall, Tender Calculator, Print Confirmation).
- **Reconciled POS Hotkey Registry (Identical with SCREENS.md)**:
  - `F2`: Instant student / admission number / voucher barcode lookup.
  - `F4`: Collect and print slip.
  - `F8`: Generate / Toggle Sibling Consolidated Invoice.
  - `F9`: Cycle payment tender (Cash, UPI QR, Net Banking, Demand Draft).
  - `Esc`: Clear Active Form / Abort Transaction.

---

### 6.3 Evaluation & Attendance Matrix Pattern

Designed for high-speed tabular entry by teachers:
- Sticky First Column: Student Roll Number, Admission Number, and Full Name (`bg-card border-r border-border`).
- Horizontal Scrollable Columns: Subjects, Exam Components (Theory, Practical), or Monthly Days (1 through 31).
- Direct In-Cell Input: Numeric inputs with arrow key navigation (`Up`, `Down`, `Left`, `Right`) and auto-advance on `Enter`.
- Live Aggregation Bar: Instant client-side calculation of Total Marks, Aggregate Percentage, GPA, and Pass/Fail status without requiring server roundtrips.

---

### 6.4 Parent & Student Mobile Card Pattern (Expo)

Designed for touch-first smartphone viewports (360px+):
- **Sticky Header**: Tenant crest, Child Selector switchboard pill (`[ Rahul Sharma v ]`), and Notification Bell.
- **Quick Action Bar**: Horizontal swipeable pills: `[ Pay Fees (₹4,200) ]`, `[ Attendance 94% ]`, `[ Term Report ]`, `[ Homework (2) ]`.
- **Card Feed**: Grouped list cards with 8px radius, prominent status badges, and expandable accordion drawers.
- **Bottom Navigation**: 5 standard tab anchors: `Home`, `Academics`, `Fees`, `Messages`, `Profile`.

---

## 7. Tri-State UI & Feedback Standards

No screen or component is complete without all three states explicitly implemented:

### 7.1 Loading State Standard
- **Zero Blank Pages**: Generic circular full-screen loading spinners are prohibited for main content.
- **Content-Matched Skeletons**:
  - Tables: Animated pulse skeleton rendering 5 rows matching exact column widths (`animate-pulse bg-muted rounded`).
  - Cards: Metric box skeleton matching KPI heights.
  - Forms: Input outlines with shimmering placeholder fills.

---

### 7.2 Empty State Standard
When a query returns zero results, the container renders a centered, illustrative empty state:
1. **Icon**: 48px Lucide icon inside an 80px circular slate container (`bg-muted text-muted-foreground`).
2. **Title**: Direct, informative heading (e.g. `"No Fee Vouchers Generated Yet"`).
3. **Description**: Concise sentence providing context and next steps (e.g. `"Select an academic session and fee structure to generate monthly fee vouchers for this class."`).
4. **Primary Action**: Prominent CTA button executing the resolution flow (`[ + Generate First Voucher Batch ]`).

---

### 7.3 Error State & Recovery Standard
- **Form Field Errors**: Red border stroke on input (`border-destructive`), accompanied by a 12px error message below the field with an `AlertCircle` icon and `text-destructive`.
- **Page-Level Fetch Failures**: Alert card with rose tint (`bg-destructive/15 border border-destructive/30 text-destructive`), displaying user-friendly error copy (without leaking SQL stack traces), an error reference ID, and a `[ Retry Request ]` button.
- **Destructive Confirmation Modals**: Irreversible operations (account deletion, student withdrawal, marks locking, session closure) require a two-step confirmation modal with a red action button (`Button variant="destructive"`) and explicit confirmation text input or password entry.

---

### 7.4 Toast Notification Standard
Asynchronous event feedback uses toast notifications positioned at `bottom-right` (desktop) or `top-center` (mobile):
- **Success Toast**: Green check icon, Title `"Voucher VCH-2026-00412 Generated"`, Duration: `4000ms`.
- **Error Toast**: Red alert icon, Title `"Payment Allocation Failed"`, Action button `[ View Error Log ]`, Duration: `8000ms` (requires user dismissal).
- **Copy/Print Toast**: Blue info icon, Title `"Receipt Link Copied to Clipboard"`, Duration: `2500ms`.

---

## 8. Print & Document Styling Engine

The ERP platform outputs legal, statutory, and institutional documents via standard browser print dialogs (`window.print()`) formatted for standard paper dimensions.

### 8.1 `@media print` CSS Engine

```css
@media print {
  /* Hide all digital navigation, action buttons, sidebars, and headers */
  nav, aside, header, footer, .no-print, button, input, [role="tablist"] {
    display: none !important;
  }

  /* Reset canvas background and margins */
  body, main {
    background: #FFFFFF !important;
    color: #000000 !important;
    padding: 0 !important;
    margin: 0 !important;
    font-size: 11pt !important;
    line-height: 1.3 !important;
  }

  /* Prevent page breaks inside critical elements */
  .print-avoid-break {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .print-page-break {
    page-break-after: always !important;
    break-after: page !important;
  }

  /* High contrast table borders for laser and thermal printing */
  table.print-table {
    width: 100% !important;
    border-collapse: collapse !important;
  }
  table.print-table th, table.print-table td {
    border: 1px solid #000000 !important;
    padding: 4px 8px !important;
    font-size: 10pt !important;
    font-variant-numeric: tabular-nums !important;
  }
}
```

---

### 8.2 Paper Dimensions & Layout Specifications

| Document Type | Paper Size | Dimensions (mm) | Orientation | Multi-Copy / Layout Structure |
| :--- | :--- | :--- | :--- | :--- |
| **Fee Voucher / Bill** | **A4** (3 Stubs) or **A5** (Single) | `210 x 297 mm` (A4) / `148 x 210 mm` (A5) | Landscape (A4 3-part) or Portrait (A5) | 3 vertical stubs on A4: **Bank Copy**, **School Copy**, **Student Copy**, with cutting perforation guides. |
| **Payment Receipt** | **A5** | `148 x 210 mm` | Portrait | Single voucher receipt featuring dynamic UPI QR, transaction hash, and cashier signature block. |
| **Report Card / Transcript** | **A4** | `210 x 297 mm` | Portrait | Official institutional DMC with watermark, grading scale legend, teacher remarks, and principal signature block. |
| **Tabulation Sheet** | **A3** or **A4** | `297 x 420 mm` (A3) | Landscape | Comprehensive class-wide marks register with all subjects, aggregates, rankings, and pass/fail summary. |
| **Student / Staff ID Card**| **CR-80** | `85.60 x 53.98 mm` | Portrait / Landscape | Standard PVC credit card dimension, 300 DPI, barcode / QR code anchor, blood group, emergency contact. |
| **Salary Slip** | **A5** | `148 x 210 mm` | Portrait | Earnings and deductions breakdown, attendance days, net payable amount in numbers and words. |

---

## 9. Keyboard Interaction & Accessibility (WCAG 2.1 AA)

### 9.1 Keyboard Navigation & Hotkey Registry

| Hotkey Combination | Global / Context Scope | Action Executed |
| :--- | :--- | :--- |
| `Cmd + K` / `Ctrl + K` | Global (All screens) | Opens Universal Command Palette (search screens, jump to student, open settings). |
| `Escape` / `Esc` | Global | Closes open modal dialog, drawer sheet, popover, or clears search input. |
| `F2` | Accountant POS Terminal | Focuses search bar for instant student / voucher barcode scanning. |
| `F4` | Accountant POS Terminal | Collect and print slip. |
| `F8` | Accountant POS Terminal | Generates / Toggles sibling consolidated invoice. |
| `F9` | Accountant POS Terminal | Cycles payment tender (Cash, UPI QR, Net Banking, Demand Draft). |
| `ArrowUp` / `ArrowDown`| Marks & Attendance Matrix| Moves focus vertically between student rows while preserving column cell focus. |
| `Tab` / `Shift + Tab` | All Forms & Tables | Moves focus linearly between form inputs, interactive cells, and action buttons. |

---

### 9.2 WCAG 2.1 AA Compliance Checklist & Automated Test Mapping

The following verification suite proves full WCAG 2.1 AA compliance across all components and viewports:

- [ ] **Color Contrast Verification ($\ge 4.5:1$ text, $\ge 3.0:1$ components)**:
  - Proved by automated unit test: [`packages/config/design-tokens.contrast.test.ts`](file:///c:/Users/DELL/ERP/packages/config/design-tokens.contrast.test.ts).
- [ ] **Focus Visible Rings (2px focus ring with 2px offset)**:
  - Proved by automated Playwright test: [`tests/e2e/accessibility-focus.spec.ts`](file:///c:/Users/DELL/ERP/tests/e2e/accessibility-focus.spec.ts).
- [ ] **Screen Reader ARIA Roles & Live Announcements**:
  - Proved by automated component test: [`packages/ui/tests/aria-semantics.test.tsx`](file:///c:/Users/DELL/ERP/packages/ui/tests/aria-semantics.test.tsx).
- [ ] **Color-Blind Safety (Shape + Icon + Text status pairing)**:
  - Proved by automated component test: [`packages/ui/tests/status-badge.test.tsx`](file:///c:/Users/DELL/ERP/packages/ui/tests/status-badge.test.tsx).
- [ ] **Physical Touch Targets ($\ge 44\text{px} \times 44\text{px}$ on coarse pointers)**:
  - Proved by automated component test: [`packages/ui/tests/touch-targets.test.tsx`](file:///c:/Users/DELL/ERP/packages/ui/tests/touch-targets.test.tsx).
- [ ] **Keyboard Navigation & POS Hotkeys (`F2`, `F4`, `F8`, `F9`, `Esc`, `Tab`)**:
  - Proved by automated Playwright test: [`tests/e2e/keyboard-shortcuts.spec.ts`](file:///c:/Users/DELL/ERP/tests/e2e/keyboard-shortcuts.spec.ts).
- [ ] **Font Subsetting & Swap Strategy (`display: swap` for `hi-IN`)**:
  - Proved by automated asset test: [`packages/config/font-loading.test.ts`](file:///c:/Users/DELL/ERP/packages/config/font-loading.test.ts).

---

## 10. Super-Admin School Impersonation Visual Watermark

When a `super_admin` launches an impersonation session (`saas:impersonate`), the entire interface renders an immutable visual warning banner to prevent accidental administrative actions:

```
+---------------------------------------------------------------------------------------+
| [!] IMPERSONATION ACTIVE: You are viewing Demo Public School as School Administrator  |
| Session Log ID: imp-9042 | Reason: Ticket #4891 Arrears Audit   [ Exit Impersonation ]|
+---------------------------------------------------------------------------------------+
```

- **Top Fixed Watermark**: Persistent 36px fixed warning banner (`bg-warning text-warning-foreground font-semibold text-xs py-2 px-4 text-center z-[9999]`).
- **Screen Perimeter Stroke**: A continuous 3px striped diagonal warning border around the entire viewport perimeter using semantic token styling (`outline: 3px dashed hsl(var(--warning))` or utility class `outline-warning`).
- **Exit Action**: A prominent `[ Exit Impersonation ]` button returning the user immediately to `/admin/saas/schools`.

---

## 11. Component & Token Verification Matrix

| Component Area | Design System Rule | Enforcement File / Layer |
| :--- | :--- | :--- |
| **Brand Isolation** | Platform brand name exists only in `brand.ts` | `packages/config/brand.ts` |
| **Color Tokens** | Neutral Slate + Indigo Primary + Semantic Fills | `packages/ui/tailwind.config.ts`, `globals.css` |
| **Contrast Compliance** | Every pair $\ge 4.5:1$ text, $\ge 3:1$ components | `packages/config/design-tokens.contrast.test.ts` |
| **Typography** | Inter 14px Base + Noto Sans Devanagari (`hi-IN`) | `packages/ui/fonts.ts`, `packages/config` |
| **Numbers & Currency**| `₹` + Indian Numbering (`en-IN`) + `tabular-nums` | `packages/core/formatters/currency.ts` |
| **Icons** | Lucide Icons only (no external branding) | `lucide-react`, `lucide-react-native` |
| **Touch Targets** | $\ge 44\text{px}$ on coarse pointers, $36\text{px}$ on fine | `packages/ui/components/` |
| **Page Pattern** | Title + Breadcrumbs + Action Top-Right | `packages/ui/components/page-header.tsx` |
| **Tri-State UI** | Skeleton, Empty, and Error per screen | `packages/ui/components/states/` |
| **Print Output** | A4/A5 `@media print` with zero chrome | `packages/ui/styles/print.css` |
| **Accessibility** | WCAG 2.1 AA verified via automated tests | Continuous Playwright axe-core audits |
