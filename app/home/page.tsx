'use client'

import {
    ArrowRight,
    Check,
    ChevronDown,
    ClipboardList,
    ExternalLink,
    Link2,
    Menu,
    MessageCircle,
    PackageCheck,
    Plus,
    ShoppingBag,
    Store,
    UtensilsCrossed,
} from 'lucide-react'
import Image from 'next/image'
import LogoPedilo from "../../public/LogoPedilo.jpg"
import { useState } from 'react'
import Playground from './components/Playground'

const menuItems = [
    { name: 'Chilaquiles verdes', detail: 'Con huevo y frijoles', price: '$95' },
    { name: 'Molletes gratinados', detail: 'Pan, frijoles y queso', price: '$78' },
    { name: 'Café de olla', detail: 'Canela y piloncillo', price: '$35' },
]

const steps = [
    { number: '01', title: 'Arma tu menú', description: 'Agrega productos, precios, fotos y opciones desde tu celular.', icon: Menu },
    { number: '02', title: 'Comparte tu enlace', description: 'Ponlo en tu WhatsApp, Instagram, Facebook o código QR.', icon: Link2 },
    { number: '03', title: 'Recibe el pedido completo', description: 'Pedilo lo ordena y lo manda a tu WhatsApp para que solo confirmes.', icon: ClipboardList },
]

const faqItems = [
    { question: '¿Mis clientes necesitan descargar una app?', answer: 'No. Abren tu enlace desde cualquier navegador, eligen sus productos y envían el pedido. No tienen que instalar nada.' },
    { question: '¿El pedido llega a mi WhatsApp?', answer: 'Sí. Pedilo prepara el pedido con los productos, cantidades y datos que tu cliente agregó, y lo envía a tu WhatsApp.' },
    { question: '¿Puedo usarlo desde mi celular?', answer: 'Sí. Puedes crear tu menú y revisar pedidos desde el teléfono o la computadora que ya usas para tu negocio.' },
    { question: '¿Puedo comenzar gratis?', answer: 'Sí. Puedes crear tu menú y empezar a recibir pedidos sin pagar por adelantado. Revisa los detalles del plan al registrarte.' },
]



function Logo() {
    return <a href="#inicio" className="inline-flex items-center gap-2.5 text-xl font-bold tracking-[-0.04em]"><Image src={LogoPedilo} alt="Logo de Pedilo" width={36} height={36} className="size-9" /><span>pedilo</span></a>
}

