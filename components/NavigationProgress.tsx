'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationProgress() {
    const pathname = usePathname()
    const [visible, setVisible] = useState(false)
    useEffect(() => {
        const start = () => {
            const timer = window.setTimeout(() => setVisible(true), 180)
            return timer
        }
        const onClick = (event: MouseEvent) => {
            const target = event.target instanceof Element ? event.target.closest('a') : null
            if (!target || target.target === '_blank' || target.hasAttribute('download')) return
            const href = target.getAttribute('href')
            if (href?.startsWith('/') && href !== pathname) start()
        }
        document.addEventListener('click', onClick)
        return () => document.removeEventListener('click', onClick)
    }, [pathname])
    useEffect(() => {
        const timer = window.setTimeout(() => setVisible(false), 0)
        return () => window.clearTimeout(timer)
    }, [pathname])
    return visible ? <div className="fixed inset-x-0 top-0 z-[200] h-1 overflow-hidden bg-[#DCE6FF]" role="progressbar" aria-label="Cargando página"><div className="h-full w-1/3 animate-[loading-progress_1.1s_ease-in-out_infinite] bg-[#2451C5] motion-reduce:animate-none" /></div> : null
}
