import type { Metadata } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import QueryProvider from '@/src/providers/QueryProvider'

export const metadata: Metadata = {
    title: 'Pedilo',
    description: 'Recibe pedidos claros, directo en WhatsApp.',
    icons: {
        icon: '/logoPediloSinfondo.png',
        shortcut: '/logoPediloSinfondo.png',
        apple: '/logoPediloSinfondo.png',
    },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
    return (
        <html
            lang="es"
            className="h-full antialiased"
        >
            <body className="flex min-h-full flex-col bg-background text-foreground">
                <a
                    href="#main-content"
                    className="sr-only z-[100] rounded-md bg-white px-4 py-3 text-sm font-bold text-[#12234A] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20"
                >
                    Saltar al contenido principal
                </a>
                <div className="app-root relative flex min-h-screen flex-1 flex-col">
                    <div className="app-background" aria-hidden="true">
                        <span className="app-background-curve app-background-curve-top" />
                        <span className="app-background-curve app-background-curve-bottom" />
                    </div>
                    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                        <QueryProvider>{children}</QueryProvider>
                    </div>
                </div>
            </body>
        </html>
    )
}
