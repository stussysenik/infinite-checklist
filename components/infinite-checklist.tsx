"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Todo {
  id: string
  text: string
  completed: boolean
}

const initialTodos: Todo[] = []

export function InfiniteChecklist() {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [isOverTrash, setIsOverTrash] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTodoText, setNewTodoText] = useState("")
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  const extendedTodos = todos.length > 0 ? [...todos, ...todos, ...todos] : []

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault()
        setShowAddModal(true)
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
      if (e.key === "Escape") {
        setShowAddModal(false)
        setNewTodoText("")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const toggleTodo = (id: string) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)))
  }

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTodoText.trim()) {
      const newTodoItem: Todo = {
        id: Date.now().toString(),
        text: newTodoText.trim(),
        completed: false,
      }
      setTodos([...todos, newTodoItem])
      setNewTodoText("")
      setShowAddModal(false)
    }
  }

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    setDraggedId(id)
    dragStartPos.current = { x: clientX, y: clientY }
    setDragPosition({ x: 0, y: 0 })
  }

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggedId) return

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    const deltaX = clientX - dragStartPos.current.x
    const deltaY = clientY - dragStartPos.current.y

    setDragPosition({ x: deltaX, y: deltaY })

    const centerX = window.innerWidth / 2
    const trashThreshold = 100
    setIsOverTrash(
      clientX > centerX - trashThreshold && clientX < centerX + trashThreshold && clientY > window.innerHeight - 200,
    )
  }

  const handleDragEnd = () => {
    if (!draggedId) return

    if (isOverTrash) {
      setTodos(todos.filter((todo) => todo.id !== draggedId))
    }

    setDraggedId(null)
    setDragPosition({ x: 0, y: 0 })
    setIsOverTrash(false)
  }

  return (
    <div
      className="flex flex-col h-screen bg-background overflow-hidden select-none relative"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
      }}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      <div className="flex flex-col items-center pt-12 md:pt-16 pb-8">
        <h1 className="font-spraypaint text-5xl md:text-7xl text-foreground tracking-tight mb-4">INFINITE TODOS</h1>
        <div className="flex items-center gap-2 px-2">
          <kbd className="font-mono text-xs md:text-sm font-bold bg-foreground text-background px-2 py-1">⌘A</kbd>
          <span className="font-sans text-xs md:text-sm text-muted-foreground">NEW TODO</span>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="hidden md:flex overflow-x-auto flex-1 items-center px-8 gap-6 scrollbar-hide relative"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {extendedTodos.length > 0 ? (
          <div className="flex gap-6 py-8">
            {extendedTodos.map((todo, index) => (
              <div
                key={`${todo.id}-${index}`}
                className={cn(
                  "flex-shrink-0 flex items-center gap-4 group cursor-grab active:cursor-grabbing transition-transform hover:translate-y-[-2px]",
                  draggedId === todo.id && "opacity-0",
                )}
                onMouseDown={(e) => handleDragStart(e, todo.id)}
                onTouchStart={(e) => handleDragStart(e, todo.id)}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={cn(
                    "w-10 h-10 border-4 border-foreground bg-background flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]",
                    todo.completed && "bg-foreground",
                  )}
                >
                  {todo.completed && (
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="text-background">
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
                <span
                  className={cn(
                    "font-spraypaint text-3xl whitespace-nowrap transition-all",
                    todo.completed ? "text-muted-foreground line-through opacity-40" : "text-foreground",
                  )}
                >
                  {todo.text}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <p className="font-spraypaint text-2xl text-muted-foreground">Press ⌘A to add your first todo</p>
          </div>
        )}
      </div>

      <div className="md:hidden overflow-y-auto flex-1 px-4 py-8 relative">
        {todos.length > 0 ? (
          <div className="flex flex-col gap-5">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={cn(
                  "flex items-center gap-4 group cursor-grab active:cursor-grabbing transition-transform active:scale-95",
                  draggedId === todo.id && "opacity-0",
                )}
                onMouseDown={(e) => handleDragStart(e, todo.id)}
                onTouchStart={(e) => handleDragStart(e, todo.id)}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={cn(
                    "w-10 h-10 border-4 border-foreground bg-background flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95 shadow-[2px_2px_0_0_rgba(0,0,0,1)]",
                    todo.completed && "bg-foreground",
                  )}
                >
                  {todo.completed && (
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="text-background">
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
                <span
                  className={cn(
                    "font-spraypaint text-2xl transition-all",
                    todo.completed ? "text-muted-foreground line-through opacity-40" : "text-foreground",
                  )}
                >
                  {todo.text}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="font-spraypaint text-xl text-muted-foreground text-center">Press ⌘A to add your first todo</p>
          </div>
        )}
      </div>

      {draggedId && (
        <div
          className="fixed pointer-events-none z-50 flex items-center gap-4 transition-transform"
          style={{
            left: dragStartPos.current.x,
            top: dragStartPos.current.y,
            transform: `translate(${dragPosition.x}px, ${dragPosition.y}px) rotate(${Math.min(Math.abs(dragPosition.x) / 10, 5)}deg)`,
          }}
        >
          <div className="w-10 h-10 border-4 border-foreground bg-background shadow-[4px_4px_0_0_rgba(0,0,0,1)]"></div>
          <span className="font-spraypaint text-3xl md:text-3xl text-foreground whitespace-nowrap">
            {todos.find((t) => t.id === draggedId)?.text}
          </span>
        </div>
      )}

      {draggedId && (
        <div
          className={cn(
            "fixed bottom-12 md:bottom-16 left-1/2 -translate-x-1/2 transition-all duration-300 ease-out z-40",
            isOverTrash ? "scale-125 opacity-100" : "scale-100 opacity-60",
          )}
        >
          <div
            className={cn(
              "relative w-24 h-24 border-4 border-foreground bg-background transition-all flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)]",
              isOverTrash && "bg-destructive border-destructive animate-pulse shadow-[6px_6px_0_0_rgba(0,0,0,1)]",
            )}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              className={cn(
                "transition-all",
                isOverTrash ? "text-destructive-foreground scale-110" : "text-foreground",
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
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap font-spraypaint text-xl text-destructive px-3 py-1 bg-background border-4 border-destructive shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
              DROP HERE!
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowAddModal(false)
            setNewTodoText("")
          }}
        >
          <div
            className="bg-background border-4 border-foreground p-6 md:p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-spraypaint text-3xl md:text-4xl text-foreground mb-6">NEW TODO</h2>
            <form onSubmit={addTodo} className="flex flex-col gap-4">
              <input
                ref={inputRef}
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="What needs to be done?"
                className="px-4 py-3 border-4 border-foreground bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none font-sans text-lg transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-foreground text-background border-4 border-foreground font-sans font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px]"
                >
                  ADD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewTodoText("")
                  }}
                  className="px-6 py-3 bg-background text-foreground border-4 border-foreground font-sans font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px]"
                >
                  ESC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
