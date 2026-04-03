'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'
import type { HomeEventItem } from './home-feed'

type Props = {
  events: HomeEventItem[]
}

const EMPTY_DESC = '현재 표시할 이벤트를 불러오지 못했습니다.'
const AUTO_ADVANCE_MS = 4500
const SWIPE_THRESHOLD = 18
const AXIS_LOCK_THRESHOLD = 6
const FALLBACK_ASPECT_RATIO_CSS = '1066 / 300'
const FALLBACK_ASPECT_RATIO = 1066 / 300

export default function HomeEventCarousel({ events }: Props) {
  const [activeLoopIndex, setActiveLoopIndex] = useState(events.length > 1 ? 1 : 0)
  const [dragOffset, setDragOffset] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({})
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({})
  const [transitionEnabled, setTransitionEnabled] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const dragDirectionRef = useRef<'x' | 'y' | null>(null)
  const isDraggingRef = useRef(false)
  const isAnimatingRef = useRef(false)

  const loopedEvents = useMemo(
    () => (events.length > 1 ? [events[events.length - 1], ...events, events[0]] : events),
    [events],
  )

  const getDisplayIndex = (loopIndex: number) => {
    if (events.length <= 1) {
      return 0
    }

    return ((loopIndex - 1) % events.length + events.length) % events.length
  }

  const displayIndex = getDisplayIndex(activeLoopIndex)

  const clearAutoAdvance = () => {
    if (autoAdvanceRef.current) {
      clearInterval(autoAdvanceRef.current)
      autoAdvanceRef.current = null
    }
  }

  const clearResumeTimeout = () => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = null
    }
  }

  const pauseAutoAdvance = () => {
    clearAutoAdvance()
    clearResumeTimeout()
  }

  const scheduleAutoAdvance = () => {
    if (events.length <= 1) {
      return
    }

    clearAutoAdvance()
    autoAdvanceRef.current = setInterval(() => {
      if (isDraggingRef.current || isAnimatingRef.current) {
        return
      }

      isAnimatingRef.current = true
      setTransitionEnabled(true)
      setActiveLoopIndex((current) => Math.min(current + 1, events.length + 1))
    }, AUTO_ADVANCE_MS)
  }

  const resumeAutoAdvance = () => {
    if (events.length <= 1) {
      return
    }

    clearResumeTimeout()
    resumeTimeoutRef.current = setTimeout(() => {
      scheduleAutoAdvance()
    }, AUTO_ADVANCE_MS)
  }

  const markImageLoaded = (key: string) => {
    setLoadedImages((current) => {
      if (current[key]) {
        return current
      }

      return {
        ...current,
        [key]: true,
      }
    })
  }

  const registerImageElement = (element: HTMLImageElement | null, key: string) => {
    if (!element) {
      return
    }

    if (element.complete && element.naturalWidth > 0) {
      setImageAspectRatios((current) => {
        if (current[key]) {
          return current
        }

        return {
          ...current,
          [key]: element.naturalWidth / element.naturalHeight,
        }
      })
      markImageLoaded(key)
    }
  }

  const moveSlide = (direction: -1 | 1) => {
    if (events.length <= 1 || isAnimatingRef.current) {
      return
    }

    isAnimatingRef.current = true
    setTransitionEnabled(true)
    setActiveLoopIndex((current) => {
      const nextIndex = current + direction
      return Math.max(0, Math.min(nextIndex, events.length + 1))
    })
  }

  useEffect(() => {
    const container = viewportRef.current
    if (!container) {
      return
    }

    const updateWidth = () => {
      setViewportWidth(container.clientWidth)
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    setActiveLoopIndex(events.length > 1 ? 1 : 0)
    setDragOffset(0)
    setTransitionEnabled(false)
    isAnimatingRef.current = false
    isDraggingRef.current = false
    dragDirectionRef.current = null
    startXRef.current = null
    startYRef.current = null
  }, [events.length])

  useEffect(() => {
    scheduleAutoAdvance()

    return () => {
      clearAutoAdvance()
      clearResumeTimeout()
    }
  }, [events.length])

  useEffect(() => {
    if (!transitionEnabled) {
      const frame = requestAnimationFrame(() => {
        setTransitionEnabled(true)
      })

      return () => cancelAnimationFrame(frame)
    }
  }, [transitionEnabled, activeLoopIndex])

  if (events.length === 0) {
    return (
      <section className="rounded-lg">
        <p className="text-sm text-[#6b7280]">{EMPTY_DESC}</p>
      </section>
    )
  }

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    pauseAutoAdvance()
    isAnimatingRef.current = false
    isDraggingRef.current = true
    dragDirectionRef.current = null
    setTransitionEnabled(false)
    setDragOffset(0)
    startXRef.current = event.touches[0]?.clientX ?? null
    startYRef.current = event.touches[0]?.clientY ?? null
  }

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    const startX = startXRef.current
    const startY = startYRef.current
    const point = event.touches[0]

    if (startX === null || startY === null || !point || viewportWidth === 0) {
      return
    }

    const deltaX = point.clientX - startX
    const deltaY = point.clientY - startY

    if (!dragDirectionRef.current) {
      if (Math.abs(deltaX) < AXIS_LOCK_THRESHOLD && Math.abs(deltaY) < AXIS_LOCK_THRESHOLD) {
        return
      }

      dragDirectionRef.current =
        Math.abs(deltaX) >= Math.abs(deltaY) * 0.85 ? 'x' : 'y'
    }

    if (dragDirectionRef.current !== 'x') {
      return
    }

    if (event.cancelable) {
      event.preventDefault()
    }

    const limitedOffset = Math.max(
      Math.min(deltaX, viewportWidth * 0.28),
      -viewportWidth * 0.28,
    )

    setDragOffset(limitedOffset)
  }

  const resetDragState = () => {
    isDraggingRef.current = false
    dragDirectionRef.current = null
    startXRef.current = null
    startYRef.current = null
    setDragOffset(0)
  }

  const finishSwipe = (deltaX: number, deltaY: number) => {
    const wasHorizontal =
      dragDirectionRef.current === 'x' ||
      (Math.abs(deltaX) >= SWIPE_THRESHOLD && Math.abs(deltaX) >= Math.abs(deltaY) * 0.85)

    resetDragState()

    if (!wasHorizontal || Math.abs(deltaX) < SWIPE_THRESHOLD) {
      resumeAutoAdvance()
      return
    }

    moveSlide(deltaX < 0 ? 1 : -1)
    resumeAutoAdvance()
  }

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const startX = startXRef.current
    const endX = event.changedTouches[0]?.clientX

    if (startX === null || typeof endX !== 'number') {
      resetDragState()
      resumeAutoAdvance()
      return
    }

    const startY = startYRef.current
    finishSwipe(endX - startX, (event.changedTouches[0]?.clientY ?? startY ?? 0) - (startY ?? 0))
  }

  const handleTouchCancel = () => {
    resetDragState()
    resumeAutoAdvance()
  }

  const handleTransitionEnd = () => {
    if (events.length <= 1) {
      isAnimatingRef.current = false
      return
    }

    if (activeLoopIndex === 0) {
      setTransitionEnabled(false)
      setActiveLoopIndex(events.length)
      isAnimatingRef.current = false
      return
    }

    if (activeLoopIndex === events.length + 1) {
      setTransitionEnabled(false)
      setActiveLoopIndex(1)
      isAnimatingRef.current = false
      return
    }

    isAnimatingRef.current = false
  }

  const currentEvent = events[displayIndex]
  const currentImageKey = currentEvent?.imageUrl ?? currentEvent?.href ?? ''
  const currentAspectRatio = imageAspectRatios[currentImageKey] ?? FALLBACK_ASPECT_RATIO
  const viewportHeight = viewportWidth > 0 ? viewportWidth / currentAspectRatio : undefined
  const viewportStyle = viewportHeight
    ? { height: `${viewportHeight}px` }
    : { aspectRatio: FALLBACK_ASPECT_RATIO_CSS }
  const isCurrentImageLoaded = currentImageKey ? Boolean(loadedImages[currentImageKey]) : false
  const translateX = viewportWidth === 0 ? 0 : -activeLoopIndex * viewportWidth + dragOffset

  return (
    <section>
      <div className="relative">
        <span className="pointer-events-none absolute right-3 top-3 z-20 inline-flex rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-white">
          {displayIndex + 1}/{events.length}
        </span>

        <div
          ref={viewportRef}
          className="relative touch-pan-y select-none overflow-hidden rounded-lg"
          style={viewportStyle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onMouseDown={pauseAutoAdvance}
          onMouseUp={resumeAutoAdvance}
          onMouseLeave={resumeAutoAdvance}
        >
          {!isCurrentImageLoaded && (
            <div className="home-image-shimmer pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
          )}

          <div
            className="flex items-start"
            style={{
              transform: `translate3d(${translateX}px, 0, 0)`,
              transition: transitionEnabled ? 'transform 360ms ease' : 'none',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {loopedEvents.map((event, index) => {
              const imageKey = event.imageUrl ?? event.href
              const slideKey = `${event.id}-${index}`
              const isLoaded = Boolean(loadedImages[imageKey])
              const shouldPrioritizeImage = index === activeLoopIndex

              return (
                <a
                  key={slideKey}
                  href={event.href}
                  target="_blank"
                  rel="noreferrer"
                  draggable={false}
                  className="block w-full min-w-full"
                >
                  <div className="relative w-full">
                    {event.imageUrl ? (
                      <img
                        ref={(element) => registerImageElement(element, imageKey)}
                        src={event.imageUrl}
                        alt={event.title}
                        draggable={false}
                        className={`block h-auto w-full transition-opacity duration-200 ${
                          isLoaded ? 'relative z-0 opacity-100' : 'relative z-0 opacity-0'
                        }`}
                        loading={shouldPrioritizeImage ? 'eager' : 'lazy'}
                        fetchPriority={shouldPrioritizeImage ? 'high' : 'auto'}
                        onLoad={(event) => {
                          const element = event.currentTarget
                          setImageAspectRatios((current) => {
                            if (current[imageKey]) {
                              return current
                            }

                            return {
                              ...current,
                              [imageKey]: element.naturalWidth / element.naturalHeight,
                            }
                          })
                          markImageLoaded(imageKey)
                        }}
                        onError={() => markImageLoaded(imageKey)}
                      />
                    ) : (
                      <div className="h-full w-full bg-[#eef2f6]" />
                    )}
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
