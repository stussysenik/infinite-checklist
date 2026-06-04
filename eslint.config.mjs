import unocss from "@unocss/eslint-plugin";

/**
 * The constraint engine (intended path).
 *
 * `unocss/blocklist` reads the `blocklist` in uno.config.ts and turns any
 * off-scale / off-grid utility (arbitrary `text-[…]`, `p-[…]`, `gap-[…]`)
 * into a lint ERROR — "it won't even let you" leave the type/space grid.
 *
 * NOTE: parsing .tsx requires a TS parser. If your ESLint version can't load
 * one, the equivalent guard runs dependency-free via `bun run lint:grid`
 * (scripts/check-grid.mjs), which is the proof wired into CI / the ship gate.
 */
export default [
	{
		files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
		plugins: { unocss: unocss.configs.flat.plugins.unocss },
		rules: {
			"unocss/blocklist": "error",
			"unocss/order": "warn",
		},
	},
];
