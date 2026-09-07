/* eslint-disable @next/next/no-img-element -- External demo imagery keeps the landing independent from missing local assets. */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Minus,
    MessageCircle,
    Plus,
    RotateCcw,
    Send,
    ShoppingBag,
    Trash2,
    Utensils,
} from 'lucide-react'

type Product = {
    id: string
    category: string
    name: string
    description: string
    price: number
    image: string
    alt: string
}

type Cart = Record<string, number>
type DemoView = 'cart' | 'checkout' | 'sending' | 'sent'

const products: Product[] = [
    { id: 'clasica', category: 'Hamburguesas', name: 'Clásica', description: 'Carne, queso, lechuga, tomate y aderezo.', price: 129, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=320&q=80', alt: 'Hamburguesa clásica con queso' },
    { id: 'bbq', category: 'Hamburguesas', name: 'BBQ Bacon', description: 'Carne, queso, tocino y salsa BBQ.', price: 159, image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=320&q=80', alt: 'Hamburguesa BBQ con tocino' },
    { id: 'wings', category: 'Wings', name: '6 Wings', description: 'Alitas crujientes. Elige tu salsa.', price: 119, image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=320&q=80', alt: 'Alitas de pollo con salsa' },
    { id: 'papas', category: 'Extras', name: 'Papas', description: 'Papas crujientes con sal de la casa.', price: 49, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=320&q=80', alt: 'Papas fritas crujientes' },
]

const categories = ['Todos', 'Hamburguesas', 'Wings', 'Extras']

const money = (amount: number) => `$${amount.toLocaleString('es-MX')}`

function ProductPhoto({ product }: { product: Product }) {
    return (
        <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-[#E9EEF9] sm:h-[88px] sm:w-[88px]">
            <img src={product.image} alt={product.alt} loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute inset-0 bg-[#10265D]/[.06]" aria-hidden="true" />
        </div>
    )
}

function QuantityControl({ quantity, onDecrease, onIncrease }: { quantity: number; onDecrease: () => void; onIncrease: () => void }) {
    return (
        <div className="inline-flex items-center gap-1 rounded-lg border border-[#DCE4F2] bg-white p-1" aria-label={`Cantidad: ${quantity}`}>
            <button type="button" onClick={onDecrease} aria-label="Disminuir cantidad" className="grid size-7 place-items-center rounded-md text-[#53617A] transition hover:bg-[#EEF3FF] hover:text-[#1E40AF]"><Minus className="size-3.5" /></button>
            <span className="min-w-5 text-center text-xs font-bold text-[#172554]">{quantity}</span>
            <button type="button" onClick={onIncrease} aria-label="Aumentar cantidad" className="grid size-7 place-items-center rounded-md bg-[#1E40AF] text-white transition hover:bg-[#19368F]"><Plus className="size-3.5" /></button>
        </div>
    )
}

function CartLines({ cart, changeQuantity, removeProduct }: { cart: Cart; changeQuantity: (id: string, delta: number) => void; removeProduct: (id: string) => void }) {
    const lines = products.filter((product) => cart[product.id])
    return (
        <div className="space-y-3">
            {lines.map((product) => (
                <div key={product.id} className="flex items-center gap-3 rounded-xl border border-[#E3E8F1] bg-white p-3">
                    <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#EEF3FF]"><img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#172554]">{product.name}</p><p className="text-xs text-[#76839A]">{money(product.price)} c/u</p></div>
                    <QuantityControl quantity={cart[product.id]} onDecrease={() => changeQuantity(product.id, -1)} onIncrease={() => changeQuantity(product.id, 1)} />
                    <button type="button" onClick={() => removeProduct(product.id)} aria-label={`Eliminar ${product.name}`} className="grid size-8 place-items-center rounded-lg text-[#9AA6BA] transition hover:bg-[#FFF1F0] hover:text-[#B42318]"><Trash2 className="size-4" /></button>
                </div>
            ))}
        </div>
    )
}

export default function Playground() {
    const [category, setCategory] = useState('Todos')
    const [cart, setCart] = useState<Cart>({})
    const [view, setView] = useState<DemoView>('cart')
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [phoneError, setPhoneError] = useState('')

    const visibleProducts = category === 'Todos' ? products : products.filter((product) => product.category === category)
    const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)
    const total = products.reduce((sum, product) => sum + product.price * (cart[product.id] ?? 0), 0)
    const hasItems = itemCount > 0
    const cartLines = useMemo(() => products.filter((product) => cart[product.id]), [cart])

    useEffect(() => {
        if (view !== 'sending') return
        const timer = window.setTimeout(() => setView('sent'), 1000)
        return () => window.clearTimeout(timer)
    }, [view])

    function addProduct(id: string) {
        setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }))
        setView('cart')
    }

    function changeQuantity(id: string, delta: number) {
        setCart((current) => {
            const next = Math.max((current[id] ?? 0) + delta, 0)
            if (!next) {
                const nextCart = { ...current }
                delete nextCart[id]
                return nextCart
            }
            return { ...current, [id]: next }
        })
    }

    function removeProduct(id: string) {
        setCart((current) => {
            const nextCart = { ...current }
            delete nextCart[id]
            return nextCart
        })
    }

    function submitOrder(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!phone.trim()) {
            setPhoneError('Escribe tu número de WhatsApp para continuar.')
            return
        }
        setPhoneError('')
        setView('sending')
    }

    function resetDemo() {
        setCart({})
        setCategory('Todos')
        setView('cart')
        setName('')
        setPhone('')
        setNotes('')
        setPhoneError('')
    }

    return (
        <section id="playground" className="border-b border-border bg-[#F5F8FF]" aria-labelledby="playground-title">
            <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
                <div className="mb-12 grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-end lg:gap-20">
                    <div><p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-primary"><span className="size-2 rounded-sm bg-primary" /> Demo interactiva</p><h2 id="playground-title" className="max-w-xl font-display text-4xl leading-[1.02] tracking-[-.055em] text-[#101C3B] sm:text-5xl">Mira cómo tus clientes pedirían.</h2></div>
                    <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Prueba Pedilo como si fueras uno de tus clientes. Explora el menú, arma un pedido y descubre cómo lo recibirías directamente en WhatsApp.</p>
                </div>

                <div className="overflow-hidden rounded-[1.75rem] border border-[#D9E2F3] bg-white shadow-[0_26px_80px_-42px_rgb(30_64_175_/_0.4)]">
                    <div className="flex flex-col gap-4 border-b border-[#E7ECF4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#E8EEFF] text-[#1E40AF]"><Utensils className="size-5" /></span><div><p className="text-sm font-bold text-[#172554]">La Esquina</p><p className="text-xs text-[#76839A]">Hamburguesas · Wings · Papas</p></div></div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#76839A]"><span className="size-2 rounded-full bg-[#18A86B]" /> Abierto ahora <span className="mx-1 text-[#C3CCDA]">·</span> Demo sin registro</div>
                    </div>

                    <div className="grid lg:grid-cols-[1.08fr_.92fr]">
                        <div className="border-b border-[#E7ECF4] p-5 sm:p-7 lg:border-b-0 lg:border-r">
                            <div className="relative mb-7 h-36 overflow-hidden rounded-[1.25rem] bg-[#1B3E95] sm:h-44"><img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&q=85" alt="Hamburguesa de La Esquina" loading="lazy" className="h-full w-full object-cover opacity-75" /><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,31,82,.7),rgba(11,31,82,.05))]" /><div className="absolute inset-x-5 bottom-5 text-white sm:inset-x-7"><p className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-white/65">La Esquina</p><h3 className="font-display text-2xl tracking-[-.04em] sm:text-3xl">Algo rico, sin complicaciones.</h3></div></div>
                            <div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Menú online</p><p className="mt-1 text-sm text-[#76839A]">Elige tus favoritos</p></div><span className="rounded-full border border-[#DCE4F2] px-3 py-1 text-xs font-semibold text-[#53617A]">Pedido mínimo: ninguno</span></div>
                            <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Categorías del menú">{categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)} className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold transition ${category === item ? 'bg-[#1E40AF] text-white shadow-[0_5px_12px_rgb(30_64_175_/_0.2)]' : 'border border-[#DCE4F2] bg-white text-[#65738A] hover:border-[#AEBDE0] hover:text-[#1E40AF]'}`}>{item}</button>)}</div>
                            <div className="space-y-3">{visibleProducts.map((product) => <motion.article layout key={product.id} className="flex items-center gap-3 rounded-[1rem] border border-[#E5EAF2] bg-[#FCFDFF] p-3 transition hover:border-[#B9C8E8] hover:shadow-[0_10px_26px_rgb(30_64_175_/_0.07)] sm:gap-4 sm:p-3.5"><ProductPhoto product={product} /><div className="min-w-0 flex-1"><h4 className="truncate text-sm font-bold text-[#172554]">{product.name}</h4><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#76839A]">{product.description}</p><p className="mt-2 text-sm font-bold text-[#1E40AF]">{money(product.price)}</p></div><button type="button" onClick={() => addProduct(product.id)} aria-label={`Agregar ${product.name}`} className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#1E40AF] text-white shadow-[0_5px_12px_rgb(30_64_175_/_0.18)] transition hover:-translate-y-0.5 hover:bg-[#19368F] active:translate-y-0"><Plus className="size-4" /></button></motion.article>)}</div>
                        </div>

                        <div className="bg-[#F8FAFE] p-5 sm:p-7">
                            <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Tu recorrido</p><p className="mt-1 text-sm text-[#76839A]">Así se siente pedir con Pedilo</p></div>{hasItems && view !== 'sent' && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8EEFF] px-3 py-1.5 text-xs font-bold text-[#1E40AF]"><ShoppingBag className="size-3.5" /> {itemCount}</span>}</div>
                            <div className="mb-6 grid grid-cols-4 gap-1" aria-label="Progreso de la demostración"><span className="h-1 rounded-full bg-[#1E40AF]" /><span className={`h-1 rounded-full ${hasItems ? 'bg-[#1E40AF]' : 'bg-[#DCE4F2]'}`} /><span className={`h-1 rounded-full ${view === 'checkout' || view === 'sending' || view === 'sent' ? 'bg-[#1E40AF]' : 'bg-[#DCE4F2]'}`} /><span className={`h-1 rounded-full ${view === 'sent' ? 'bg-[#18A86B]' : 'bg-[#DCE4F2]'}`} /></div>

                            <AnimatePresence mode="wait">
                                {view === 'cart' && <motion.div key="cart" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><div className="mb-5 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[#E8EEFF] text-[#1E40AF]"><ShoppingBag className="size-4" /></span><div><h3 className="text-lg font-bold text-[#172554]">Tu pedido</h3><p className="text-xs text-[#76839A]">{hasItems ? `${itemCount} producto${itemCount === 1 ? '' : 's'} seleccionado${itemCount === 1 ? '' : 's'}` : 'Agrega algo del menú para comenzar'}</p></div></div>{hasItems ? <><CartLines cart={cart} changeQuantity={changeQuantity} removeProduct={removeProduct} /><div className="mt-5 flex items-center justify-between border-t border-[#DCE4F2] pt-4"><span className="text-sm font-bold text-[#53617A]">Total</span><span className="font-display text-2xl tracking-[-.04em] text-[#172554]">{money(total)}</span></div><button type="button" onClick={() => setView('checkout')} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 text-sm font-bold text-white shadow-[0_9px_20px_rgb(30_64_175_/_0.2)] transition hover:-translate-y-0.5 hover:bg-[#19368F]">Continuar pedido <ArrowRight className="size-4" /></button></> : <div className="rounded-xl border border-dashed border-[#C9D5EA] bg-white px-5 py-8 text-center"><p className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-[#EEF3FF] text-[#1E40AF]"><Plus className="size-5" /></p><p className="text-sm font-bold text-[#172554]">Tu carrito está vacío</p><p className="mt-1 text-xs leading-5 text-[#76839A]">Elige un producto y aparecerá aquí.</p></div>}</motion.div>}

                                {view === 'checkout' && <motion.div key="checkout" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}><button type="button" onClick={() => setView('cart')} className="mb-5 inline-flex items-center gap-1 text-xs font-bold text-[#1E40AF] hover:underline"><ArrowLeft className="size-3.5" /> Revisar pedido</button><h3 className="text-xl font-bold tracking-[-.03em] text-[#172554]">Comparte tu WhatsApp</h3><p className="mb-5 mt-1 text-sm leading-6 text-[#76839A]">Es la forma en que La Esquina recibiría tu pedido.</p><form onSubmit={submitOrder} className="space-y-4"><div><label htmlFor="demo-name" className="mb-1.5 block text-xs font-bold text-[#53617A]">Nombre <span className="font-normal text-[#98A2B3]">(opcional)</span></label><input id="demo-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Jorge" autoComplete="name" className="w-full rounded-lg border border-[#DCE4F2] bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-[#A8B2C2] focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10" /></div><div><label htmlFor="demo-phone" className="mb-1.5 block text-xs font-bold text-[#53617A]">Tu WhatsApp</label><input id="demo-phone" value={phone} onChange={(event) => { setPhone(event.target.value); setPhoneError('') }} placeholder="+52 668 123 4567" inputMode="tel" autoComplete="tel" aria-invalid={Boolean(phoneError)} className={`w-full rounded-lg border bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-[#A8B2C2] focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10 ${phoneError ? 'border-[#D92D20]' : 'border-[#DCE4F2]'}`} />{phoneError && <p role="alert" className="mt-1.5 text-xs text-[#B42318]">{phoneError}</p>}</div><div><label htmlFor="demo-notes" className="mb-1.5 block text-xs font-bold text-[#53617A]">Notas del pedido <span className="font-normal text-[#98A2B3]">(opcional)</span></label><textarea id="demo-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Sin cebolla" rows={2} className="w-full resize-none rounded-lg border border-[#DCE4F2] bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-[#A8B2C2] focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10" /></div><button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 text-sm font-bold text-white shadow-[0_9px_20px_rgb(30_64_175_/_0.2)] transition hover:-translate-y-0.5 hover:bg-[#19368F]">Enviar pedido por WhatsApp <Send className="size-4" /></button></form></motion.div>}

                                {view === 'sending' && <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-[350px] flex-col items-center justify-center text-center"><motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.1 }} className="mb-5 grid size-16 place-items-center rounded-2xl bg-[#DDF6E9] text-[#16803D]"><MessageCircle className="size-8" /></motion.div><h3 className="text-xl font-bold text-[#172554]">Enviando tu pedido…</h3><p className="mt-2 max-w-xs text-sm leading-6 text-[#76839A]">Estamos simulando cómo aparecería en el WhatsApp de La Esquina.</p><div className="mt-5 flex items-center gap-1.5" aria-label="Enviando"><span className="size-1.5 animate-pulse rounded-full bg-[#18A86B]" /><span className="size-1.5 animate-pulse rounded-full bg-[#18A86B] [animation-delay:150ms]" /><span className="size-1.5 animate-pulse rounded-full bg-[#18A86B] [animation-delay:300ms]" /></div></motion.div>}

                                {view === 'sent' && <motion.div key="sent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.25rem] border border-[#B8DDC6] bg-[#F3FBF5] p-5 shadow-[0_15px_35px_rgb(22_101_52_/_0.08)] sm:p-6"><div className="mb-5 flex items-center gap-3 border-b border-[#CFE8D6] pb-4"><span className="grid size-10 place-items-center rounded-full bg-[#D8F3DF] text-[#16803D]"><MessageCircle className="size-5 fill-current" /></span><div><p className="text-sm font-bold text-[#166534]">La Esquina</p><p className="text-xs text-[#4B8060]">Pedido recibido · hace un momento</p></div><Check className="ml-auto size-5 text-[#18A86B]" /></div><div className="rounded-xl rounded-tl-none bg-white p-4 text-sm leading-6 text-[#31583D] shadow-sm"><p className="mb-3 font-bold text-[#173B25]">Hola 👋 Quiero hacer un pedido.</p><div className="space-y-1 border-b border-[#E0F0E4] pb-3">{cartLines.map((product) => <div key={product.id} className="flex justify-between gap-3"><span>{cart[product.id]} × {product.name}</span><span>{money(product.price * cart[product.id])}</span></div>)}</div><div className="flex justify-between pt-3 font-bold text-[#173B25]"><span>Total</span><span>{money(total)}</span></div>{name && <p className="mt-3 text-xs">👤 Nombre: {name}</p>}<p className="text-xs">📱 WhatsApp: {phone}</p>{notes && <p className="mt-2 text-xs">📝 Nota: {notes}</p>}</div><div className="mt-5 flex flex-col items-center gap-3 text-center"><p className="flex items-center gap-2 text-sm font-bold text-[#16803D]"><Check className="size-4" /> Pedido enviado correctamente</p><p className="text-xs leading-5 text-[#4B8060]">Así recibirías tus pedidos todos los días.</p><button type="button" onClick={resetDemo} className="mt-1 inline-flex items-center gap-2 rounded-lg border border-[#B8DDC6] bg-white px-3.5 py-2 text-xs font-bold text-[#166534] transition hover:bg-[#EAF8EE]"><RotateCcw className="size-3.5" /> Probar de nuevo</button></div></motion.div>}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-[#76839A]"><span className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-[#E8EEFF] text-[#1E40AF]">1</span> Explora el menú</span><ArrowRight className="hidden size-3.5 text-[#B1BDD0] sm:block" /><span className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-[#E8EEFF] text-[#1E40AF]">2</span> Agrega tu pedido</span><ArrowRight className="hidden size-3.5 text-[#B1BDD0] sm:block" /><span className="flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-[#E8EEFF] text-[#1E40AF]">3</span> Compártelo por WhatsApp</span></div>
            </div>
        </section>
    )
}
