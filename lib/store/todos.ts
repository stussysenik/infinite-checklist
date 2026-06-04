"use client";

import { useSyncExternalStore } from "react";

export interface Todo {
	id: string;
	text: string;
	completed: boolean;
	archived: boolean;
	color: string;
}

/**
 * CRDT-shaped todo store.
 *
 * The UI speaks to this through OPS (add / toggle / setArchived / remove) over
 * an observable doc — never `setTodos`. That is deliberate: the op-based shape
 * mirrors a CRDT, so Phase 2 (multiplayer) swaps the localStorage backing below
 * for a Y.Doc + y-indexeddb + PartyKit provider and the entire UI is untouched.
 *
 * Today: a single in-memory snapshot persisted to localStorage, exposed via
 * useSyncExternalStore (SSR-safe — server + first client render are empty, then
 * we hydrate, so there is no hydration mismatch).
 */

const STORAGE_KEY = "infinite-todos";
const EMPTY: Todo[] = [];

type Listener = () => void;

let todos: Todo[] = EMPTY;
let hydrated = false;
const listeners = new Set<Listener>();

let seq = 0;
function makeId(): string {
	return `${Date.now().toString(36)}-${(seq++).toString(36)}`;
}

function isTodo(t: unknown): t is Todo {
	return (
		!!t &&
		typeof (t as Todo).id === "string" &&
		typeof (t as Todo).text === "string" &&
		typeof (t as Todo).completed === "boolean"
	);
}

function persist(): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
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
		const parsed: unknown = JSON.parse(raw);
		if (Array.isArray(parsed) && parsed.every(isTodo)) {
			// Archive always starts empty on load (matches prior behavior).
			todos = parsed.map((t) => ({ ...(t as Todo), archived: false }));
		}
	} catch {
		todos = EMPTY;
	}
}

function emit(): void {
	persist();
	for (const l of listeners) l();
}

export const todoStore = {
	subscribe(listener: Listener): () => void {
		hydrate();
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
	getSnapshot(): Todo[] {
		return todos;
	},
	getServerSnapshot(): Todo[] {
		return EMPTY;
	},

	// ---- ops (the CRDT-shaped interface) ----
	add(text: string, color: string): void {
		const value = text.trim();
		if (!value) return;
		todos = [
			...todos,
			{ id: makeId(), text: value, completed: false, archived: false, color },
		];
		emit();
	},
	toggle(id: string): void {
		todos = todos.map((t) =>
			t.id === id ? { ...t, completed: !t.completed, archived: false } : t,
		);
		emit();
	},
	setArchived(id: string, archived: boolean): void {
		todos = todos.map((t) => (t.id === id ? { ...t, archived } : t));
		emit();
	},
	remove(id: string): void {
		todos = todos.filter((t) => t.id !== id);
		emit();
	},
};

export function useTodos(): Todo[] {
	return useSyncExternalStore(
		todoStore.subscribe,
		todoStore.getSnapshot,
		todoStore.getServerSnapshot,
	);
}
