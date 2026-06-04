"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTodos, todoStore } from "@/lib/store/todos";
import {
	shortcutStore,
	useShortcuts,
	matchesBinding,
	formatBinding,
} from "@/lib/store/shortcuts";
import { ShortcutsPanel } from "./shortcuts-panel";

const ARCHIVE_DELAY = 300; // 300ms for super instant feel

// The single spot color. Flat green keyline, used for the wordmark check and
// the empty-state heading — "match the green" with one source of truth.
const BRAND_GREEN = "#16a34a";

export function InfiniteChecklist() {
        // State + persistence live in the CRDT-shaped store (lib/store/todos).
        // The UI only issues ops (add/toggle/setArchived/remove) — never setTodos —
        // so Phase 2 can swap the backing for a Y.Doc with zero UI changes.
        const todos = useTodos();
        const shortcuts = useShortcuts();
        const [draggedId, setDraggedId] = useState<string | null>(null);
        const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
        const [isOverTrash, setIsOverTrash] = useState(false);

        const [newTodoText, setNewTodoText] = useState("");
        const [isDraggingFromArchive, setIsDraggingFromArchive] =
                useState(false);
        const [showInput, setShowInput] = useState(false);
        const [inputFocusedViaShortcut, setInputFocusedViaShortcut] =
                useState(false);
        const DOUBLE_TAP_DELAY = 300; // ms between taps
        const [canScrollLeft, setCanScrollLeft] = useState(false);
        const [canScrollRight, setCanScrollRight] = useState(false);
        // Title tint. Defaults to the theme foreground token (so it survives
        // dark mode); the "Random color" shortcut sprays it a fresh hue.
        const [accentColor, setAccentColor] =
                useState<string>("var(--foreground)");
        // Gate platform-specific shortcut hints to post-mount so SSR and the
        // first client render agree (isMac() can't run on the server).
        const [mounted, setMounted] = useState(false);
        const dragStartPos = useRef({ x: 0, y: 0 });
        const inputRef = useRef<HTMLInputElement>(null);
        const scrollContainerRef = useRef<HTMLDivElement>(null);
        const hasDragged = useRef(false);
        const DRAG_THRESHOLD = 12; // pixels to distinguish click from drag
        const archiveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
        const lastTapTimeRef = useRef(0);
        const lastClickTimeRef = useRef(0);

        // Generate random readable color with good contrast against white
        const generateRandomColor = () => {
                const hue = Math.floor(Math.random() * 360);
                const saturation = Math.floor(Math.random() * 30) + 60; // 60-90% for vibrancy
                const lightness = Math.floor(Math.random() * 30) + 20; // 20-50% for contrast
                return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        };

        useEffect(() => setMounted(true), []);

        // Focus the add input. The input only mounts once showInput flips true,
        // so we defer the focus to the next tick — focusing synchronously here
        // (the old cmd+A bug) no-ops because the element isn't in the DOM yet.
        const openAddInput = () => {
                setShowInput(true);
                setInputFocusedViaShortcut(true);
                setTimeout(() => inputRef.current?.focus(), 50);
                setTimeout(() => setInputFocusedViaShortcut(false), 200);
        };

        useEffect(() => {
                const handleKeyDown = (e: KeyboardEvent) => {
                        // Ignore while the panel is recording a new binding, and
                        // while typing in a field (so cmd+A still selects text).
                        if (shortcutStore.isCapturing()) return;
                        const t = e.target as HTMLElement | null;
                        if (
                                t &&
                                (t.tagName === "INPUT" ||
                                        t.tagName === "TEXTAREA" ||
                                        t.isContentEditable)
                        )
                                return;

                        const keys = shortcutStore.getSnapshot();
                        if (matchesBinding(keys.addTodo, e)) {
                                e.preventDefault();
                                openAddInput();
                        } else if (matchesBinding(keys.randomColor, e)) {
                                e.preventDefault();
                                setAccentColor(generateRandomColor());
                        }
                };
                // Handle double-tap on mobile
                const handleTouchStart = (e: TouchEvent) => {
                        const currentTime = Date.now();
                        const timeDiff = currentTime - lastTapTimeRef.current;

                        // Check if this is a double-tap
                        if (timeDiff < DOUBLE_TAP_DELAY && timeDiff > 0) {
                                // Double-tap detected
                                e.preventDefault();
                                openAddInput();
                        }

                        lastTapTimeRef.current = currentTime;
                };

                const handleClick = () => {
                        const currentTime = Date.now();
                        const timeDiff = currentTime - lastClickTimeRef.current;

                        // Check if this is a double-click
                        if (timeDiff < DOUBLE_TAP_DELAY && timeDiff > 0) {
                                // Double-click detected
                                openAddInput();
                        }

                        lastClickTimeRef.current = currentTime;
                };

                window.addEventListener("keydown", handleKeyDown);
                window.addEventListener("touchstart", handleTouchStart, {
                        passive: false,
                });
                window.addEventListener("click", handleClick);
                return () => {
                        window.removeEventListener("keydown", handleKeyDown);
                        window.removeEventListener(
                                "touchstart",
                                handleTouchStart,
                        );
                        window.removeEventListener("click", handleClick);
                };
        }, []);

        // Load + persistence now live in the store (lib/store/todos), which
        // validates, hydrates SSR-safely, and writes through on every op.

        // Cleanup archive timeouts on unmount
        useEffect(() => {
                return () => {
                        Object.values(archiveTimeouts.current).forEach(
                                (timeout) => {
                                        clearTimeout(timeout);
                                },
                        );
                        archiveTimeouts.current = {};
                };
        }, []);

        // Track horizontal scroll position so the chevron hints reflect which
        // way you can actually scroll (left appears once you've moved off the
        // start; right hides once you reach the end).
        useEffect(() => {
                const el = scrollContainerRef.current;
                const updateScrollHints = () => {
                        if (!el) return;
                        const max = el.scrollWidth - el.clientWidth;
                        setCanScrollLeft(el.scrollLeft > 4);
                        setCanScrollRight(el.scrollLeft < max - 4);
                };

                updateScrollHints();
                el?.addEventListener("scroll", updateScrollHints, {
                        passive: true,
                });
                window.addEventListener("resize", updateScrollHints);
                return () => {
                        el?.removeEventListener("scroll", updateScrollHints);
                        window.removeEventListener("resize", updateScrollHints);
                };
        }, [todos]);

        const toggleTodo = (id: string) => {
                const todo = todos.find((t) => t.id === id);
                if (!todo) return;
                const willComplete = !todo.completed;

                // Reset any pending archive for this todo.
                if (archiveTimeouts.current[id]) {
                        clearTimeout(archiveTimeouts.current[id]);
                        delete archiveTimeouts.current[id];
                }

                todoStore.toggle(id);

                // If completing, schedule the archive sweep (timing stays in the
                // component; the store just records the archived op when it fires).
                if (willComplete) {
                        archiveTimeouts.current[id] = setTimeout(() => {
                                todoStore.setArchived(id, true);
                                delete archiveTimeouts.current[id];
                        }, ARCHIVE_DELAY);
                }
        };

        const addTodo = (e: React.FormEvent) => {
                e.preventDefault();
                if (newTodoText.trim()) {
                        todoStore.add(newTodoText, generateRandomColor());
                        setNewTodoText("");
                }
        };

        const handleDragStart = (
                e: React.MouseEvent | React.TouchEvent,
                id: string,
                fromArchive = false,
        ) => {
                e.stopPropagation();
                const clientX =
                        "touches" in e ? e.touches[0].clientX : e.clientX;
                const clientY =
                        "touches" in e ? e.touches[0].clientY : e.clientY;

                setDraggedId(id);
                setIsDraggingFromArchive(fromArchive);
                dragStartPos.current = { x: clientX, y: clientY };
                setDragPosition({ x: 0, y: 0 });
                hasDragged.current = false;

                // Clear archive timeout if dragging this todo
                if (archiveTimeouts.current[id]) {
                        clearTimeout(archiveTimeouts.current[id]);
                        delete archiveTimeouts.current[id];
                }
        };

        const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
                if (!draggedId) return;

                const clientX =
                        "touches" in e ? e.touches[0].clientX : e.clientX;
                const clientY =
                        "touches" in e ? e.touches[0].clientY : e.clientY;

                const deltaX = clientX - dragStartPos.current.x;
                const deltaY = clientY - dragStartPos.current.y;

                // Check if we've moved past the drag threshold
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                if (distance > DRAG_THRESHOLD) {
                        hasDragged.current = true;
                }

                setDragPosition({ x: deltaX, y: deltaY });

                const centerX = window.innerWidth / 2;
                const trashThreshold = 100;
                setIsOverTrash(
                        clientX > centerX - trashThreshold &&
                                clientX < centerX + trashThreshold &&
                                clientY > window.innerHeight - 200,
                );
        };

        const handleDragEnd = () => {
                if (!draggedId) return;

                if (isOverTrash) {
                        todoStore.remove(draggedId);

                        // Clear timeout if any
                        if (archiveTimeouts.current[draggedId]) {
                                clearTimeout(
                                        archiveTimeouts.current[draggedId],
                                );
                                delete archiveTimeouts.current[draggedId];
                        }
                } else if (isDraggingFromArchive) {
                        // Dropped outside trash while dragging from archive - restore to main list
                        todoStore.setArchived(draggedId, false);
                }

                setDraggedId(null);
                setDragPosition({ x: 0, y: 0 });
                setIsOverTrash(false);
                setIsDraggingFromArchive(false);
        };

        const handleButtonClick = (e: React.MouseEvent, id: string) => {
                e.stopPropagation();
                // Only toggle if it was a click, not a drag
                if (!hasDragged.current) {
                        toggleTodo(id);
                }
        };

        return (
                <div
                        className="flex flex-col h-screen bg-transparent overflow-hidden select-none relative touch-optimized no-tap-highlight"
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        onTouchMove={handleDragMove}
                        onTouchEnd={handleDragEnd}
                >
                        {/* Keyboard icon - pinned top-left, snapped to graph paper grid
                            Adjust positioning for mobile to prevent wordmark overlap. */}
                        <div className="absolute top-4 left-4 md:top-8 md:left-8 z-50">
                                <ShortcutsPanel />
                        </div>

                        {/* Centered Hero Cluster - iA Writer Focus */}
                        <div className="flex flex-col items-center justify-center pt-28 pb-10 md:pt-48 md:pb-24 w-full">
                                <div className="flex items-center justify-center gap-3 md:gap-10 px-4 max-w-full">
                                        <h1
                                                font="fontdiner"
                                                text="fluid-display"
                                                className="tracking-tighter leading-none transition-colors duration-500 ease-in-out text-center"
                                                style={{ color: accentColor }}
                                        >
                                                checklisting...
                                        </h1>
                                        <div
                                                aria-hidden="true"
                                                className="inline-flex items-center justify-center shrink-0 w-12 h-12 md:w-24 md:h-24 bg-[#16a34a] border-2 border-black shadow-ia"
                                        >
                                                <svg
                                                        width="60%"
                                                        height="60%"
                                                        viewBox="0 0 16 16"
                                                        fill="none"
                                                        className="text-white"
                                                >
                                                        <path
                                                                d="M13 4L6 11L3 8"
                                                                stroke="currentColor"
                                                                strokeWidth="3"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                        />
                                                </svg>
                                        </div>
                                </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center relative w-full px-4 overflow-hidden">
                                {/* Archive - pinned top-right, technical annotation style */}
                                {todos.some((t) => t.archived) && (
                                        <div className="absolute top-0 right-6 md:right-10 flex flex-col items-end gap-3 z-20">
                                                <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 border-b border-muted pb-1">
                                                        ARCHIVE
                                                </div>
                                                {todos
                                                        .filter((t) => t.archived)
                                                        .map((todo) => (
                                                                <div
                                                                        key={todo.id}
                                                                        className={cn(
                                                                                "touch-optimized flex items-center gap-3 cursor-grab bg-white border border-black p-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all",
                                                                                draggedId === todo.id && "opacity-0"
                                                                        )}
                                                                        onMouseDown={(e) => handleDragStart(e, todo.id, true)}
                                                                        onTouchStart={(e) => handleDragStart(e, todo.id, true)}
                                                                >
                                                                        <div
                                                                                className="w-4 h-4 border border-black bg-muted flex items-center justify-center"
                                                                                style={{ borderColor: todo.color }}
                                                                        >
                                                                                <svg width="8" height="8" viewBox="0 0 16 16" fill="none" style={{ color: todo.color }}>
                                                                                        <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                                                </svg>
                                                                        </div>
                                                                        <span className="font-sans text-[12px] line-through opacity-40 truncate max-w-[140px]" style={{ color: todo.color }}>
                                                                                {todo.text}
                                                                        </span>
                                                                </div>
                                                        ))}
                                        </div>
                                )}

                                <div
                                        ref={scrollContainerRef}
                                        className="carousel-track flex overflow-x-auto overflow-y-hidden w-full items-center gap-16 md:gap-32 scrollbar-hide relative touch-pan-x snap-x snap-mandatory"
                                        style={
                                                {
                                                        scrollbarWidth: "none",
                                                        msOverflowStyle: "none",
                                                        WebkitOverflowScrolling:
                                                                "touch",
                                                } as React.CSSProperties
                                        }
                                        onWheel={(e) => {
                                                if (e.deltaY !== 0) {
                                                        const scrollContainer = e.currentTarget;
                                                        scrollContainer.scrollLeft += e.deltaY;
                                                        e.preventDefault();
                                                }
                                        }}
                                >
                                        {todos.filter((todo) => !todo.archived).length > 0 ? (
                                                <div className="flex gap-20 md:gap-40 py-12 shrink-0">
                                                        {todos
                                                                .filter((todo) => !todo.archived)
                                                                .map((todo) => (
                                                                        <div
                                                                                key={todo.id}
                                                                                className={cn(
                                                                                        "shrink-0 flex items-center gap-8 group active:cursor-grabbing snap-center transition-all duration-300 ease-out",
                                                                                        draggedId === todo.id && "opacity-0",
                                                                                )}
                                                                        >
                                                                                <button
                                                                                        onClick={(e) => handleButtonClick(e, todo.id)}
                                                                                        className={cn(
                                                                                                "w-20 h-20 md:w-28 md:h-28 border-2 bg-white flex items-center justify-center shrink-0 shadow-ia hover:shadow-ia-hover hover:-translate-y-1 transition-all",
                                                                                                todo.completed ? "rotate-1" : "border-black"
                                                                                        )}
                                                                                        style={{
                                                                                                backgroundColor: todo.completed ? todo.color : undefined,
                                                                                                borderColor: todo.completed ? todo.color : "black",
                                                                                        }}
                                                                                >
                                                                                        {todo.completed && (
                                                                                                <svg
                                                                                                        width="55%"
                                                                                                        height="55%"
                                                                                                        viewBox="0 0 16 16"
                                                                                                        fill="none"
                                                                                                        className="text-white animate-checkmark"
                                                                                                >
                                                                                                        <path
                                                                                                                d="M13 4L6 11L3 8"
                                                                                                                stroke="currentColor"
                                                                                                                strokeWidth="3.5"
                                                                                                                strokeLinecap="round"
                                                                                                                strokeLinejoin="round"
                                                                                                        />
                                                                                                </svg>
                                                                                        )}
                                                                                </button>
                                                                                <div
                                                                                        className="flex items-center cursor-grab"
                                                                                        onMouseDown={(e) => handleDragStart(e, todo.id)}
                                                                                        onTouchStart={(e) => handleDragStart(e, todo.id)}
                                                                                >
                                                                                        <span
                                                                                                className={cn(
                                                                                                        "font-schoolbell text-fluid-display-sm tracking-tight whitespace-nowrap transition-all",
                                                                                                        todo.completed ? "text-muted-foreground opacity-20 line-through" : "text-black"
                                                                                                )}
                                                                                                style={{ color: todo.completed ? undefined : todo.color }}
                                                                                        >
                                                                                                {todo.text}
                                                                                        </span>
                                                                                </div>
                                                                        </div>
                                                                ))}
                                                </div>
                                        ) : null}
                                </div>

                                {/* Minimal Inline Input - iA Writer Focus */}
                                {showInput && (
                                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 fade-in-up w-full px-4 md:w-auto md:px-0 z-50">
                                                <input
                                                        ref={inputRef}
                                                        type="text"
                                                        inputMode="text"
                                                        value={newTodoText}
                                                        onChange={(e) => setNewTodoText(e.target.value)}
                                                        onFocus={() => setInputFocusedViaShortcut(false)}
                                                        onTouchStart={(e) => {
                                                                e.preventDefault();
                                                                inputRef.current?.focus();
                                                        }}
                                                        onKeyDown={(e) => {
                                                                if (e.key === "Enter" && newTodoText.trim()) {
                                                                        addTodo(e as any);
                                                                }
                                                                if (e.key === "Escape") {
                                                                        setNewTodoText("");
                                                                        inputRef.current?.blur();
                                                                        setShowInput(false);
                                                                }
                                                        }}
                                                        onBlur={() => {
                                                                if (!newTodoText.trim()) setShowInput(false);
                                                        }}
                                                        placeholder="type your next task..."
                                                        className={cn(
                                                                "no-tap-highlight w-full max-w-md md:w-[480px] px-8 py-5 text-2xl border-2 bg-white text-black placeholder:text-muted-foreground/30 focus:outline-none focus:border-[#16a34a] transition-all font-schoolbell shadow-ia-hover",
                                                                inputFocusedViaShortcut && "scale-105"
                                                        )}
                                                />
                                        </div>
                                )}

                                {/* Empty State - matches screenshot personality */}
                                {!showInput &&
                                        todos.filter((todo) => !todo.archived)
                                                .length === 0 && (
                                                <div className="flex flex-col items-center justify-center text-center gap-12 w-full max-w-md px-6">
                                                        <h2
                                                                className="font-fontdiner text-fluid-display-sm leading-none text-[#16a34a]"
                                                        >
                                                                no todos yet
                                                        </h2>

                                                        <p className="font-fontdiner text-fluid-lg text-black/80 lowercase tracking-tight text-balance">
                                                                start by adding your first task
                                                        </p>

                                                        <div className="flex items-center justify-center gap-4 text-[13px] font-sans font-bold uppercase tracking-[0.15em] text-muted-foreground">
                                                                <span className="opacity-60">Press</span>
                                                                <kbd className="px-3 py-1.5 bg-white border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] font-mono text-[11px] text-black">
                                                                        {mounted ? formatBinding(shortcuts.addTodo) : "⌘ A"}
                                                                </kbd>
                                                                <span className="opacity-60">to add</span>
                                                        </div>
                                                </div>
                                        )}
                        </div>

                        {/* Scroll affordance — animated chevrons that hint the carousel
                            scrolls both ways. Each side only shows when that direction
                            actually has more to reveal, and nudges to draw the eye. */}
                        {!draggedId && canScrollLeft && (
                                <div className="absolute left-1 md:left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none text-foreground/40">
                                        <svg
                                                className="animate-scroll-hint-left w-7 h-7 md:w-9 md:h-9"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                        >
                                                <path
                                                        d="M15 5L8 12l7 7"
                                                        stroke="currentColor"
                                                        strokeWidth="3"
                                                        strokeLinecap="square"
                                                        strokeLinejoin="miter"
                                                />
                                        </svg>
                                </div>
                        )}
                        {!draggedId && canScrollRight && (
                                <div className="absolute right-1 md:right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none text-foreground/40">
                                        <svg
                                                className="animate-scroll-hint-right w-7 h-7 md:w-9 md:h-9"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                        >
                                                <path
                                                        d="M9 5l7 7-7 7"
                                                        stroke="currentColor"
                                                        strokeWidth="3"
                                                        strokeLinecap="square"
                                                        strokeLinejoin="miter"
                                                />
                                        </svg>
                                </div>
                        )}

                        {draggedId && (
                                <div
                                        className="fixed pointer-events-none z-50 flex items-center gap-4 transition-transform duration-100 ease-out"
                                        style={{
                                                left: dragStartPos.current.x,
                                                top: dragStartPos.current.y,
                                                transform: `translate(${dragPosition.x}px, ${dragPosition.y}px) rotate(${Math.min(
                                                        Math.abs(
                                                                dragPosition.x,
                                                        ) / 12,
                                                        3,
                                                )}deg) scale(1.02)`,
                                        }}
                                >
                                        <div className="w-12 h-12 border-3 border-foreground bg-background shadow-hard-4"></div>
                                        <span className="font-schoolbell text-fluid-display-sm text-foreground whitespace-nowrap">
                                                {
                                                        todos.find(
                                                                (t) =>
                                                                        t.id ===
                                                                        draggedId,
                                                        )?.text
                                                }
                                        </span>
                                </div>
                        )}

                        {draggedId && (
                                <div
                                        className={cn(
                                                "fixed bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 transition-all duration-150 ease-out z-40",
                                                isOverTrash
                                                        ? "scale-130 opacity-100"
                                                        : "scale-100 opacity-70",
                                        )}
                                >
                                        <div
                                                className={cn(
                                                        "relative w-28 h-28 border-4 border-foreground bg-background transition-all duration-150 ease-out flex items-center justify-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]",
                                                        isOverTrash &&
                                                                "bg-destructive border-destructive animate-pulse shadow-[8px_8px_0_0_rgba(0,0,0,1)]",
                                                )}
                                        >
                                                <svg
                                                        width="56"
                                                        height="56"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        className={cn(
                                                                "transition-all duration-150 ease-out",
                                                                isOverTrash
                                                                        ? "text-destructive-foreground scale-110"
                                                                        : "text-foreground",
                                                        )}
                                                >
                                                        <path
                                                                d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
                                                                stroke="currentColor"
                                                                strokeWidth="2.5"
                                                                strokeLinecap="square"
                                                                strokeLinejoin="miter"
                                                        />
                                                </svg>
                                        </div>
                                        {isOverTrash && (
                                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap font-spraypaint text-2xl text-destructive px-4 py-2 bg-background border-4 border-destructive shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all duration-150 ease-out">
                                                        DROP HERE!
                                                </div>
                                        )}
                                </div>
                        )}

                </div>
        );
}
