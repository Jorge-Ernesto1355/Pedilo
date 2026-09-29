import Link from 'next/link'

export function SiteFooter() {
    return (
        <footer className="border-t border-border bg-background">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                <div>
                    <p className="font-bold text-foreground">Pedilo</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Recibe pedidos claros, directo en WhatsApp.
                    </p>
                    <div className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
                        <a href="mailto:soporte@pedilo.mx" className="w-fit hover:text-foreground">
                            soporte@pedilo.mx
                        </a>
                        <a href="mailto:privacidad@pedilo.mx" className="w-fit hover:text-foreground">
                            privacidad@pedilo.mx
                        </a>
                    </div>
                </div>
                <nav aria-label="Información legal" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground">
                    <Link href="/privacidad" className="hover:text-foreground">
                        Política de Privacidad
                    </Link>
                    <Link href="/terminos" className="hover:text-foreground">
                        Términos de clientes
                    </Link>
                    <Link href="/terminos-restaurantes" className="hover:text-foreground">
                        Términos de restaurantes
                    </Link>
                    <Link href="/arco" className="hover:text-foreground">
                        Derechos ARCO
                    </Link>
                    <Link href="/productos-y-contenido" className="hover:text-foreground">
                        Productos y contenido
                    </Link>
                    <Link href="/propiedad-intelectual" className="hover:text-foreground">
                        Propiedad intelectual
                    </Link>
                    <Link href="/marketing" className="hover:text-foreground">
                        Marketing
                    </Link>
                </nav>
            </div>
            <p className="mx-auto max-w-7xl px-5 pb-8 text-xs text-muted-foreground lg:px-8">
                © 2026 Pedilo
            </p>
        </footer>
    )
}
