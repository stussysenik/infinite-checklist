"use client";

import { useSyncExternalStore } from "react";

/**
 * Configurable keybinding store.
 *
 * Same shape as the todo store (lib/store/todos): an observable singleton
 * persisted to localStorage and read through useSyncExternalStore so SSR and
 * the first client render agree on the DEFAULTS, then hydrate. The UI mutates
 * bindings only through ops (rebind / reset) — never by reaching into state.
 *
 * `mod` is the platform-agnostic primary modifier: ⌘ on macOS, Ctrl elsewhere.
 * Matching treats metaKey OR ctrlKey as `mod`, so a binding works on both.
 */

export type ShortcutAction = "addTodo" | "randomColor";

export interface Binding {
	mod: boolean; // ⌘ on macOS / Ctrl elsewhere
	shift: boolean;
	alt: boolean;
	key: string; // single char (lowercased) or a named key e.g. "Enter"
}

export interface ShortcutMeta {
	action: ShortcutAction;
	label: string;
}

// The rebindable shortcuts, in display order.
export const SHORTCUTS: ShortcutMeta[] = [
	{ action: "addTodo", label: "Add todo" },
	{ action: "randomColor", label: "Random color" },
];

const DEFAULTS: Record<ShortcutAction, Binding> = Object.freeze({
	addTodo: { mod: true, shift: false, alt: false, key: "a" },
	randomColor: { mod: true, shift: false, alt: false, key: "r" },
});

const STORAGE_KEY = "infinite-shortcuts";

type Listener = () => void;

let bindings: Record<ShortcutAction, Binding> = DEFAULTS;
let hydrated = false;
let capturing = false; // true while the panel is recording a new keystroke
const listeners = new Set<Listener>();

function isBinding(b: unknown): b is Binding {
	return (
		!!b &&
		typeof (b as Binding).key === "string" &&
		typeof (b as Binding).mod === "boolean" &&
		typeof (b as Binding).shift === "boolean" &&
		typeof (b as Binding).alt === "boolean"
	);
}

function normalize(b: Binding): Binding {
	return {
		mod: b.mod,
		shift: b.shift,
		alt: b.alt,
		key: b.key.length === 1 ? b.key.toLowerCase() : b.key,
	};
}

function persist(): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
	} catch {
		/* quota / private mode — non-fatal */
	}
}

function hydrate(): void {
	if (hydrated || typeof window === "undefined") return;
	hydrated = true;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const next: Record<ShortcutAction, Binding> = { ...DEFAULTS };
		for (const { action } of SHORTCUTS) {
			const b = parsed?.[action];
			if (isBinding(b)) next[action] = normalize(b);
		}
		bindings = next;
	} catch {
		bindings = { ...DEFAULTS };
	}
}

function emit(): void {
	persist();
	for (const l of listeners) l();
}

export const shortcutStore = {
	subscribe(listener: Listener): () => void {
		hydrate();
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
	getSnapshot(): Record<ShortcutAction, Binding> {
		return bindings;
	},
	getServerSnapshot(): Record<ShortcutAction, Binding> {
		return DEFAULTS;
	},

	// ---- ops ----
	rebind(action: ShortcutAction, binding: Binding): void {
		bindings = { ...bindings, [action]: normalize(binding) };
		emit();
	},
	reset(): void {
		bindings = { ...DEFAULTS };
		emit();
	},

	// ---- capture guard ----
	// While the panel records a new keystroke, the app's global handler must
	// ignore that keystroke so rebinding ⌘A doesn't also open the input.
	setCapturing(value: boolean): void {
		capturing = value;
	},
	isCapturing(): boolean {
		return capturing;
	},
};

export function useShortcuts(): Record<ShortcutAction, Binding> {
	return useSyncExternalStore(
		shortcutStore.subscribe,
		shortcutStore.getSnapshot,
		shortcutStore.getServerSnapshot,
	);
}

// ---- helpers (pure) ----

const MODIFIER_KEYS = new Set(["Meta", "Control", "Shift", "Alt"]);

export function matchesBinding(b: Binding, e: KeyboardEvent): boolean {
	const mod = e.metaKey || e.ctrlKey;
	return (
		b.mod === mod &&
		b.shift === e.shiftKey &&
		b.alt === e.altKey &&
		e.key.toLowerCase() === b.key.toLowerCase()
	);
}

/** Build a Binding from a keydown event; null if only modifiers were pressed. */
export function bindingFromEvent(e: KeyboardEvent): Binding | null {
	if (MODIFIER_KEYS.has(e.key)) return null;
	return normalize({
		mod: e.metaKey || e.ctrlKey,
		shift: e.shiftKey,
		alt: e.altKey,
		key: e.key,
	});
}

export function isMac(): boolean {
	if (typeof navigator === "undefined") return false;
	return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/** Human-readable combo, e.g. "⌘ A" on macOS or "Ctrl A" elsewhere. */
export function formatBinding(b: Binding): string {
	const mac = isMac();
	const parts: string[] = [];
	if (b.mod) parts.push(mac ? "⌘" : "Ctrl");
	if (b.alt) parts.push(mac ? "⌥" : "Alt");
	if (b.shift) parts.push("⇧");
	parts.push(b.key.length === 1 ? b.key.toUpperCase() : b.key);
	return parts.join(" ");
}
