import {
    Check,
    Coffee,
    Crown,
    Flame,
    Gift,
    Hamburger,
    Heart,
    Leaf,
    Pizza,
    Star,
    type LucideProps,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import type { StampIcon, StampShape } from './loyaltyDesign'

// Formas del sello y lista curada de íconos. Todo es SVG: las formas son propias y los
// íconos vienen de lucide (ya instalado), salvo el taco, dibujado con el mismo trazo.

function starPoints() {
    const points: string[] = []
    for (let index = 0; index < 10; index += 1) {
        const angle = ((-90 + index * 36) * Math.PI) / 180
        const radius = index % 2 === 0 ? 22.5 : 10
        points.push(
            `${(24 + radius * Math.cos(angle)).toFixed(2)},${(25.5 + radius * Math.sin(angle)).toFixed(2)}`,
        )
    }
    return points.join(' ')
}

const STAR_POINTS = starPoints()

/** Contorno de la forma en un viewBox de 48×48. */
export function StampShapePath({ shape, ...props }: { shape: StampShape } & SVGProps<SVGElement>) {
    const common = props as SVGProps<
        SVGCircleElement & SVGRectElement & SVGPathElement & SVGPolygonElement
    >
    switch (shape) {
        case 'rounded-square':
            return <rect x="3.5" y="3.5" width="41" height="41" rx="11" {...common} />
        case 'star':
            return <polygon points={STAR_POINTS} strokeLinejoin="round" {...common} />
        case 'heart':
            return (
                <path
                    d="M24 42s-15.5-9.3-19.2-19.4C2.4 16 6.6 8.5 13.8 8.5c4.4 0 7.6 2.5 10.2 6.1 2.6-3.6 5.8-6.1 10.2-6.1 7.2 0 11.4 7.5 9 14.1C39.5 32.7 24 42 24 42z"
                    strokeLinejoin="round"
                    {...common}
                />
            )
        case 'hexagon':
            return (
                <polygon
                    points="24,3 42.2,13.5 42.2,34.5 24,45 5.8,34.5 5.8,13.5"
                    strokeLinejoin="round"
                    {...common}
                />
            )
        case 'shield':
            return (
                <path
                    d="M24 3.5 41 9.5v13c0 10.6-7.2 18.6-17 22-9.8-3.4-17-11.4-17-22v-13z"
                    strokeLinejoin="round"
                    {...common}
                />
            )
        default:
            return <circle cx="24" cy="24" r="21.5" {...common} />
    }
}

function Taco(props: LucideProps) {
    const { size = 24, color = 'currentColor', strokeWidth = 2, ...rest } = props
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...(rest as SVGProps<SVGSVGElement>)}
        >
            <path d="M2.5 17.5h19" />
            <path d="M2.5 17.5a9.5 9.5 0 0 1 19 0" />
            <path d="M6.5 13.2c1-.9 2-.9 3 0s2 .9 3 0 2-.9 3 0 2 .9 3 0" />
            <path d="M9 9.6h.01M14 9.2h.01" />
        </svg>
    )
}

const ICONS: Record<StampIcon, ComponentType<LucideProps>> = {
    check: Check,
    flame: Flame,
    coffee: Coffee,
    pizza: Pizza,
    burger: Hamburger,
    taco: Taco,
    star: Star,
    heart: Heart,
    crown: Crown,
    leaf: Leaf,
}

export const STAMP_ICON_LABELS: Record<StampIcon, string> = {
    check: 'Palomita',
    flame: 'Flama',
    coffee: 'Café',
    pizza: 'Pizza',
    burger: 'Hamburguesa',
    taco: 'Taco',
    star: 'Estrella',
    heart: 'Corazón',
    crown: 'Corona',
    leaf: 'Hoja',
}

export const STAMP_SHAPE_LABELS: Record<StampShape, string> = {
    circle: 'Círculo',
    'rounded-square': 'Cuadro',
    star: 'Estrella',
    heart: 'Corazón',
    hexagon: 'Hexágono',
    shield: 'Escudo',
}

/** Ícono del sello centrado en el viewBox de 48×48 de la forma. */
export function StampIconGlyph({
    icon,
    color,
    size = 22,
}: {
    icon: StampIcon
    color: string
    size?: number
}) {
    const Icon = ICONS[icon] ?? Check
    const offset = (48 - size) / 2
    return (
        <Icon
            x={offset}
            y={offset + 0.5}
            width={size}
            height={size}
            color={color}
            strokeWidth={2.5}
            aria-hidden="true"
        />
    )
}

export function StampIconPreview({ icon, className }: { icon: StampIcon; className?: string }) {
    const Icon = ICONS[icon] ?? Check
    return <Icon className={className} aria-hidden="true" />
}

export function GiftGlyph({ color, size = 22 }: { color: string; size?: number }) {
    const offset = (48 - size) / 2
    return (
        <Gift
            x={offset}
            y={offset}
            width={size}
            height={size}
            color={color}
            strokeWidth={2.3}
            aria-hidden="true"
        />
    )
}
