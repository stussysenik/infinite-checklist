"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
	shortcutStore,
	useShortcuts,
	SHORTCUTS,
	formatBinding,
	bindingFromEvent,
	type ShortcutAction,
} from "@/lib/store/shortcuts";

// Contextual keys that aren't rebindable — listed so the panel is the single
// place every shortcut lives.
const REFERENCE: { label: string; keys: string }[] = [
	{ label: "Submit todo", keys: "Enter" },
	{ label: "Cancel input", keys: "Esc" },
	{ label: "Add (mobile)", keys: "Double-tap" },
	{ label: "Add (desktop)", keys: "Double-click" },
];

export function ShortcutsPanel() {
	const bindings = useShortcuts();
	const [open, setOpen] = useState(false);
	const [capturing, setCapturing] = useState<ShortcutAction | null>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);

	// Recording a new binding: the next non-modifier keystroke is captured.
	// We flag the store so the app's global handler ignores this keystroke, and
	// listen in the capture phase so it never reaches other handlers either.
	useEffect(() => {
		if (!capturing) return;
		shortcutStore.setCapturing(true);
		const onKey = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (e.key === "Escape") {
				setCapturing(null);
				return;
			}
			const binding = bindingFromEvent(e);
			if (binding) {
				shortcutStore.rebind(capturing, binding);
				setCapturing(null);
			}
		};
		window.addEventListener("keydown", onKey, { capture: true });
		return () => {
			window.removeEventListener("keydown", onKey, { capture: true });
			shortcutStore.setCapturing(false);
		};
	}, [capturing]);

	// Close on outside click. Deferred so the opening click doesn't immediately
	// close it. (Clicks inside stopPropagation below, so the app's
	// double-click-to-add never fires from panel interactions either.)
	useEffect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(e.target as Node)
			) {
				setOpen(false);
				setCapturing(null);
			}
		};
		const id = window.setTimeout(
			() => window.addEventListener("click", onClick),
			0,
		);
		return () => {
			window.clearTimeout(id);
			window.removeEventListener("click", onClick);
		};
	}, [open]);

	return (
		<div
			ref={wrapperRef}
			className="relative z-50"
			onClick={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-label="Keyboard shortcuts"
				aria-expanded={open}
				className="w-14 h-14 md:w-24 md:h-24 flex items-center justify-center bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] md:shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:shadow-[12px_12px_0_0_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-0 active:translate-y-0 transition-all duration-150 ease-out text-2xl md:text-5xl leading-none select-none"
			>
				⌨
			</button>

			{open && (
				<div className="fade-in-up absolute top-16 md:top-28 left-0 w-80 max-w-[calc(100vw-32px)] bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:shadow-[12px_12px_0_0_rgba(0,0,0,1)] p-4 md:p-6 overflow-hidden">
					<div className="flex items-center justify-between mb-3 border-b-2 border-muted pb-2">
						<span className="font-spraypaint text-sm uppercase tracking-widest text-black">
							SHORTCUTS
						</span>
						<button
							type="button"
							onClick={() => shortcutStore.reset()}
							className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-black border border-muted hover:border-black px-2 py-1 transition-all"
						>
							Reset
						</button>
					</div>

					<div className="flex flex-col gap-2">
						{SHORTCUTS.map(({ action, label }) => (
							<div
								key={action}
								className="flex items-center justify-between gap-3"
							>
								<span className="font-sans text-[13px] font-medium text-black">
									{label}
								</span>
								<button
									type="button"
									onClick={() => setCapturing(action)}
									className={cn(
										"font-mono text-[11px] min-w-16 px-2 py-1 border transition-all",
										capturing === action
											? "border-black bg-black text-white animate-pulse"
											: "border-muted text-black hover:border-black",
									)}
								>
									{capturing === action
										? "RECORDING…"
										: formatBinding(bindings[action])}
								</button>
							</div>
						))}

						<div className="mt-1 pt-2 border-t-2 border-muted flex flex-col gap-2">
							{REFERENCE.map((r) => (
								<div
									key={r.label}
									className="flex items-center justify-between gap-3"
								>
									<span className="font-sans text-[13px] text-muted-foreground">
										{r.label}
									</span>
									<kbd className="font-mono text-[11px] px-2 py-1 bg-muted border border-muted text-muted-foreground">
										{r.keys}
									</kbd>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
