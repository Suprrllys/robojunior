'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { Application } from 'pixi.js'

export interface PixiCanvasProps {
  width?: number
  height?: number
  /** Called once the PixiJS Application is ready. Use this to add sprites/scenes. */
  onAppReady?: (app: Application) => void
  /** Optional CSS class for the container div */
  className?: string
  /** Background color (hex number, e.g. 0x0a0e1a) */
  backgroundColor?: number
}

/**
 * React wrapper for a PixiJS v8 Application.
 *
 * Usage with Next.js — import dynamically:
 *   const PixiCanvas = dynamic(() => import('@/components/engine/PixiCanvas').then(m => m.PixiCanvas), { ssr: false })
 *
 * Handles:
 * - Creating and destroying the PixiJS app on mount/unmount
 * - Responsive resizing to fill its container
 * - Touch events enabled by default
 */
export function PixiCanvas({
  width,
  height,
  onAppReady,
  className = '',
  backgroundColor = 0x0a0e1a,
}: PixiCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const onAppReadyRef = useRef(onAppReady)
  onAppReadyRef.current = onAppReady

  const initApp = useCallback(async () => {
    if (!containerRef.current || appRef.current) return

    // Dynamic import so PixiJS never runs on the server
    const PIXI = await import('pixi.js')

    const container = containerRef.current
    const initialWidth = width ?? container.clientWidth
    const initialHeight = height ?? container.clientHeight

    const app = new PIXI.Application()
    await app.init({
      width: initialWidth,
      height: initialHeight,
      backgroundColor,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    })

    // Enable touch / pointer events on the canvas
    app.canvas.style.touchAction = 'none'
    app.stage.eventMode = 'static'
    app.stage.hitArea = new PIXI.Rectangle(0, 0, initialWidth, initialHeight)

    container.appendChild(app.canvas as HTMLCanvasElement)
    appRef.current = app

    if (onAppReadyRef.current) {
      onAppReadyRef.current(app)
    }
  }, [width, height, backgroundColor])

  // Initialize
  useEffect(() => {
    initApp()

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true })
        appRef.current = null
      }
    }
  }, [initApp])

  // Responsive resize when no explicit size is set
  useEffect(() => {
    if (width && height) return // Fixed size — no auto-resize

    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || !appRef.current) return

      const { width: w, height: h } = entry.contentRect
      if (w > 0 && h > 0) {
        appRef.current.renderer.resize(w, h)
        appRef.current.stage.hitArea = { x: 0, y: 0, width: w, height: h } as any
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [width, height])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '100%',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    />
  )
}

export default PixiCanvas
