'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useQueryClient } from '@tanstack/react-query'
import {
    BarChart3,
    ChevronDown,
    LayoutDashboard,
    Menu,
    Package,
    Percent,
    ShoppingBag,
    Users,
    Volume2,
    VolumeX,
} from 'lucide-react'
import { notify } from '@/src/lib/notifications/notify'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useCurrentBusiness } from '@/app/(protected)/create-menu/features/business-profile/useCurrentBusiness'
import posthog from 'posthog-js'
import { useOrderEventsStore } from '@/store/orderEventsStore'
import { getOrderSoundPreferenceKey } from './features/orders/services/orderEvents'
import { DashboardNavSkeleton } from '@/components/AppLoadingSkeleton'

const links = [
    { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
    { href: '/dashboard/sales', label: 'Ventas', icon: BarChart3 },
    { href: '/dashboard/orders', label: 'Pedidos', icon: ShoppingBag },
    { href: '/dashboard/customers', label: 'Clientes', icon: Users },
    { href: '/dashboard/products', label: 'Productos', icon: Package },
    { href: '/dashboard/discounts', label: 'Descuentos', icon: Percent },
]

function getInitials(name: string) {
    const initials = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')

    return initials || 'N'
}

export function DashboardNav() {
    const pathname = usePathname()
    const router = useRouter()
    const queryClient = useQueryClient()
    const clearUser = useAuthStore((state) => state.clearUser)
    const businessId = useAuthStore((state) => state.user?.businessId)
    const authUser = useAuthStore((state) => state.user)
    const unseenCount = useOrderEventsStore((state) => state.unseenOrderIds.length)
    const soundEnabled = useOrderEventsStore((state) => state.soundEnabled)
    const setSoundEnabled = useOrderEventsStore((state) => state.setSoundEnabled)
    const connectionStatus = useOrderEventsStore((state) => state.connectionStatus)
    const businessQuery = useCurrentBusiness()
    const [accountMenuOpen, setAccountMenuOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
    const accountMenuRef = useRef<HTMLDivElement>(null)
    const accountMenuPortalRef = useRef<HTMLDivElement>(null)
    const accountButtonRef = useRef<HTMLButtonElement>(null)
    const connectionIndicator = connectionStatus === 'connected'
        ? {
              color: 'bg-[#2E9B62]',
              label: 'Conectado',
              description: 'Las nuevas órdenes se actualizan en tiempo real.',
          }
        : connectionStatus === 'error'
          ? {
                color: 'bg-[#C94040]',
                label: 'Sin conexión',
                description: 'No se pudo conectar al tiempo real. Las órdenes no se actualizarán automáticamente.',
            }
          : {
                color: 'bg-[#D49A22]',
                label: 'Conectando',
                description: 'Estamos intentando conectar las actualizaciones en tiempo real.',
            }

    function updateMenuPosition() {
        const button = accountButtonRef.current
        if (!button) return
        const rect = button.getBoundingClientRect()
        setMenuPosition({ top: rect.bottom + 8, left: rect.right })
    }

    useEffect(() => {
        if (!accountMenuOpen) return

        function handlePointerDown(event: MouseEvent) {
            if (
                !accountMenuRef.current?.contains(event.target as Node) &&
                !accountMenuPortalRef.current?.contains(event.target as Node)
            ) {
                setAccountMenuOpen(false)
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') setAccountMenuOpen(false)
        }

        document.addEventListener('mousedown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        window.addEventListener('resize', updateMenuPosition)
        window.addEventListener('scroll', updateMenuPosition, true)
        return () => {
            document.removeEventListener('mousedown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('resize', updateMenuPosition)
            window.removeEventListener('scroll', updateMenuPosition, true)
        }
    }, [accountMenuOpen])

    async function handleLogout() {
        if (isLoggingOut) return

        setIsLoggingOut(true)
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'same-origin',
            })
            posthog.reset()
            queryClient.clear()
            clearUser()
            window.location.replace('/auth/login')
        } catch {
            notify.error({
                title: 'No pudimos cerrar sesión',
                description: 'Revisa tu conexión e inténtalo de nuevo.',
            })
            setIsLoggingOut(false)
        }
    }

    const business =
        businessQuery.isSuccess && !businessQuery.isFetching ? businessQuery.data : null
    const businessName = typeof business?.name === 'string' ? business.name.trim() : ''
    const businessLogoUrl = typeof business?.logoUrl === 'string' ? business.logoUrl.trim() : ''
    const displayedBusinessName = businessName || 'Tu negocio'

    if (!authUser) return <DashboardNavSkeleton />

    return (
        <>
            <header className="relative z-50 overflow-visible border-b border-[#DCE5F3] bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-[85px] max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-10">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2.5 text-4xl font-black tracking-[-.06em] text-[#12234A]"
                    >
                        <Image
                            src="/logoPediloSinfondo.png"
                            alt=""
                            width={34}
                            height={34}
                            className="size-10 object-contain"
                            priority
                        />
                        Pedilo
                    </Link>
                    <nav
                        className="hidden items-center gap-1 md:flex"
                        aria-label="Navegación principal"
                    >
                        {links.map((link) => {
                            const Icon = link.icon
                            const active =
                                link.href === '/dashboard'
                                    ? pathname === link.href
                                    : pathname.startsWith(link.href)
                            const isOrders = link.href === '/dashboard/orders'
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    aria-label={isOrders && unseenCount > 0 ? `Pedidos, ${unseenCount} nuevas órdenes` : undefined}
                                    onMouseEnter={() => router.prefetch(link.href)}
                                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? 'bg-[#EAF0FF] text-[#1E40AF]' : 'text-[#65738A] hover:bg-[#F5F8FC] hover:text-[#1E40AF]'}`}
                                >
                                    <Icon className="size-4" />
                                    {link.label}
                                    {isOrders && unseenCount > 0 && (
                                        <span className="rounded-full bg-[#C94040] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white" aria-label={`${unseenCount} nuevas órdenes`}>
                                            {unseenCount > 99 ? '99+' : unseenCount}
                                            <span className="sr-only"> nuevas órdenes</span>
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>
                    <div className="flex items-center gap-3">
                        <span
                            className="group relative hidden size-8 items-center justify-center rounded-full outline-none lg:inline-flex"
                            tabIndex={0}
                            role="img"
                            aria-label={`Estado de actualizaciones: ${connectionIndicator.label}`}
                        >
                            <span
                                className={`size-2.5 rounded-full ring-4 ring-transparent transition group-hover:ring-[#E8EEF8] group-focus-visible:ring-[#DCE6FF] ${connectionIndicator.color}`}
                                aria-hidden="true"
                            />
                            <span className="pointer-events-none absolute right-0 top-10 z-50 w-64 translate-y-[-4px] rounded-xl border border-[#DCE5F3] bg-white p-3 text-left opacity-0 shadow-[0_12px_30px_rgb(20_48_105_/_0.14)] transition duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:pointer-events-auto group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                                <span className="block text-xs font-bold text-[#12234A]">
                                    {connectionIndicator.label}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-[#65738A]">
                                    {connectionIndicator.description}
                                </span>
                                <span className="mt-2 block text-[10px] font-semibold text-[#8996A9]">
                                    Verde: conectado · Amarillo: conectando · Rojo: sin conexión
                                </span>
                            </span>
                        </span>
                        <Link
                            href="/create-menu"
                            className="hidden items-center gap-1.5 rounded-lg border border-[#C9D7EA] px-3 py-2 text-xs font-semibold text-[#243556] transition hover:border-[#9EB3D8] hover:bg-[#F5F8FC] hover:text-[#1E40AF] sm:inline-flex"
                        >
                            <Menu className="size-3.5" />
                            Editar menú
                        </Link>
                        <div ref={accountMenuRef} className="relative">
                            <button
                                type="button"
                                ref={accountButtonRef}
                                aria-label={`Abrir menú de ${displayedBusinessName}`}
                                aria-expanded={accountMenuOpen}
                                aria-haspopup="menu"
                                onClick={() => {
                                    updateMenuPosition()
                                    setAccountMenuOpen((open) => !open)
                                }}
                                className="flex max-w-[220px] items-center gap-2 rounded-full border border-[#DCE5F3] bg-white py-1.5 pl-1.5 pr-2.5 text-xs font-semibold text-[#12234A] transition hover:border-[#B8C8E1] hover:bg-[#F8FAFD]"
                            >
                                <span
                                    aria-hidden="true"
                                    className={`grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#D5E1FF] text-[#1C3A96] ${businessLogoUrl ? 'bg-cover bg-center bg-no-repeat text-transparent' : ''}`}
                                    style={
                                        businessLogoUrl
                                            ? { backgroundImage: `url(${businessLogoUrl})` }
                                            : undefined
                                    }
                                >
                                    {businessLogoUrl ? null : getInitials(displayedBusinessName)}
                                </span>
                                <span className="block max-w-[130px] truncate sm:max-w-none">
                                    {displayedBusinessName}
                                </span>
                                <ChevronDown
                                    className={`size-3.5 shrink-0 text-[#8996A9] transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {accountMenuOpen &&
                                typeof document !== 'undefined' &&
                                createPortal(
                                    <div
                                        ref={accountMenuPortalRef}
                                        role="menu"
                                        aria-label="Opciones de cuenta"
                                        className="fixed z-[9999] min-w-48 -translate-x-full rounded-xl border border-[#DCE5F3] bg-white p-1.5 shadow-[0_16px_35px_rgb(18_35_74_/_0.14)]"
                                        style={{ top: menuPosition.top, left: menuPosition.left }}
                                    >
                                        <Link
                                            href="/create-menu"
                                            role="menuitem"
                                            onClick={() => setAccountMenuOpen(false)}
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#243556] transition hover:bg-[#F5F8FC] hover:text-[#1E40AF] sm:hidden"
                                        >
                                            <Menu className="size-4" />
                                            Crear menú
                                        </Link>
                                        <button
                                            type="button"
                                            role="menuitemcheckbox"
                                            aria-checked={soundEnabled}
                                            onClick={() => {
                                                const next = !soundEnabled
                                                setSoundEnabled(next)
                                                if (businessId) {
                                                    try {
                                                        window.localStorage.setItem(getOrderSoundPreferenceKey(businessId), String(next))
                                                    } catch {
                                                        // The preference remains active for this session.
                                                    }
                                                }
                                            }}
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#243556] transition hover:bg-[#F5F8FC] hover:text-[#1E40AF]"
                                        >
                                            {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                                            Sonido de nuevas órdenes
                                        </button>
                                        <Link
                                            href="/dashboard/account"
                                            role="menuitem"
                                            onClick={() => setAccountMenuOpen(false)}
                                            className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#243556] transition hover:bg-[#F5F8FC] hover:text-[#1E40AF]"
                                        >
                                            Cuenta
                                        </Link>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => handleLogout()}
                                            disabled={isLoggingOut}
                                            className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#243556] transition hover:bg-[#F5F8FC] hover:text-[#1E40AF] disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                                        </button>
                                    </div>,
                                    document.body,
                                )}
                        </div>
                    </div>
                </div>
            </header>
            <nav
                className="fixed !bottom-0 left-0 right-0 z-[100] border-t border-[#DCE5F3] bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_rgb(18_35_74_/_0.08)] backdrop-blur md:hidden"
                aria-label="Navegación móvil"
            >
                <div className="mx-auto grid h-[64px] max-w-md grid-cols-5 items-stretch">
                    {links.map((link) => {
                        const Icon = link.icon
                        const active =
                            link.href === '/dashboard'
                                ? pathname === link.href
                                : pathname.startsWith(link.href)
                        const isOrders = link.href === '/dashboard/orders'

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-label={isOrders && unseenCount > 0 ? `Pedidos, ${unseenCount} nuevas órdenes` : undefined}
                                onMouseEnter={() => router.prefetch(link.href)}
                                aria-current={active ? 'page' : undefined}
                                className={`flex min-w-0 flex-col items-center justify-center rounded-lg text-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-2 ${isOrders ? '-translate-y-1 gap-0.5' : 'gap-0.5'} ${active ? 'text-[#1E40AF]' : 'text-[#8996A9] hover:text-[#1E40AF]'}`}
                            >
                                <span
                                    className={`relative grid place-items-center transition-colors ${isOrders ? `size-10 rounded-xl shadow-[0_6px_14px_rgb(30_64_175_/_0.22)] ${active ? 'bg-[#1E40AF] text-white' : 'bg-[#EAF0FF] text-[#2451C5]'}` : `size-7 rounded-lg ${active ? 'bg-[#EAF0FF]' : ''}`}`}
                                >
                                    <Icon
                                        className={isOrders ? 'size-5' : 'size-4'}
                                        strokeWidth={active || isOrders ? 2.4 : 2}
                                    />
                                    {isOrders && unseenCount > 0 && (
                                        <span className="absolute -right-1.5 -top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#C94040] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white" aria-label={`${unseenCount} nuevas órdenes`}>
                                            {unseenCount > 99 ? '99+' : unseenCount}
                                        </span>
                                    )}
                                </span>
                                <span className={`truncate px-0.5 ${isOrders ? 'font-bold' : ''}`}>
                                    {link.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}
