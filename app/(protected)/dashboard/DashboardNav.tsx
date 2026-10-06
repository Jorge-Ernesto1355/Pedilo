'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
    BarChart3,
    ChevronDown,
    LayoutDashboard,
    Menu,
    Package,
    ShoppingBag,
    Users,
} from 'lucide-react'
import { sileo } from 'sileo'
import { usePathname, useRouter } from 'next/navigation'
import { apiClient } from '@/src/lib/api/client'
import { useAuthStore } from '@/store/authStore'

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

type BusinessMineResponse = {
    business?: { name?: unknown; logoUrl?: unknown } | null
}

export function DashboardNav() {
    const pathname = usePathname()
    const router = useRouter()
    const clearUser = useAuthStore((state) => state.clearUser)
    const businessQuery = useQuery({
        queryKey: ['business', 'mine'],
        queryFn: async () => {
            const { data } = await apiClient.get<BusinessMineResponse>('/businesses/mine', {
                withCredentials: true,
            })
            return data.business ?? null
        },
        staleTime: 10 * 60 * 1000,
    })
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
            if (!accountMenuRef.current?.contains(event.target as Node) && !accountMenuPortalRef.current?.contains(event.target as Node)) {
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
            await apiClient.post('/auth/logout', undefined, { withCredentials: true })
            clearUser()
            router.replace('/auth/login')
        } catch {
            sileo.error({ title: 'No pudimos cerrar sesión', description: 'Revisa tu conexión e inténtalo de nuevo.' })
            setIsLoggingOut(false)
        }
    }

    const business = businessQuery.data
    const businessName = typeof business?.name === 'string' ? business.name.trim() : ''
    const businessLogoUrl = typeof business?.logoUrl === 'string' ? business.logoUrl.trim() : ''
    const displayedBusinessName = businessName || 'Tu negocio'

    return (
        <header className="relative z-50 overflow-visible border-b border-[#DCE5F3] bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
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
                            <span className="hidden truncate sm:block">
                                {displayedBusinessName}
                            </span>
                            <ChevronDown
                                className={`size-3.5 shrink-0 text-[#8996A9] transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {accountMenuOpen && typeof document !== 'undefined' && createPortal(
                            <div
                                ref={accountMenuPortalRef}
                                role="menu"
                                aria-label="Opciones de cuenta"
                                className="fixed z-[9999] min-w-48 -translate-x-full rounded-xl border border-[#DCE5F3] bg-white p-1.5 shadow-[0_16px_35px_rgb(18_35_74_/_0.14)]"
                                style={{ top: menuPosition.top, left: menuPosition.left }}
                            >
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
            <nav
                className="flex gap-1 overflow-x-auto px-5 pb-3 md:hidden"
                aria-label="Navegación móvil"
            >
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        onMouseEnter={() => router.prefetch(link.href)}
                        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold ${pathname === link.href ? 'bg-[#EAF0FF] text-[#1E40AF]' : 'text-[#65738A] hover:bg-[#F5F8FC] hover:text-[#1E40AF]'}`}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
        </header>
    )
}
