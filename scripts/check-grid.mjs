#!/usr/bin/env node
/**
 * Strict-snap-to-grid guard (dependency-free).
 *
 * Enforces the same constraint as uno.config.ts `blocklist`, but without
 * relying on an ESLint/TS-parser toolchain: it fails the build if any source
 * file uses an OFF-GRID arbitrary type or spacing utility. Type must come from
 * the fluid scale (text-fluid-*); spacing must stay on the 8pt grid (no
 * arbitrary p-/m-/gap-/space-[…]).
 *
 * This is the red/green proof for the v1.1 ship gate:
 *   green → all type/space snaps to the scale
 *   red   → prints file:line of every off-grid escape hatch
 *
 * Allowed arbitrary values (intentionally NOT blocked): shadow-[…] (brutalist
 * hard shadows) and max-w-[…] (content clamps).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components", "lib"];
const EXT = /\.(t|j)sx?$/;

// Off-grid escape hatches: arbitrary font-size/color and arbitrary spacing.
const BANNED = [
	{ re: /\btext-\[[^\]]+\]/g, why: "arbitrary text-[…] — use text-fluid-* scale" },
	{ re: /\b[mp][trblxy]?-\[[^\]]+\]/g, why: "arbitrary padding/margin — snap to 8pt grid" },
	{ re: /\bgap-\[[^\]]+\]/g, why: "arbitrary gap-[…] — snap to 8pt grid" },
	{ re: /\bspace-[xy]-\[[^\]]+\]/g, why: "arbitrary space-[…] — snap to 8pt grid" },
];

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const s = statSync(full);
		if (s.isDirectory()) walk(full, out);
		else if (EXT.test(entry)) out.push(full);
	}
	return out;
}

const violations = [];
for (const root of ROOTS) {
	let files = [];
	try {
		files = walk(root);
	} catch {
		continue;
	}
	for (const file of files) {
		const lines = readFileSync(file, "utf8").split("\n");
		lines.forEach((line, i) => {
			for (const { re, why } of BANNED) {
				re.lastIndex = 0;
				let m;
				while ((m = re.exec(line))) {
					violations.push({ file, line: i + 1, match: m[0], why });
				}
			}
		});
	}
}

if (violations.length) {
	console.error(`\n✗ strict-snap-to-grid: ${violations.length} off-grid value(s)\n`);
	for (const v of violations) {
		console.error(`  ${v.file}:${v.line}  ${v.match}\n      ↳ ${v.why}`);
	}
	console.error("");
	process.exit(1);
}

console.log("✓ strict-snap-to-grid: all type & spacing on the scale");
