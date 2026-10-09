'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import {
    BarChart3,
    ChevronDown,
    LayoutDashboard,
    Menu,
    Package,
    ShoppingBag,
    Users,
} from 'lucide-react'
import { notify } from '@/src/lib/notifications/notify'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useCurrentBusiness } from '@/app/(protected)/create-menu/features/business-profile/useCurrentBusiness'

const links = [
    { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
    { href: '/dashboard/sales', label: 'Ventas', icon: BarChart3 },
    { href: '/dashboard/orders', label: 'Pedidos', icon: ShoppingBag },
    { href: '/dashboard/customers', label: 'Clientes', icon: Users },
    { href: '/dashboard/products', label: 'Productos', icon: Package },
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
    const businessQuery = useCurrentBusiness()
    const [accountMenuOpen, setAccountMenuOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
    const accountMenuRef = useRef<HTMLDivElement>(null)
    const accountMenuPortalRef = useRef<HTMLDivElement>(null)
    const accountButtonRef = useRef<HTMLButtonElement>(null)

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

    return (
        <>
            <header className="relative z-50 overflow-visible border-b border-[#DCE5F3] bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-10">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2.5 text-lg font-black tracking-[-.04em] text-[#12234A]"
                    >
                        <span className="grid size-8 place-items-center rounded-[10px] bg-[#1E40AF] text-sm text-white shadow-[0_7px_16px_rgb(30_64_175_/_0.2)]">
                            P
                        </span>
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
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onMouseEnter={() => router.prefetch(link.href)}
                                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? 'bg-[#EAF0FF] text-[#1E40AF]' : 'text-[#65738A] hover:bg-[#F5F8FC] hover:text-[#1E40AF]'}`}
                                >
                                    <Icon className="size-4" />
                                    {link.label}
                                </Link>
                            )
                        })}
                    </nav>
                    <div className="flex items-center gap-3">
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
                className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DCE5F3] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(18_35_74_/_0.08)] backdrop-blur md:hidden"
                aria-label="Navegación móvil"
            >
                <div className="mx-auto grid h-[76px] max-w-md grid-cols-5 items-stretch">
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
                                onMouseEnter={() => router.prefetch(link.href)}
                                aria-current={active ? 'page' : undefined}
                                className={`flex min-w-0 flex-col items-center justify-center rounded-lg text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF] focus-visible:ring-offset-2 ${isOrders ? '-translate-y-2 gap-1' : 'gap-1'} ${active ? 'text-[#1E40AF]' : 'text-[#8996A9] hover:text-[#1E40AF]'}`}
                            >
                                <span
                                    className={`grid place-items-center transition-colors ${isOrders ? `size-12 rounded-2xl shadow-[0_8px_18px_rgb(30_64_175_/_0.28)] ${active ? 'bg-[#1E40AF] text-white' : 'bg-[#EAF0FF] text-[#2451C5]'}` : `size-8 rounded-xl ${active ? 'bg-[#EAF0FF]' : ''}`}`}
                                >
                                    <Icon
                                        className={isOrders ? 'size-[22px]' : 'size-[18px]'}
                                        strokeWidth={active || isOrders ? 2.4 : 2}
                                    />
                                </span>
                                <span className={`truncate px-1 ${isOrders ? 'font-bold' : ''}`}>
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
