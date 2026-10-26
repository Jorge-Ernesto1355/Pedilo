type CatalogEmptyStateProps =
    { kind: 'menu'; categoryName?: never } | { kind: 'category'; categoryName: string }

export function CatalogEmptyState({ kind, categoryName }: CatalogEmptyStateProps) {
    const isMenu = kind === 'menu'
    const title = isMenu ? 'La carta está tomando forma.' : 'Esta sección está entre bastidores.'
    const description = isMenu
        ? 'Este menú todavía no tiene categorías. Vuelve pronto para descubrir lo que viene.'
        : `Aún no hay productos en “${categoryName}”. Quizá la cocina está preparando algo nuevo.`

    return (
        <section
            aria-labelledby={`empty-${kind}-title`}
            className="relative isolate overflow-hidden rounded-[28px] border border-[#263C70] bg-[#12234A] px-5 py-6 text-white sm:flex sm:min-h-64 sm:items-center sm:justify-between sm:gap-8 sm:px-8 sm:py-8"
        >
            <div className="relative z-10 max-w-md">
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#F2B880]">
                    {isMenu ? 'Carta en preparación' : 'Sección en preparación'}
                </p>
                <h2
                    id={`empty-${kind}-title`}
                    className="mt-3 max-w-sm font-display text-2xl leading-tight tracking-[-.04em] text-white sm:text-[2rem]"
                >
                    {title}
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#B8C7E4]">{description}</p>
                <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#F2B880]">
                    <span className="size-2 rounded-full bg-[#F2B880]" aria-hidden="true" />
                    <span>Vuelve a mirar pronto</span>
                </div>
            </div>

            <div
                aria-hidden="true"
                className="relative mt-7 h-36 w-full max-w-[250px] shrink-0 sm:mt-0 sm:h-44"
            >
                <div className="absolute inset-x-2 bottom-1 h-px bg-[#405582]" />
                {isMenu ? <MenuInPreparationIllustration /> : <CategoryInPreparationIllustration />}
            </div>

            <div
                aria-hidden="true"
                className="absolute -right-20 -top-24 size-56 rounded-full border border-[#2C4478]"
            />
            <div
                aria-hidden="true"
                className="absolute -bottom-32 -left-20 size-64 rounded-full border border-[#263C70]"
            />
        </section>
    )
}

function MenuInPreparationIllustration() {
    return (
        <svg viewBox="0 0 250 176" className="h-full w-full" fill="none">
            <path d="M52 143h151" stroke="#405582" strokeLinecap="round" strokeWidth="2" />
            <path
                d="M70 129V38c0-6 5-11 11-11h79c6 0 11 5 11 11v91"
                fill="#F9FBFF"
                stroke="#8EA9F5"
                strokeWidth="2"
            />
            <path d="M70 54h101" stroke="#DCE5F3" strokeWidth="2" />
            <path d="M86 43h36" stroke="#2451C5" strokeLinecap="round" strokeWidth="4" />
            <path
                d="M87 72h64M87 87h46M87 102h57"
                stroke="#B9C8E5"
                strokeLinecap="round"
                strokeWidth="4"
            />
            <path d="M87 117h27" stroke="#F2B880" strokeLinecap="round" strokeWidth="4" />
            <path d="m177 76 10-10 18 18-10 10z" fill="#F2B880" stroke="#D89159" strokeWidth="2" />
            <path d="m185 68 5-5 18 18-5 5z" fill="#FFF3E6" stroke="#D89159" strokeWidth="2" />
            <path d="M181 91 174 105" stroke="#F2B880" strokeLinecap="round" strokeWidth="3" />
        </svg>
    )
}

function CategoryInPreparationIllustration() {
    return (
        <svg viewBox="0 0 250 176" className="h-full w-full" fill="none">
            <path d="M46 143h160" stroke="#405582" strokeLinecap="round" strokeWidth="2" />
            <path
                d="M65 107c0 24 19 36 61 36s61-12 61-36H65Z"
                fill="#F9FBFF"
                stroke="#8EA9F5"
                strokeWidth="2"
            />
            <path d="M75 108c7-14 20-22 51-22s44 8 51 22" stroke="#8EA9F5" strokeWidth="2" />
            <path d="M97 83c1-17 9-27 29-27s28 10 29 27" stroke="#F2B880" strokeWidth="3" />
            <path d="M126 56V43" stroke="#F2B880" strokeLinecap="round" strokeWidth="3" />
            <path
                d="M119 43c0-8 7-13 14-13"
                stroke="#F2B880"
                strokeLinecap="round"
                strokeWidth="3"
            />
            <path d="M96 121h59" stroke="#B9C8E5" strokeLinecap="round" strokeWidth="4" />
            <path d="M112 130h27" stroke="#F2B880" strokeLinecap="round" strokeWidth="4" />
            <path
                d="M47 74v47M41 74v19M47 74v19M53 74v19"
                stroke="#8EA9F5"
                strokeLinecap="round"
                strokeWidth="2"
            />
            <path
                d="M197 74v47M191 74v19M197 74v19M203 74v19"
                stroke="#8EA9F5"
                strokeLinecap="round"
                strokeWidth="2"
            />
        </svg>
    )
}
