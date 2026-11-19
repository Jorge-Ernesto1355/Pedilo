'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const faqItems = [
    {
        question: '¿Mis clientes necesitan descargar una app?',
        answer: 'No. Abren tu enlace desde cualquier navegador, eligen sus productos y envían el pedido. No tienen que instalar nada.',
    },
    {
        question: '¿El pedido llega a mi WhatsApp?',
        answer: 'Sí. Pedilo prepara el pedido con los productos, cantidades y datos que tu cliente agregó, y lo envía a tu WhatsApp.',
    },
    {
        question: '¿Puedo usarlo desde mi celular?',
        answer: 'Sí. Puedes crear tu menú y revisar pedidos desde el teléfono o la computadora que ya usas para tu negocio.',
    },
    {
        question: '¿Qué opciones hay para comenzar?',
        answer: 'Puedes crear tu cuenta y revisar las condiciones disponibles para tu negocio dentro de la plataforma.',
    },
]

export default function FaqList() {
    const [openFaq, setOpenFaq] = useState<number | null>(0)

    return (
        <div className="divide-y divide-border border-y border-border">
            {faqItems.map((item, index) => {
                const isOpen = openFaq === index
                return (
                    <div key={item.question}>
                        <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => setOpenFaq(isOpen ? null : index)}
                            className="flex min-h-16 w-full items-center justify-between gap-5 text-left text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            <span>{item.question}</span>
                            <ChevronDown
                                className={`size-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {isOpen && (
                            <p className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-muted-foreground">
                                {item.answer}
                            </p>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
