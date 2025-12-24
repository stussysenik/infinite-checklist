"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Todo {
        id: string;
        text: string;
        completed: boolean;
        archived?: boolean;
        color?: string;
}

const ARCHIVE_DELAY = 300; // 300ms for super instant feel

export function InfiniteChecklist() {
        const [todos, setTodos] = useState<Todo[]>([]);
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
        const [showPageIndicator, setShowPageIndicator] = useState(false);
        const [accentColor, setAccentColor] = useState<string>("#000000");
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

        useEffect(() => {
                const handleKeyDown = (e: KeyboardEvent) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "a") {
                                e.preventDefault();
                                setShowInput(true);
                                setInputFocusedViaShortcut(true);
                                inputRef.current?.focus();
                                setTimeout(
                                        () => setInputFocusedViaShortcut(false),
                                        150,
                                );
                        }
                        if ((e.metaKey || e.ctrlKey) && e.key === "r") {
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
                                setShowInput(true);
                                setInputFocusedViaShortcut(true);
                                setTimeout(() => {
                                        inputRef.current?.focus();
                                }, 50);
                                setTimeout(
                                        () => setInputFocusedViaShortcut(false),
                                        150,
                                );
                        }

                        lastTapTimeRef.current = currentTime;
                };

                const handleClick = () => {
                        const currentTime = Date.now();
                        const timeDiff = currentTime - lastClickTimeRef.current;

                        // Check if this is a double-click
                        if (timeDiff < DOUBLE_TAP_DELAY && timeDiff > 0) {
                                // Double-click detected
                                setShowInput(true);
                                setInputFocusedViaShortcut(true);
                                setTimeout(() => {
                                        inputRef.current?.focus();
                                }, 50);
                                setTimeout(
                                        () => setInputFocusedViaShortcut(false),
                                        150,
                                );
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

        // Load todos from localStorage on mount
        useEffect(() => {
                const savedTodos = localStorage.getItem("infinite-todos");
                if (savedTodos) {
                        try {
                                const loadedTodos = JSON.parse(savedTodos);
                                // Validate that loadedTodos is an array with valid todo items
                                if (
                                        Array.isArray(loadedTodos) &&
                                        loadedTodos.every(
                                                (todo) =>
                                                        todo &&
                                                        typeof todo.id ===
                                                                "string" &&
                                                        typeof todo.text ===
                                                                "string" &&
                                                        typeof todo.completed ===
                                                                "boolean",
                                        )
                                ) {
                                        // Clear archived todos on mount to ensure archive starts empty
                                        const todosWithoutArchived =
                                                loadedTodos.map(
                                                        (todo: Todo) => ({
                                                                ...todo,
                                                                archived: false,
                                                        }),
                                                );
                                        setTodos(todosWithoutArchived);
                                } else {
                                        // Invalid data, start with empty array
                                        setTodos([]);
                                }
                        } catch (e) {
                                console.error(
                                        "Failed to load todos from localStorage",
                                        e,
                                );
                                // On error, start with empty array
                                setTodos([]);
                        }
                }
        }, []);

        // Save todos to localStorage whenever they change
        useEffect(() => {
                localStorage.setItem("infinite-todos", JSON.stringify(todos));
        }, [todos]);

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

        // Check if scrolling is needed to show page indicator
        useEffect(() => {
                const checkScroll = () => {
                        if (scrollContainerRef.current) {
                                const isScrollable =
                                        scrollContainerRef.current.scrollWidth >
                                        scrollContainerRef.current.clientWidth;
                                setShowPageIndicator(isScrollable);
                        }
                };

                checkScroll();
                window.addEventListener("resize", checkScroll);
                return () => window.removeEventListener("resize", checkScroll);
        }, [todos]);

        const toggleTodo = (id: string) => {
                setTodos(
                        todos.map((todo) => {
                                if (todo.id === id) {
                                        const newCompleted = !todo.completed;

                                        // Clear existing timeout if any
                                        if (archiveTimeouts.current[todo.id]) {
                                                clearTimeout(
                                                        archiveTimeouts.current[
                                                                todo.id
                                                        ],
                                                );
                                        }

                                        // If completing, set timeout to archive after 5 seconds
                                        if (newCompleted) {
                                                archiveTimeouts.current[
                                                        todo.id
                                                ] = setTimeout(() => {
                                                        setTodos((prevTodos) =>
                                                                prevTodos.map(
                                                                        (t) =>
                                                                                t.id ===
                                                                                id
                                                                                        ? {
                                                                                                  ...t,
                                                                                                  archived: true,
                                                                                          }
                                                                                        : t,
                                                                ),
                                                        );
                                                }, ARCHIVE_DELAY);
                                        }

                                        return {
                                                ...todo,
                                                completed: newCompleted,
                                                archived: false, // Reset archived status if unchecking
                                        };
                                }
                                return todo;
                        }),
                );
        };

        const addTodo = (e: React.FormEvent) => {
                e.preventDefault();
                if (newTodoText.trim()) {
                        const newTodoItem: Todo = {
                                id: Date.now().toString(),
                                text: newTodoText.trim(),
                                completed: false,
                                color: generateRandomColor(),
                        };
                        setTodos([...todos, newTodoItem]);
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
                        setTodos(todos.filter((todo) => todo.id !== draggedId));

                        // Clear timeout if any
                        if (archiveTimeouts.current[draggedId]) {
                                clearTimeout(
                                        archiveTimeouts.current[draggedId],
                                );
                                delete archiveTimeouts.current[draggedId];
                        }
                } else if (isDraggingFromArchive) {
                        // Dropped outside trash while dragging from archive - restore to main list
                        setTodos(
                                todos.map((todo) =>
                                        todo.id === draggedId
                                                ? {
                                                          ...todo,
                                                          archived: false,
                                                  }
                                                : todo,
                                ),
                        );
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
                        className="flex flex-col h-screen bg-background overflow-hidden select-none relative touch-optimized no-tap-highlight"
                        style={
                                {
                                        backgroundImage: `
          linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
        `,
                                        backgroundSize: "16px 16px",
                                } as React.CSSProperties
                        }
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        onTouchMove={handleDragMove}
                        onTouchEnd={handleDragEnd}
                >
                        <div className="flex flex-col items-center justify-center h-auto py-12 md:py-16 relative w-full">
                                <h1 className="font-spraypaint text-5xl md:text-7xl text-foreground tracking-tight text-center leading-none">
                                        checklisting... ✅
                                </h1>

                                {/* Archive - Upper Right Corner */}
                                {todos.some((t) => t.archived) && (
                                        <div className="absolute top-4 right-4 md:top-6 md:right-6 flex flex-col gap-3 max-w-[280px] md:max-w-[360px]">
                                                <div className="font-spraypaint text-xs md:text-sm text-muted-foreground mb-2 border-b-2 border-border pb-2">
                                                        ARCHIVED
                                                </div>
                                                {todos
                                                        .filter(
                                                                (t) =>
                                                                        t.archived,
                                                        )
                                                        .map((todo) => (
                                                                <div
                                                                        key={
                                                                                todo.id
                                                                        }
                                                                        className={cn(
                                                                                "touch-optimized no-tap-highlight flex items-center gap-2 md:gap-3 cursor-grab active:cursor-grabbing transition-all duration-200 ease-out hover:scale-102 group bg-background border-2 border-border p-2",
                                                                                draggedId ===
                                                                                        todo.id &&
                                                                                        "opacity-0",
                                                                        )}
                                                                        onMouseDown={(
                                                                                e,
                                                                        ) =>
                                                                                handleDragStart(
                                                                                        e,
                                                                                        todo.id,
                                                                                        true,
                                                                                )
                                                                        }
                                                                        onTouchStart={(
                                                                                e,
                                                                        ) =>
                                                                                handleDragStart(
                                                                                        e,
                                                                                        todo.id,
                                                                                        true,
                                                                                )
                                                                        }
                                                                >
                                                                        <div
                                                                                className="w-5 h-5 md:w-6 md:h-6 border-2 border-border bg-muted flex items-center justify-center flex-shrink-0"
                                                                                style={{
                                                                                        borderColor:
                                                                                                todo.color,
                                                                                }}
                                                                        >
                                                                                <svg
                                                                                        width="10"
                                                                                        height="10"
                                                                                        viewBox="0 0 16 16"
                                                                                        fill="none"
                                                                                        style={{
                                                                                                color: todo.color,
                                                                                        }}
                                                                                >
                                                                                        <path
                                                                                                d="M13 4L6 11L3 8"
                                                                                                stroke="currentColor"
                                                                                                strokeWidth="3"
                                                                                                strokeLinecap="square"
                                                                                                strokeLinejoin="miter"
                                                                                        />
                                                                                </svg>
                                                                        </div>
                                                                        <span
                                                                                className="font-sans text-xs md:text-sm line-through truncate"
                                                                                style={{
                                                                                        color: todo.color,
                                                                                        opacity: 0.4,
                                                                                }}
                                                                        >
                                                                                {
                                                                                        todo.text
                                                                                }
                                                                        </span>
                                                                </div>
                                                        ))}
                                        </div>
                                )}
                        </div>

                        <div
                                ref={scrollContainerRef}
                                className="flex overflow-x-auto overflow-y-hidden flex-1 items-center px-4 md:px-8 gap-6 md:gap-8 scrollbar-hide relative touch-pan-x snap-x snap-mandatory"
                                style={
                                        {
                                                scrollbarWidth: "none",
                                                msOverflowStyle: "none",
                                                WebkitOverflowScrolling:
                                                        "touch",
                                        } as React.CSSProperties
                                }
                                onWheel={(e) => {
                                        // Enable horizontal scroll with scrollwheel on desktop
                                        if (e.deltaY !== 0) {
                                                const scrollContainer =
                                                        e.currentTarget;
                                                scrollContainer.scrollLeft +=
                                                        e.deltaY;
                                                e.preventDefault();
                                        }
                                }}
                        >
                                {todos.filter((todo) => !todo.archived).length >
                                0 ? (
                                        <div className="flex gap-6 md:gap-12 py-6 md:py-8 mx-auto">
                                                {todos
                                                        .filter(
                                                                (todo) =>
                                                                        !todo.archived,
                                                        )
                                                        .map((todo) => (
                                                                <div
                                                                        key={
                                                                                todo.id
                                                                        }
                                                                        className={cn(
                                                                                "shrink-0 flex items-center gap-3 md:gap-4 group active:cursor-grabbing snap-center transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-102",
                                                                                draggedId ===
                                                                                        todo.id &&
                                                                                        "opacity-0",
                                                                        )}
                                                                >
                                                                        <button
                                                                                onMouseDown={(
                                                                                        e,
                                                                                ) => {
                                                                                        hasDragged.current = false;
                                                                                }}
                                                                                onClick={(
                                                                                        e,
                                                                                ) =>
                                                                                        handleButtonClick(
                                                                                                e,
                                                                                                todo.id,
                                                                                        )
                                                                                }
                                                                                className={cn(
                                                                                        "touch-optimized no-tap-highlight w-9 h-9 md:w-12 md:h-12 border-2 md:border-3 bg-background flex items-center justify-center shrink-0 transition-all duration-200 ease-out hover:scale-105 active:scale-95 shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]",
                                                                                        todo.completed
                                                                                                ? `scale-105 rotate-1`
                                                                                                : "border-foreground",
                                                                                )}
                                                                                style={{
                                                                                        backgroundColor:
                                                                                                todo.completed
                                                                                                        ? todo.color
                                                                                                        : undefined,
                                                                                        borderColor:
                                                                                                todo.completed
                                                                                                        ? todo.color
                                                                                                        : undefined,
                                                                                }}
                                                                        >
                                                                                {todo.completed && (
                                                                                        <svg
                                                                                                width="24"
                                                                                                height="24"
                                                                                                viewBox="0 0 16 16"
                                                                                                fill="none"
                                                                                                className="text-white animate-checkmark"
                                                                                        >
                                                                                                <path
                                                                                                        d="M13 4L6 11L3 8"
                                                                                                        stroke="currentColor"
                                                                                                        strokeWidth="3"
                                                                                                        strokeLinecap="square"
                                                                                                        strokeLinejoin="miter"
                                                                                                />
                                                                                        </svg>
                                                                                )}
                                                                        </button>
                                                                        <div
                                                                                className="flex items-center cursor-grab touch-optimized"
                                                                                onMouseDown={(
                                                                                        e,
                                                                                ) =>
                                                                                        handleDragStart(
                                                                                                e,
                                                                                                todo.id,
                                                                                                false,
                                                                                        )
                                                                                }
                                                                                onTouchStart={(
                                                                                        e,
                                                                                ) =>
                                                                                        handleDragStart(
                                                                                                e,
                                                                                                todo.id,
                                                                                                false,
                                                                                        )
                                                                                }
                                                                        >
                                                                                <span
                                                                                        className={cn(
                                                                                                "font-spraypaint text-3xl md:text-4xl lg:text-5xl whitespace-nowrap transition-all duration-200 ease-out",
                                                                                                todo.completed
                                                                                                        ? "text-muted-foreground opacity-40 scale-95 translate-x-1 line-through"
                                                                                                        : "scale-100 translate-x-0",
                                                                                        )}
                                                                                        style={{
                                                                                                color: todo.completed
                                                                                                        ? undefined
                                                                                                        : todo.color,
                                                                                        }}
                                                                                >
                                                                                        {
                                                                                                todo.text
                                                                                        }
                                                                                </span>
                                                                        </div>
                                                                </div>
                                                        ))}
                                        </div>
                                ) : null}

                                {/* Page Indicator - Bottom Left */}
                                {showPageIndicator &&
                                        todos.filter((todo) => !todo.archived)
                                                .length > 0 && (
                                                <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 flex items-center gap-2">
                                                        <div
                                                                className="w-2 h-2 md:w-2 md:h-2 rounded-full animate-pulse"
                                                                style={{
                                                                        backgroundColor:
                                                                                todos.find(
                                                                                        (
                                                                                                t,
                                                                                        ) =>
                                                                                                !t.archived,
                                                                                )
                                                                                        ?.color,
                                                                }}
                                                        ></div>
                                                        <span
                                                                className="font-sans text-xs md:text-sm font-medium tracking-wide"
                                                                style={{
                                                                        color: todos.find(
                                                                                (
                                                                                        t,
                                                                                ) =>
                                                                                        !t.archived,
                                                                        )
                                                                                ?.color,
                                                                        opacity: 0.7,
                                                                }}
                                                        >
                                                                SCROLL FOR MORE
                                                        </span>
                                                </div>
                                        )}

                                {/* Minimal Inline Input - Appears after todo list */}
                                {showInput && (
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200 w-full px-4 md:w-auto md:px-0 z-50">
                                                <input
                                                        ref={inputRef}
                                                        type="text"
                                                        inputMode="text"
                                                        value={newTodoText}
                                                        onChange={(e) =>
                                                                setNewTodoText(
                                                                        e.target
                                                                                .value,
                                                                )
                                                        }
                                                        onFocus={() => {
                                                                setInputFocusedViaShortcut(
                                                                        false,
                                                                );
                                                        }}
                                                        onTouchStart={(e) => {
                                                                // Prevent zoom on iOS when focusing input
                                                                e.preventDefault();
                                                                inputRef.current?.focus();
                                                        }}
                                                        onKeyDown={(e) => {
                                                                if (
                                                                        e.key ===
                                                                        "Enter"
                                                                ) {
                                                                        if (
                                                                                newTodoText.trim()
                                                                        ) {
                                                                                addTodo(
                                                                                        e as any,
                                                                                );
                                                                        }
                                                                }
                                                                if (
                                                                        e.key ===
                                                                        "Escape"
                                                                ) {
                                                                        setNewTodoText(
                                                                                "",
                                                                        );
                                                                        inputRef.current?.blur();
                                                                        setShowInput(
                                                                                false,
                                                                        );
                                                                }
                                                        }}
                                                        onBlur={() => {
                                                                // Hide input immediately if not typing
                                                                if (
                                                                        !newTodoText.trim()
                                                                ) {
                                                                        setShowInput(
                                                                                false,
                                                                        );
                                                                }
                                                        }}
                                                        placeholder="+ Add new todo..."
                                                        className={cn(
                                                                "no-tap-highlight w-full max-w-xs md:w-72 md:max-w-96 px-4 py-3 md:py-3 text-base md:text-sm border-2 md:border-2 bg-background/70 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-background focus:border-foreground transition-all duration-200 ease-out font-sans touch-manipulation",
                                                                inputFocusedViaShortcut
                                                                        ? "border-foreground scale-105 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                                                                        : "border-border",
                                                        )}
                                                />
                                        </div>
                                )}

                                {/* Empty State - Shows when no todos exist */}
                                {!showInput &&
                                        todos.filter((todo) => !todo.archived)
                                                .length === 0 && (
                                                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                                        <div className="mb-8 text-5xl md:text-7xl opacity-20">
                                                                📝
                                                        </div>
                                                        <h2 className="font-spraypaint text-2xl md:text-3xl text-foreground mb-3">
                                                                No todos yet!
                                                        </h2>
                                                        <div className="bg-muted/40 rounded-lg p-5 md:p-6 backdrop-blur-sm border-2 border-border">
                                                                <p className="font-sans text-sm md:text-base text-foreground font-medium mb-4">
                                                                        Start by
                                                                        adding
                                                                        your
                                                                        first
                                                                        task
                                                                </p>
                                                                <div className="border-t border-border/50 pt-4">
                                                                        <div className="flex flex-col gap-1 md:hidden">
                                                                                <p className="font-sans text-xs text-muted-foreground font-semibold tracking-wide">
                                                                                        📱
                                                                                        Double-tap
                                                                                        anywhere
                                                                                        to
                                                                                        add
                                                                                </p>
                                                                        </div>
                                                                        <div className="hidden md:block">
                                                                                <p className="font-sans text-sm text-muted-foreground font-semibold tracking-wide">
                                                                                        ⌨️
                                                                                        Press{" "}
                                                                                        <kbd className="px-2 py-1 bg-background border-2 border-border rounded text-xs font-normal">
                                                                                                Cmd
                                                                                        </kbd>{" "}
                                                                                        +{" "}
                                                                                        <kbd className="px-2 py-1 bg-background border-2 border-border rounded text-xs font-normal">
                                                                                                A
                                                                                        </kbd>{" "}
                                                                                        to
                                                                                        add
                                                                                </p>
                                                                        </div>
                                                                </div>
                                                        </div>
                                                </div>
                                        )}
                        </div>

                        {draggedId && (
                                <div
                                        className="fixed pointer-events-none z-50 flex items-center gap-4 md:gap-5 transition-transform duration-100 ease-out"
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
                                        <div className="w-10 h-10 md:w-12 md:h-12 border-3 md:border-4 border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)]"></div>
                                        <span className="font-spraypaint text-3xl md:text-4xl text-foreground whitespace-nowrap">
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

                        <style jsx>{`
                                .scrollbar-hide::-webkit-scrollbar {
                                        display: none;
                                }

                                @keyframes checkmark {
                                        0% {
                                                transform: scale(0)
                                                        rotate(-45deg);
                                                opacity: 0;
                                        }
                                        50% {
                                                transform: scale(1.2)
                                                        rotate(10deg);
                                        }
                                        100% {
                                                transform: scale(1) rotate(0deg);
                                                opacity: 1;
                                        }
                                }

                                .animate-checkmark {
                                        animation: checkmark 0.2s
                                                cubic-bezier(
                                                        0.175,
                                                        0.885,
                                                        0.32,
                                                        1.275
                                                )
                                                forwards;
                                }
                        `}</style>
                </div>
        );
}
