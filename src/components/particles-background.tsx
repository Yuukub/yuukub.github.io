"use client"

import React, { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    size: number
}

export const ParticlesBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Mouse position
    const mouse = useRef({ x: 0, y: 0 })
    const isMouseActive = useRef(false)

    // Wait for client-side mount
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
    }, [])

    useEffect(() => {
        // Don't run until mounted on client
        if (!mounted) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let animationFrameId: number
        let particles: Particle[] = []

        // Configuration
        const particleCount = 80
        const connectionDistance = 150
        const mouseRadius = 150

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            initParticles()
        }

        const initParticles = () => {
            particles = []
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2 + 1,
                })
            }
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Use a fallback when theme is not yet resolved
            const isDark = resolvedTheme === "dark"
            const particleColor = isDark ? "rgba(140, 180, 255, 0.6)" : "rgba(80, 120, 255, 0.5)"
            const lineColor = isDark ? "rgba(140, 180, 255, 0.25)" : "rgba(80, 120, 255, 0.2)"

            particles.forEach((p, i) => {
                // Move
                p.x += p.vx
                p.y += p.vy

                // Bounce
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1

                // Mouse interaction (repel)
                if (isMouseActive.current) {
                    const dx = mouse.current.x - p.x
                    const dy = mouse.current.y - p.y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance < mouseRadius) {
                        const force = (mouseRadius - distance) / mouseRadius
                        p.x -= dx * force * 0.02
                        p.y -= dy * force * 0.02
                    }
                }

                // Draw particle
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fillStyle = particleColor
                ctx.fill()

                // Draw connections
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j]
                    const dx = p.x - p2.x
                    const dy = p.y - p2.y
                    const dist = Math.sqrt(dx * dx + dy * dy)

                    if (dist < connectionDistance) {
                        ctx.beginPath()
                        ctx.moveTo(p.x, p.y)
                        ctx.lineTo(p2.x, p2.y)
                        ctx.strokeStyle = lineColor
                        ctx.lineWidth = 1 - dist / connectionDistance
                        ctx.stroke()
                    }
                }
            })

            animationFrameId = requestAnimationFrame(draw)
        }

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current.x = e.clientX
            mouse.current.y = e.clientY
            isMouseActive.current = true
        }

        const handleMouseLeave = () => {
            isMouseActive.current = false
        }

        window.addEventListener("resize", resize)
        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseleave", handleMouseLeave)

        resize()
        draw()

        return () => {
            window.removeEventListener("resize", resize)
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseleave", handleMouseLeave)
            cancelAnimationFrame(animationFrameId)
        }
    }, [mounted, resolvedTheme])

    // Don't render anything on server
    if (!mounted) return null

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{
                background: "transparent",
                zIndex: -1
            }}
        />
    )
}
