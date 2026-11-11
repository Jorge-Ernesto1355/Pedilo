'use client'

import { usePathname } from 'next/navigation'
import { LoadingMenu } from './menu/[slug]/PublicMenuPage'
import { ProtectedRouteLoading } from './(protected)/ProtectedRouteLoading'

function AuthRouteLoading() {
    return (
        <main
            className="grid min-h-screen place-items-center bg-[#F5F8FC] px-5 py-10"
            aria-busy="true"
            aria-label="Cargando autenticación"
        >
            <section className="w-full max-w-md rounded-[24px] border border-[#DCE5F3] bg-white p-7 shadow-[0_22px_60px_rgb(16_34_74_/_0.08)] sm:p-9">
                <div className="mx-auto h-11 w-11 animate-pulse rounded-xl bg-[#D4E0FF]" />
                <div className="mx-auto mt-5 h-8 w-48 animate-pulse rounded-lg bg-[#DCE7F4]" />
                <div className="mx-auto mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-[#E8EEF6]" />
                <div className="mt-8 space-y-4">
                    <div className="h-12 animate-pulse rounded-xl bg-[#EEF3F9]" />
                    <div className="h-12 animate-pulse rounded-xl bg-[#EEF3F9]" />
                    <div className="h-12 animate-pulse rounded-xl bg-[#DCE7F4]" />
                </div>
            </section>
        </main>
    )
}

function SiteRouteLoading() {
    return (
        <main
            className="min-h-screen bg-[#F5F8FC] px-5 py-10 sm:px-8"
            aria-busy="true"
            aria-label="Cargando página"
        >
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="h-10 w-40 animate-pulse rounded-lg bg-[#DCE7F4]" />
                <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[#E8EEF6]" />
                <section className="rounded-[24px] border border-[#DCE5F3] bg-white p-6 sm:p-8">
                    <div className="h-8 w-64 animate-pulse rounded-lg bg-[#DCE7F4]" />
                    <div className="mt-6 space-y-3">
                        <div className="h-4 w-full animate-pulse rounded bg-[#EEF3F9]" />
                        <div className="h-4 w-11/12 animate-pulse rounded bg-[#EEF3F9]" />
                        <div className="h-4 w-4/5 animate-pulse rounded bg-[#EEF3F9]" />
                    </div>
                </section>
            </div>
        </main>
    )
}

export default function AppRouteLoading() {
    const pathname = usePathname()
    const publicStaticPaths = new Set([
        '/',
        '/arco',
        '/home',
        '/marketing',
        '/privacidad',
        '/productos-y-contenido',
        '/propiedad-intelectual',
        '/terminos',
        '/terminos-restaurantes',
    ])
    const pathSegments = pathname.split('/').filter(Boolean)

    if (pathname.startsWith('/dashboard') || pathname.startsWith('/create-menu')) {
        return <ProtectedRouteLoading />
    }
    if (pathname.startsWith('/auth/')) return <AuthRouteLoading />
    if (
        pathname.startsWith('/menu/') ||
        (pathSegments.length === 1 && !publicStaticPaths.has(pathname))
    ) {
        return <LoadingMenu />
    }
    return <SiteRouteLoading />
}
