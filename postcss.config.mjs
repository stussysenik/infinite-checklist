/** @type {import('postcss-load-config').Config} */
const config = {
	plugins: {
		// UnoCSS replaces Tailwind. The PostCSS integration works under both
		// webpack and Turbopack (it runs at the CSS layer, not as a bundler plugin),
		// reads uno.config.ts, and expands the `@unocss;` directive in globals.css.
		"@unocss/postcss": {},
	},
};

export default config;
