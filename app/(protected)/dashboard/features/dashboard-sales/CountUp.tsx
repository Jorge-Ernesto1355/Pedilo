'use client'

import { animate, useInView, useMotionValue } from 'motion/react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

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
    // true en el servidor y durante la hidratación; false en renders solo de cliente.
    const isServerOrHydrating = useSyncExternalStore(
        noopSubscribe,
        () => false,
        () => true,
    )

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

    // Cuando el valor llega en el HTML del servidor, se pinta el número final desde el
    // primer byte (sin JS) y no se anima desde 0 al hidratar. Constante tras el montaje
    // para que React no compita con las escrituras de la animación sobre textContent.
    const [serverText] = useState(() =>
        isServerOrHydrating ? formatValue(direction === 'down' ? from : to) : null,
    )
    const skipFirstAnimation = useRef(serverText !== null)

    useEffect(() => {
        if (ref.current && !hasInitialValue.current) {
            hasInitialValue.current = true
            if (skipFirstAnimation.current) {
                motionValue.jump(direction === 'down' ? from : to)
                return
            }
            ref.current.textContent = formatValue(direction === 'down' ? to : from)
        }
    }, [from, to, direction, formatValue, motionValue])

    useEffect(() => {
        if (isInView && startWhen) {
            if (skipFirstAnimation.current) {
                // El valor ya es visible desde el servidor; los cambios siguientes sí animan.
                skipFirstAnimation.current = false
                return
            }
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

    // A KPI can become available after an error retry while the card is outside
    // the viewport. In that case useInView never starts the animation, leaving
    // the initial value rendered forever instead of the actual metric.
    useEffect(() => {
        if (!isInView && ref.current && startWhen) {
            ref.current.textContent = formatValue(direction === 'down' ? from : to)
        }
    }, [isInView, startWhen, direction, from, to, formatValue])

    useEffect(() => {
        const unsubscribe = motionValue.on('change', (latest: number) => {
            if (ref.current) {
                ref.current.textContent = formatValue(latest)
            }
        })

        return () => unsubscribe()
    }, [motionValue, formatValue])

    return (
        <span className={className} ref={ref}>
            {serverText}
        </span>
    )
}
