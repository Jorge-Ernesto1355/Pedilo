'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationProgress() {
    const pathname = usePathname()
    const [visible, setVisible] = useState(false)
    const [startedPathname, setStartedPathname] = useState<string | null>(null)
    const [lastPathname, setLastPathname] = useState(pathname)
    const timerRef = useRef<number | null>(null)

    // A finished navigation always hides the bar. Without this, the stale
    // `startedPathname` made it reappear (and never stop) the next time the user
    // arrived at that same route without clicking a link (router.push, back button).
    if (pathname !== lastPathname) {
        setLastPathname(pathname)
        setVisible(false)
        setStartedPathname(null)
    }

    useEffect(() => {
        const start = () => {
            if (timerRef.current !== null) window.clearTimeout(timerRef.current)
            timerRef.current = window.setTimeout(() => {
                timerRef.current = null
                setStartedPathname(pathname)
                setVisible(true)
            }, 180)
        }
        const onClick = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target.closest('a') : null
            if (!target || target.target === '_blank' || target.hasAttribute('download')) return
            const href = target.getAttribute('href')
            if (href?.startsWith('/') && href !== pathname) start()
        }
        document.addEventListener('click', onClick)
        return () => {
            document.removeEventListener('click', onClick)
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current)
                timerRef.current = null
            }
        }
    }, [pathname])

    return visible && startedPathname === pathname ? <div className="fixed inset-x-0 top-0 z-[200] h-1 overflow-hidden bg-[#DCE6FF]" role="progressbar" aria-label="Cargando página"><div className="h-full w-1/3 animate-[loading-progress_1.1s_ease-in-out_infinite] bg-[#2451C5] motion-reduce:animate-none" /></div> : null
}