function ActionLink({ children, href, variant = 'primary' }: { children: React.ReactNode; href: string; variant?: 'primary' | 'secondary' }) {
    return <a href={href} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-[0_8px_20px_rgb(37_84_196_/_0.16)] transition-all hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${variant === 'primary' ? 'bg-gradient-to-br from-primary to-[#244fc0] text-primary-foreground hover:shadow-[0_12px_28px_rgb(37_84_196_/_0.24)]' : 'border border-background/25 bg-background/5 text-background shadow-none hover:bg-background/10'}`}>{children}</a>
}

function MenuPreview() {
    return <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-card/95 shadow-[0_24px_60px_rgb(25_54_120_/_0.14),12px_14px_0_var(--color-accent)] backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-accent text-primary shadow-inner"><Store className="size-4" /></span><div><p className="text-sm font-bold">La Esquina</p><p className="text-xs text-muted-foreground">Menú del día</p></div></div><ShoppingBag className="size-5 text-muted-foreground" />
        </div>
        <div className="bg-gradient-to-br from-secondary/80 via-secondary/45 to-[#eef4ff] p-5 sm:p-6">
            <div className="mb-5 flex items-end justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">Hoy en La Esquina</p><h2 className="font-display text-3xl leading-none tracking-[-0.04em]">Elige algo rico</h2></div><span className="border border-primary/20 bg-card px-2.5 py-1 text-xs font-semibold text-primary">Abierto</span></div>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 text-xs font-semibold"><span className="shrink-0 bg-primary px-3 py-2 text-primary-foreground">Más pedidos</span><span className="shrink-0 border border-border bg-card px-3 py-2 text-muted-foreground">Desayunos</span><span className="shrink-0 border border-border bg-card px-3 py-2 text-muted-foreground">Bebidas</span></div>
            <div className="space-y-2">{menuItems.map((item) => <div key={item.name} className="flex items-center gap-3 rounded-xl border border-border/75 bg-card/95 p-3 shadow-[0_3px_10px_rgb(30_64_175_/_0.04)]"><div className="grid size-11 shrink-0 rounded-lg bg-accent text-primary"><UtensilsCrossed className="m-auto size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="truncate text-xs text-muted-foreground">{item.detail}</p></div><div className="text-right"><p className="text-sm font-bold">{item.price}</p><span className="mt-1 inline-flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_3px_8px_rgb(37_84_196_/_0.2)]" aria-label={`Agregar ${item.name}`}><Plus className="size-3.5" /></span></div></div>)}</div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border/80 bg-card px-5 py-4 sm:px-6"><div><p className="text-xs text-muted-foreground">Tu pedido</p><p className="text-sm font-bold">3 productos · $208</p></div><span className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_5px_12px_rgb(37_84_196_/_0.18)]">Enviar pedido</span></div>
    </div>
}

function WhatsAppPreview() {
    return <div className="rounded-[1.25rem] border border-[#b8ddc6] bg-[#f3fbf5]/95 p-5 shadow-[0_18px_36px_rgb(22_101_52_/_0.12)] backdrop-blur-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3 border-b border-[#cfe8d6] pb-4"><span className="grid size-9 place-items-center rounded-full bg-[#d8f3df] text-[#16803d]"><MessageCircle className="size-5 fill-current" /></span><div><p className="text-sm font-bold text-[#166534]">Pedido nuevo</p><p className="text-xs text-[#4b8060]">WhatsApp · hace un momento</p></div></div>
        <p className="mb-4 text-sm font-bold text-[#173b25]">Pedido de Ana López</p>
        <div className="space-y-2 border-b border-[#cfe8d6] pb-4 text-sm text-[#31583d]"><div className="flex justify-between gap-4"><span>2 × Chilaquiles verdes</span><span>$190</span></div><div className="flex justify-between gap-4"><span>1 × Café de olla</span><span>$35</span></div><div className="flex justify-between gap-4"><span>Entrega: pasaré a recoger</span><span>—</span></div></div>
        <div className="flex items-center justify-between pt-4 text-sm font-bold text-[#173b25]"><span>Total</span><span>$225</span></div>
    </div>
}

export default function Page() {
    const [openFaq, setOpenFaq] = useState<number | null>(0)

    return <main id="inicio" className="overflow-hidden bg-background">
        <header className="border-b border-border bg-background"><nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 lg:px-8"><Logo /><div className="order-3 flex w-full items-center gap-5 overflow-x-auto text-sm font-semibold text-muted-foreground sm:order-2 sm:w-auto sm:gap-7"><a href="#como-funciona" className="whitespace-nowrap hover:text-foreground">Cómo funciona</a><a href="#para-quien" className="whitespace-nowrap hover:text-foreground">Para tu negocio</a><a href="#precio" className="whitespace-nowrap hover:text-foreground">Precio</a><a href="#preguntas" className="whitespace-nowrap hover:text-foreground">Preguntas</a></div><div className="order-2 flex items-center gap-3 sm:order-3"><a href="/auth/login" className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground sm:inline">Iniciar sesión</a><a href="/auth/register" className="bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90">Crear mi menú</a></div></nav></header>

        <section className="relative overflow-hidden border-b border-border bg-[linear-gradient(135deg,#f4f7ff_0%,#f8fafc_52%,#eef4ff_100%)]" aria-labelledby="hero-title"><div aria-hidden="true" className="pointer-events-none absolute -right-24 top-16 size-72 rounded-[5rem] border border-primary/10 bg-primary/[0.035] rotate-12" /><div aria-hidden="true" className="pointer-events-none absolute bottom-[-8rem] left-[42%] size-64 rounded-full border border-primary/10" /><div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8 lg:py-24"><div><p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><span className="h-2 w-2 rounded-sm bg-primary shadow-[0_0_0_4px_rgb(37_84_196_/_0.1)]" /> Para negocios que venden por WhatsApp</p><h1 id="hero-title" className="max-w-xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-[#101c3b] sm:text-6xl lg:text-[72px]">Recibe pedidos claros, directo en WhatsApp.</h1><p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">Crea un menú sencillo, compártelo con tus clientes y deja que Pedilo ordene cada pedido antes de que llegue a tu teléfono.</p><div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"><ActionLink href="/auth/register">Crear mi menú gratis <ArrowRight className="size-4" /></ActionLink><a href="#como-funciona" className="inline-flex min-h-12 items-center justify-center gap-2 px-1 text-sm font-bold text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">Ver cómo funciona <ArrowRight className="size-4" /></a></div><p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Check className="size-4 text-primary" /> Sin app para tus clientes</p></div><div className="relative mx-auto w-full max-w-[560px] lg:pt-8"><MenuPreview /><div className="relative z-10 ml-auto mt-[-1px] w-[88%] max-w-[430px] sm:mr-[-24px]"><WhatsAppPreview /></div></div></div></section>

        <Playground />

        <section className="border-b border-border bg-background"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-5 text-sm font-semibold text-muted-foreground lg:px-8"><span className="text-xs uppercase tracking-[0.14em] text-foreground">Un enlace para vender en</span><span className="flex items-center gap-2"><MessageCircle className="size-4 text-[#25D366]" /> WhatsApp</span><span className="flex items-center gap-2"><ExternalLink className="size-4" /> Instagram</span><span className="flex items-center gap-2"><Store className="size-4" /> Tu local</span></div></section>

        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="problem-title"><div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">Menos mensajes sueltos</p><h2 id="problem-title" className="max-w-md font-display text-4xl leading-[1.02] tracking-[-0.05em] sm:text-5xl">Tu negocio ya es mucho trabajo. Tus pedidos no deberían complicarlo más.</h2></div><div className="grid gap-8 border-t border-border pt-7 sm:grid-cols-2"><div><p className="mb-3 text-2xl font-bold text-muted-foreground/50">Antes</p><p className="max-w-xs leading-7 text-muted-foreground">“¿Cuánto cuesta?”, “¿qué incluye?”, &quot;mandame foto&quot; y pedidos repartidos entre conversaciones.</p></div><div><p className="mb-3 text-2xl font-bold text-primary">Con Pedilo</p><p className="max-w-xs leading-7 text-muted-foreground">Tu cliente elige con calma y tú recibes una orden lista para revisar y confirmar.</p></div></div></div></section>

        <section id="como-funciona" className="bg-foreground text-background" aria-labelledby="steps-title"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">Así de simple</p><h2 id="steps-title" className="max-w-md font-display text-4xl leading-[1.02] tracking-[-0.05em] sm:text-5xl">De tu menú al pedido en tres pasos.</h2><p className="mt-5 max-w-md leading-7 text-background/65">No cambias la forma en que trabajas. Solo le das orden a la parte que más tiempo te quita.</p><div className="mt-8"><ActionLink href="/auth/register" variant="secondary">Empezar ahora <ArrowRight className="size-4" /></ActionLink></div></div><div className="divide-y divide-background/15 border-y border-background/15">{steps.map(({ number, title, description, icon: Icon }) => <div key={number} className="grid gap-4 py-6 sm:grid-cols-[52px_1fr_auto] sm:items-start"><span className="font-mono text-sm text-primary">{number}</span><div><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 max-w-md leading-6 text-background/65">{description}</p></div><Icon className="hidden size-5 text-primary sm:block" /></div>)}</div></div></div></section>

        <section id="para-quien" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28" aria-labelledby="business-title"><div className="flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">Hecho para tu día a día</p><h2 id="business-title" className="max-w-xl font-display text-4xl leading-[1.02] tracking-[-0.05em] sm:text-5xl">Si vendes algo, Pedilo te ayuda a recibirlo mejor.</h2></div><p className="max-w-xs text-sm leading-6 text-muted-foreground">Comida, repostería, bebidas, productos o pedidos por encargo.</p></div><div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">{[['01', 'Comida y bebidas', 'Menús que tus clientes pueden consultar antes de escribirte.'], ['02', 'Repostería', 'Muestra sabores, tamaños y opciones con claridad.'], ['03', 'Tiendas pequeñas', 'Comparte un solo enlace con tu catálogo actualizado.'], ['04', 'Pedidos por encargo', 'Recibe los detalles completos desde el primer mensaje.']].map(([number, title, description]) => <div key={number} className="py-7 sm:px-6 lg:px-7"><p className="mb-8 font-mono text-xs text-primary">{number}</p><h3 className="font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p></div>)}</div></section>

        <section id="precio" className="border-y border-border bg-[#f4efe7]" aria-labelledby="price-title"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:px-8 lg:py-24"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">Empieza sin complicarte</p><h2 id="price-title" className="max-w-lg font-display text-4xl leading-[1.02] tracking-[-0.05em] sm:text-5xl">Crea tu menú y pruébalo con tus clientes.</h2><p className="mt-5 max-w-md leading-7 text-muted-foreground">Sin contratos ni tarjeta para comenzar. Si tu negocio crece, podrás revisar las opciones disponibles desde tu cuenta.</p></div><div className="border border-border bg-card p-6 sm:p-8"><div className="flex items-center justify-between border-b border-border pb-5"><span className="font-bold">Plan inicial</span><PackageCheck className="size-5 text-primary" /></div><p className="mt-6 font-display text-5xl tracking-[-0.05em]">Gratis</p><ul className="mt-6 space-y-3 text-sm text-muted-foreground"><li className="flex gap-2"><Check className="size-4 shrink-0 text-primary" /> Menú digital</li><li className="flex gap-2"><Check className="size-4 shrink-0 text-primary" /> Enlace para compartir</li><li className="flex gap-2"><Check className="size-4 shrink-0 text-primary" /> Pedidos organizados para WhatsApp</li></ul><a href="/auth/register" className="mt-8 flex min-h-12 items-center justify-center gap-2 bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90">Crear mi menú <ArrowRight className="size-4" /></a></div></div></section>

        <section id="preguntas" className="mx-auto max-w-3xl px-5 py-20 lg:py-28" aria-labelledby="faq-title"><div className="mb-10"><p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">Antes de empezar</p><h2 id="faq-title" className="font-display text-4xl tracking-[-0.05em] sm:text-5xl">Preguntas frecuentes</h2></div><div className="divide-y divide-border border-y border-border">{faqItems.map((item, index) => { const isOpen = openFaq === index; return <div key={item.question}><button type="button" aria-expanded={isOpen} onClick={() => setOpenFaq(isOpen ? null : index)} className="flex min-h-16 w-full items-center justify-between gap-5 text-left text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span>{item.question}</span><ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>{isOpen && <p className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-muted-foreground">{item.answer}</p>}</div> })}</div></section>

        <section className="bg-primary text-primary-foreground" aria-labelledby="cta-title"><div className="mx-auto flex max-w-4xl flex-col items-start gap-8 px-5 py-16 sm:flex-row sm:items-end sm:justify-between lg:px-8 lg:py-20"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/70">Tu siguiente pedido</p><h2 id="cta-title" className="max-w-xl font-display text-4xl leading-[1.02] tracking-[-0.05em] sm:text-5xl">Empieza a recibir pedidos con más claridad.</h2></div><a href="/auth/register" className="inline-flex min-h-12 shrink-0 items-center gap-2 bg-primary-foreground px-5 text-sm font-bold text-primary hover:bg-primary-foreground/90">Crear mi menú <ArrowRight className="size-4" /></a></div></section>

        <footer className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 lg:px-8"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start"><div><Logo /><p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">Una forma más clara de recibir pedidos y seguir atendiendo a tus clientes por WhatsApp.</p></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-muted-foreground"><a href="#como-funciona" className="hover:text-foreground">Cómo funciona</a><a href="#precio" className="hover:text-foreground">Precio</a><a href="#preguntas" className="hover:text-foreground">Preguntas</a><a href="/auth/login" className="hover:text-foreground">Iniciar sesión</a></div></div><div className="border-t border-border pt-6 text-xs text-muted-foreground">© 2026 Pedilo</div></footer>
    </main>
}
