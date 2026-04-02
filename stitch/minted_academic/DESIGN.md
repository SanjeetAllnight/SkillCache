# Design System Strategy: The Digital Atelier

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Atelier."** 

Unlike standard educational platforms that feel like rigid spreadsheets or chaotic social feeds, this system treats the skill exchange as a curated, high-end workshop. We move away from the "template" look by embracing **Organic Editorialism**. This means prioritizing extreme breathing room, intentional asymmetry, and a tactile, paper-like depth. We don't just "display" skills; we showcase them as premium assets. By using a sophisticated contrast between the architectural *Manrope* and the functional *Inter*, the UI feels like a modern gallery—elevating the student experience from a simple transaction to a prestigious craft exchange.

---

## 2. Colors & Surface Philosophy

The palette is rooted in a "New Neutral" philosophy, using soft mints and warm stones to create a calm, focused environment.

### The "No-Line" Rule
**Borders are a failure of hierarchy.** In this system, 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts or tonal transitions. To separate a sidebar from a main feed, use a transition from `surface` (#fdfae6) to `surface-container-low` (#f7f4e1).

### Surface Hierarchy & Nesting
Treat the UI as a physical desk with stacked sheets of fine vellum. 
- **Base Layer:** `surface` (#fdfae6) for the overall canvas.
- **Sectioning:** Use `surface-container` (#f1eedb) for large layout blocks.
- **Interactive Elements:** Use `surface-container-lowest` (#ffffff) for cards or inputs to create a "pop" of brightness that draws the eye without needing a stroke.

### The "Glass & Gradient" Rule
To inject "soul" into the mint palette, use **Backdrop Blurs** (12px–20px) on floating navigation bars or modals using a semi-transparent `surface-container-lowest` (e.g., 80% opacity). Main CTAs should not be flat; use a subtle linear gradient from `primary` (#326943) to `primary_container` (#94cfa0) at a 135° angle to create a soft, pillowy volume.

---

## 3. Typography: The Editorial Voice

We utilize a dual-typeface system to balance authority with utility.

- **Display & Headlines (Manrope):** These are your "Editorial Hooks." Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) for hero sections to create a bold, confident statement. Headlines should feel like magazine titles—asymmetric and spacious.
- **Body & Labels (Inter):** The "Workhorse." Use `body-md` (0.875rem) for most content to maintain a modern, tech-forward feel. 
- **The Hierarchy Strategy:** Ensure a dramatic scale jump between `headline-lg` and `body-lg`. If everything is important, nothing is. High-contrast sizing is what separates a "premium" app from a "standard" one.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are often "dirty." In this design system, we use light and tone to imply height.

### The Layering Principle
Achieve depth by "nesting" tokens. A `surface-container-highest` (#e6e3d0) element should host `surface-container-lowest` (#ffffff) child components. This creates a natural, soft-box lighting effect.

### Ambient Shadows
For floating elements (Modals, Hovering Cards), use "Atmospheric Shadows":
- **X: 0, Y: 12px, Blur: 40px, Spread: -5px.**
- **Color:** Use `on_surface` (#1c1c11) at 4% to 6% opacity. Never use pure black; the shadow must feel like a tinted reflection of the surface below.

### The "Ghost Border" Fallback
If contrast testing requires a boundary, use the **Ghost Border**: `outline_variant` (#c0c9be) at 15% opacity. It should be felt, not seen.

---

## 5. Component Logic

### Buttons: The Tactile Pill
- **Primary:** Gradient-filled (Primary to Primary-Container), `xl` (3rem) corner radius. No border.
- **Secondary:** `surface-container-high` background with `on_primary_container` text.
- **Interaction:** On hover, instead of darkening, use a slight "Lift" (Y-axis -2px) and increase shadow diffusion.

### Chips: The Skill Tags
For skill badges (e.g., "UI Design," "Python"), use `secondary_container` (#c5e9cb) with `on_secondary_container` text. Use `full` (9999px) rounding. These should feel like smooth river stones.

### Cards: Content Vessels
**Never use dividers.** To separate content within a card, use a `3` (1rem) spacing gap or a subtle shift to a `surface_variant` background for the footer of the card. Cards should use the `lg` (2rem) or `xl` (3rem) rounding to maintain the "Soft Minimal" aesthetic.

### Input Fields: Soft Focus
Inputs should be `surface_container_lowest` (#ffffff) with a `6` (2rem) height. The label should use `label-md` in `on_surface_variant`. On focus, do not use a heavy blue ring; instead, transition the "Ghost Border" to 100% opacity of the `primary` token.

### Special Component: The "Exchange Card"
For SkillCache's unique "Skill Match," use a layered card where the "Mentor" and "Learner" profiles overlap slightly, using **Glassmorphism** on the top layer to show the connection through transparency.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use `20` (7rem) and `24` (8.5rem) spacing for top-level section margins. Give the content room to breathe.
- **Do** align text-heavy blocks to a centered, narrow column (editorial style) rather than stretching them full-width.
- **Do** use `tertiary` (#8d4a58) sparingly for "Human" elements—like notifications or "Live" indicators—to break the green monotone.

### Don't:
- **Don't** use 100% black (#000000) for text. Always use `on_surface` (#1c1c11) to maintain the soft, premium feel.
- **Don't** use `md` or `sm` rounding for primary containers. It breaks the organic "Soft Minimal" language. Stick to `lg` and `xl`.
- **Don't** use standard "Loaders." Use a shimmering skeleton screen that mimics the `surface-container` tiers.

---

**Director's Note:** This system succeeds when it feels "quiet." If a screen feels busy, remove a line and add 2rem of white space. Let the typography and the mint-toned surfaces do the heavy lifting.