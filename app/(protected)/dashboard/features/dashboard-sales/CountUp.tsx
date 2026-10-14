'use client'

import { animate, useInView, useMotionValue } from 'motion/react'
import { useCallback, useEffect, useRef } from 'react'

interface CountUpProps {
    to: number
    from?: number
    direction?: 'up' | 'down'
    delay?: number
    duration?: number
    className?: string
    startWhen?: boolean
    separator?: string
    formatValue?: (value: number) => string
    onStart?: () => void
    onEnd?: () => void
}

export default function CountUp({
    to,
    from = 0,
    direction = 'up',
    delay = 0,
    duration = 0.6,
    className = '',
    startWhen = true,
    separator = '',
    formatValue: formatValueProp,
    onStart,
    onEnd,
}: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const motionValue = useMotionValue(direction === 'down' ? to : from)

    const isInView = useInView(ref, { once: true, margin: '0px' })
    const hasInitialValue = useRef(false)

    const getDecimalPlaces = (num: number): number => {
        const str = num.toString()
        if (str.includes('.')) {
            const decimals = str.split('.')[1]
            if (parseInt(decimals) !== 0) {
                return decimals.length
            }
        }
        return 0
    }

    const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to))

    const formatValue = useCallback(
        (latest: number) => {
            if (formatValueProp) return formatValueProp(latest)

            const hasDecimals = maxDecimals > 0
            const options: Intl.NumberFormatOptions = {
                useGrouping: Boolean(separator),
                minimumFractionDigits: hasDecimals ? maxDecimals : 0,
                maximumFractionDigits: hasDecimals ? maxDecimals : 0,
            }
            const formattedNumber = Intl.NumberFormat('en-US', options).format(latest)

            return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber
        },
        [formatValueProp, maxDecimals, separator],
    )

    useEffect(() => {
        if (ref.current && !hasInitialValue.current) {
            ref.current.textContent = formatValue(direction === 'down' ? to : from)
            hasInitialValue.current = true
        }
    }, [from, to, direction, formatValue])

    useEffect(() => {
        if (isInView && startWhen) {
            onStart?.()
            const controls = animate(motionValue, direction === 'down' ? from : to, {
                delay,
                duration: Math.max(duration, 0.1),
                ease: 'linear',
                onComplete: onEnd,
            })

            return () => controls.stop()
        }
    }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration])

    useEffect(() => {
        const unsubscribe = motionValue.on('change', (latest: number) => {
            if (ref.current) {
                ref.current.textContent = formatValue(latest)
            }
        })

        return () => unsubscribe()
    }, [motionValue, formatValue])

    return <span className={className} ref={ref} />
}
