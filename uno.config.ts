import { defineConfig, presetWind3, presetAttributify } from "unocss";

/**
 * UnoCSS — the engine that replaced Tailwind v4.
 *
 * presetWind3      → atomic, composable utilities (the Tachyons philosophy,
 *                    with a vocabulary the existing markup already speaks).
 * presetAttributify→ the attribute DX: <h1 text="fluid-display" font="spraypaint">.
 *
 * NOTE: there is no Tachyons preset published for UnoCSS v66 (the spike proved
 * this — @unocss/preset-tachyons 404s). Rather than vendor a dead package, the
 * Tachyons *spirit* is revived below as terse `shortcuts` (`ba`, `bw2`, …) mapped
 * onto our design tokens. Those shortcuts double as the named, lint-guarded
 * component recipes that replace CVA.
 */
export default defineConfig({
	content: {
		filesystem: [
			"app/**/*.{ts,tsx}",
			"components/**/*.{ts,tsx}",
			"lib/**/*.{ts,tsx}",
		],
	},

	presets: [presetWind3({ dark: "class" }), presetAttributify()],

	theme: {
		colors: {
			background: "var(--background)",
			foreground: "var(--foreground)",
			card: "var(--card)",
			"card-foreground": "var(--card-foreground)",
			muted: "var(--muted)",
			"muted-foreground": "var(--muted-foreground)",
			border: "var(--border)",
			input: "var(--input)",
			ring: "var(--ring)",
			primary: "var(--primary)",
			"primary-foreground": "var(--primary-foreground)",
			secondary: "var(--secondary)",
			accent: "var(--accent)",
			destructive: "var(--destructive)",
			"destructive-foreground": "var(--destructive-foreground)",
		},
		fontFamily: {
			sans: "var(--font-opensans), ui-sans-serif, system-ui, sans-serif",
			spraypaint: "var(--font-spraypaint), cursive",
			schoolbell: "var(--font-schoolbell), cursive",
			fontdiner: "var(--font-fontdiner), cursive",
			mono: "var(--font-mono), ui-monospace, monospace",
		},
		// Fluid grotesque scale. Sizes are clamp() vars defined in globals.css —
		// THIS is "responsive by default": type scales with the viewport, no
		// breakpoints. Restrained 12→24 body band; large display roles preserved.
		fontSize: {
			"fluid-xs": ["var(--fs-xs)", { "line-height": "1.3" }],
			"fluid-sm": ["var(--fs-sm)", { "line-height": "1.35" }],
			"fluid-base": ["var(--fs-base)", { "line-height": "1.45" }],
			"fluid-lg": ["var(--fs-lg)", { "line-height": "1.25" }],
			"fluid-xl": ["var(--fs-xl)", { "line-height": "1.1" }],
			"fluid-display-sm": ["var(--fs-display-sm)", { "line-height": "0.95" }],
			"fluid-display": ["var(--fs-display)", { "line-height": "0.95" }],
		},
	},

	rules: [
		// Tailwind/Uno stop at border-2 then jump to border-4; brutalism wants 3px.
		["border-3", { "border-width": "3px" }],
		// Brutalist hard shadow: shadow-hard, shadow-hard-4, shadow-hard-6…
		[
			/^shadow-hard(?:-(\d+))?$/,
			([, n]) => {
				const o = n || "3";
				return { "box-shadow": `${o}px ${o}px 0 0 rgba(0,0,0,1)` };
			},
		],
	],

	// The CVA replacement: named brutalist recipes + revived Tachyons terse names.
	// Edit the recipe once, every instance updates — and the linter guards the scale.
	shortcuts: {
		ba: "border border-solid border-foreground",
		bw2: "border-2",
		bw3: "border-3",
		bw4: "border-4",
		"brutalist-box": "bg-background border-2 border-foreground shadow-hard",
		"brutalist-box-lg":
			"bg-background border-4 border-foreground shadow-hard-6",
		"todo-checkbox":
			"bg-background border-2 border-foreground flex items-center justify-center shadow-hard transition-all duration-200 ease-out",
	},

	// THE CONSTRAINT ENGINE. Off-scale arbitrary type/space values are banned;
	// @unocss/eslint-plugin turns these into lint errors ("it won't let you").
	// Arbitrary shadows / max-widths stay allowed — only the type & space scales
	// are locked to the fluid tokens.
	blocklist: [/^text-\[/, /^[mp][trblxy]?-\[/, /^gap-\[/],
});
