// Confeti de la tarjeta de lealtad. Se importa de forma diferida (import()) SOLO cuando
// una tarjeta se completa, así no pesa en el menú público. Máximo 40 partículas, solo
// transform y opacity (Web Animations API), y todo se retira del DOM al terminar.

const MAX_PARTICLES = 40

export function launchConfetti(
    host: HTMLElement,
    options: { colors: string[]; durationMs: number; count?: number },
): () => void {
    if (typeof host.animate !== 'function') return () => undefined
    const count = Math.min(MAX_PARTICLES, options.count ?? MAX_PARTICLES)
    const width = host.clientWidth || 320
    const height = host.clientHeight || 200
    const layer = document.createElement('div')
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden'
    host.appendChild(layer)

    const animations: Animation[] = []
    for (let index = 0; index < count; index += 1) {
        const piece = document.createElement('span')
        const size = 5 + Math.random() * 5
        const isRound = index % 3 === 0
        piece.style.cssText = [
            'position:absolute',
            `left:${width / 2}px`,
            `top:${height * 0.62}px`,
            `width:${size}px`,
            `height:${isRound ? size : size * 0.45}px`,
            `border-radius:${isRound ? '999px' : '2px'}`,
            `background:${options.colors[index % options.colors.length]}`,
            'will-change:transform,opacity',
        ].join(';')
        layer.appendChild(piece)
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1
        const distance = height * (0.45 + Math.random() * 0.55)
        const dx = Math.cos(angle) * distance
        const dy = Math.sin(angle) * distance
        const spin = (Math.random() - 0.5) * 720
        animations.push(
            piece.animate(
                [
                    { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
                    {
                        transform: `translate(${dx * 0.85}px, ${dy}px) rotate(${spin * 0.6}deg)`,
                        opacity: 1,
                        offset: 0.55,
                    },
                    {
                        transform: `translate(${dx}px, ${dy + height * 0.35}px) rotate(${spin}deg)`,
                        opacity: 0,
                    },
                ],
                {
                    duration: options.durationMs * (0.75 + Math.random() * 0.25),
                    easing: 'cubic-bezier(.2,.7,.3,1)',
                    fill: 'forwards',
                },
            ),
        )
    }

    let removed = false
    const cleanup = () => {
        if (removed) return
        removed = true
        animations.forEach((animation) => animation.cancel())
        layer.remove()
    }
    void Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))).then(
        cleanup,
    )
    return cleanup
}
