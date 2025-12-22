"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

// Only show progress bar if navigation takes longer than this (ms)
const SHOW_DELAY = 150

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const showTimeoutRef = useRef<NodeJS.Timeout>()
  const progressIntervalRef = useRef<NodeJS.Timeout>()
  const isNavigatingRef = useRef(false)

  useEffect(() => {
    // Route change complete - hide immediately
    isNavigatingRef.current = false
    setIsVisible(false)
    setProgress(0)

    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
  }, [pathname, searchParams])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest("a")

      if (!link) return

      const href = link.getAttribute("href")
      if (!href) return

      // Skip external links, hash links, and same-page links
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        link.target === "_blank"
      ) {
        return
      }

      // Skip if it's the current page
      if (href === pathname) return

      // Mark as navigating
      isNavigatingRef.current = true

      // Only show progress bar after delay (avoids flicker on fast navigations)
      showTimeoutRef.current = setTimeout(() => {
        if (!isNavigatingRef.current) return // Navigation already completed

        setIsVisible(true)
        setProgress(20)

        // Animate progress
        progressIntervalRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
              }
              return prev
            }
            const increment = Math.max(1, (90 - prev) / 10)
            return Math.min(90, prev + increment)
          })
        }, 100)
      }, SHOW_DELAY)
    }

    document.addEventListener("click", handleClick)

    return () => {
      document.removeEventListener("click", handleClick)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
      }
    }
  }, [pathname])

  if (!isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-primary/20">
      <div
        className="h-full bg-primary transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
