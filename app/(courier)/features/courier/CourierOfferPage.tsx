'use client'

import { type FormEvent, type ReactNode, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Clock3, Link2Off, LoaderCircle, MapPin, PackageCheck, UserRoundCheck } from 'lucide-react'
import { normalizePhoneInput, validateMxPhone } from '@/src/lib/validation/phone'
import {
    claimCourierOffer,
    type CourierOffer,
    courierLinkProblem,
    getCourierOffer,
} from './courierApi'
import {
    type CourierIdentity,
    readClaimedDelivery,
    readCourierIdentity,
    saveClaimedDelivery,
    saveCourierIdentity,
} from './courierDevice'
import { itemCountLabel, money, phoneLabel } from './courierFormat'
import {
    Card,
    CourierScreen,
    InlineError,
    OfferSkeleton,
    primaryButton,
    secondaryButton,
    StateScreen,
} from './CourierScreen'

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 60

const isBrowser = typeof window !== 'undefined'

export function CourierOfferPage({ token }: { token: string }) {
    const offer = useQuery({
        queryKey: ['courier-offer', token],
        queryFn: () => getCourierOffer(token),
        // Un link inválido o expirado no mejora reintentando.
        retry: (count, error) => courierLinkProblem(error) === null && count < 2,
        refetchOnWindowFocus: true,
    })

    if (offer.isPending) {
        return (
            <CourierScreen>
                <OfferSkeleton />
            </CourierScreen>
        )
    }

    if (offer.isError) {
        const problem = courierLinkProblem(offer.error)
        return (
            <CourierScreen>
                {problem === 'expired' ? (
                    <ExpiredOffer />
                ) : problem === 'not_found' ? (
                    <InvalidOfferLink />
                ) : (
                    <StateScreen
                        cy="courier-offer-error"
                        icon={<Link2Off className="size-6" />}
                        tone="amber"
                        title="No pudimos cargar la entrega"
                        text="Revisa tu conexión e intenta de nuevo."
                    >
                        <button
                            type="button"
                            onClick={() => void offer.refetch()}
                            className={secondaryButton}
                        >
                            Reintentar
                        </button>
                    </StateScreen>
                )}
            </CourierScreen>
        )
    }

    const data = offer.data
    if (data.state !== 'AVAILABLE') {
        return data.state === 'TAKEN' ? (
            <TakenOffer token={token} restaurantName={data.restaurantName} />
        ) : (
            <CourierScreen>
                <ExpiredOffer restaurantName={data.restaurantName} />
            </CourierScreen>
        )
    }
    return <AvailableOffer token={token} offer={data} onGone={() => void offer.refetch()} />
}

function AvailableOffer({
    token,
    offer,
    onGone,
}: {
    token: string
    offer: Extract<CourierOffer, { state: 'AVAILABLE' }>
    onGone: () => void
}) {
    const router = useRouter()
    const [saved] = useState<CourierIdentity | null>(() =>
        isBrowser ? readCourierIdentity() : null,
    )
    const [editing, setEditing] = useState(!saved)
    const [name, setName] = useState(saved?.name ?? '')
    const [phone, setPhone] = useState(saved?.phone ?? '')
    const [touched, setTouched] = useState(false)

    const trimmedName = name.trim()
    const nameError = trimmedName.length < NAME_MIN_LENGTH ? 'Escribe tu nombre.' : null
    const phoneCheck = validateMxPhone(phone)
    const identity: CourierIdentity | null =
        !editing && saved
            ? saved
            : !nameError && phoneCheck.valid
              ? { name: trimmedName, phone: normalizePhoneInput(phone) }
              : null

    const claim = useMutation({
        mutationFn: (courier: CourierIdentity) => claimCourierOffer(token, courier),
        onSuccess: (courierToken, courier) => {
            saveCourierIdentity(courier)
            saveClaimedDelivery(token, courierToken)
            router.replace(`/entrega/${courierToken}`)
        },
        onError: (error) => {
            // Otra persona la tomó o el restaurante la cerró: se muestra ese estado.
            if (courierLinkProblem(error)) onGone()
        },
    })

    function submit(event: FormEvent) {
        event.preventDefault()
        setTouched(true)
        if (!identity || claim.isPending || claim.isSuccess) return
        claim.mutate(identity)
    }

    const busy = claim.isPending || claim.isSuccess

    return (
        <CourierScreen>
            <form onSubmit={submit} noValidate className="space-y-4">
                <Card cy="courier-offer" className="space-y-5" padding="p-5">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-[#53647D]">
                            Pedido a domicilio de
                        </p>
                        <h1
                            data-cy="courier-offer-restaurant"
                            className="font-display text-2xl font-bold leading-tight"
                        >
                            {offer.restaurantName}
                        </h1>
                    </div>

                    <p
                        data-cy="courier-offer-zone"
                        className="flex items-start gap-2 text-base leading-6 text-[#243556]"
                    >
                        <MapPin
                            className="mt-1 size-4 shrink-0 text-[#2438A8]"
                            aria-hidden="true"
                        />
                        {offer.zone}
                    </p>

                    <div className="rounded-xl bg-[#E8F6EE] px-4 py-3">
                        <p className="text-sm font-semibold text-[#1D6B3F]">Ganas</p>
                        <p
                            data-cy="courier-offer-earnings"
                            className="font-display text-3xl font-bold text-[#17643A]"
                        >
                            {money(offer.courierEarnings)}
                        </p>
                    </div>

                    <dl className="divide-y divide-[#E8EEF6] text-base">
                        <div className="flex items-center justify-between gap-4 py-2.5">
                            <dt className="text-[#53647D]">Pagas al restaurante al recoger</dt>
                            <dd data-cy="courier-offer-advance" className="font-bold">
                                {offer.amountToAdvance > 0 ? money(offer.amountToAdvance) : 'Nada'}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4 py-2.5">
                            <dt className="text-[#53647D]">Pedido</dt>
                            <dd data-cy="courier-offer-items" className="font-bold">
                                {itemCountLabel(offer.itemCount)}
                            </dd>
                        </div>
                    </dl>

                    <p className="text-sm leading-5 text-[#6B7A90]">
                        La dirección exacta y el teléfono del cliente aparecen cuando tomas la
                        entrega.
                    </p>
                </Card>

                {editing ? (
                    <Card cy="courier-identity-form" className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-base font-bold">Tus datos</h2>
                            <p className="text-sm leading-5 text-[#53647D]">
                                El restaurante los verá para contactarte. Se guardan en este
                                teléfono para la próxima vez.
                            </p>
                        </div>
                        <Field id="courier-name" label="Nombre" error={touched ? nameError : null}>
                            <input
                                id="courier-name"
                                data-cy="courier-name"
                                autoComplete="name"
                                maxLength={NAME_MAX_LENGTH}
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                aria-invalid={touched && Boolean(nameError)}
                                className={inputClass}
                            />
                        </Field>
                        <Field
                            id="courier-phone"
                            label="Teléfono"
                            error={touched ? phoneCheck.error : null}
                        >
                            <input
                                id="courier-phone"
                                data-cy="courier-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel-national"
                                placeholder="10 dígitos"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                aria-invalid={touched && !phoneCheck.valid}
                                className={inputClass}
                            />
                        </Field>
                    </Card>
                ) : (
                    saved && (
                        <div
                            data-cy="courier-identity"
                            className="flex items-center justify-between gap-3 rounded-2xl border border-[#DCE5F3] bg-white px-4 py-3"
                        >
                            <p className="flex min-w-0 items-center gap-2 text-sm text-[#243556]">
                                <UserRoundCheck
                                    className="size-4 shrink-0 text-[#2438A8]"
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 truncate">
                                    <strong className="font-semibold">{saved.name}</strong> ·{' '}
                                    {phoneLabel(saved.phone)}
                                </span>
                            </p>
                            <button
                                type="button"
                                data-cy="courier-identity-change"
                                onClick={() => setEditing(true)}
                                className="min-h-11 shrink-0 px-2 text-sm font-bold text-[#2451C5]"
                            >
                                Cambiar
                            </button>
                        </div>
                    )
                )}

                {claim.isError && !courierLinkProblem(claim.error) && (
                    <InlineError cy="courier-claim-error">
                        No se pudo tomar la entrega. Revisa tu conexión e intenta de nuevo.
                    </InlineError>
                )}

                <button
                    type="submit"
                    data-cy="courier-claim"
                    disabled={busy}
                    className={primaryButton}
                >
                    {busy && <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />}
                    {claim.isSuccess ? 'Abriendo tu entrega…' : 'Tomar entrega'}
                </button>
            </form>
        </CourierScreen>
    )
}

function TakenOffer({ token, restaurantName }: { token: string; restaurantName: string }) {
    const [mine] = useState(() => (isBrowser ? readClaimedDelivery(token) : null))
    return (
        <CourierScreen>
            {mine ? (
                <StateScreen
                    cy="courier-offer-mine"
                    icon={<PackageCheck className="size-6" />}
                    tone="green"
                    title="Ya tomaste esta entrega"
                    text={`Pedido de ${restaurantName}.`}
                >
                    <Link
                        href={`/entrega/${mine}`}
                        data-cy="courier-open-mine"
                        className={primaryButton}
                    >
                        Ver mi entrega
                    </Link>
                </StateScreen>
            ) : (
                <StateScreen
                    cy="courier-offer-taken"
                    icon={<UserRoundCheck className="size-6" />}
                    title="Esta entrega ya fue tomada"
                    text={`Otro repartidor tomó el pedido de ${restaurantName} antes.`}
                />
            )}
        </CourierScreen>
    )
}

function ExpiredOffer({ restaurantName }: { restaurantName?: string }) {
    return (
        <StateScreen
            cy="courier-offer-expired"
            icon={<Clock3 className="size-6" />}
            tone="amber"
            title="Esta entrega ya no está disponible"
            text={
                restaurantName
                    ? `${restaurantName} la cerró o pasó el tiempo para tomarla.`
                    : 'El restaurante la cerró o pasó el tiempo para tomarla.'
            }
        />
    )
}

function InvalidOfferLink() {
    return (
        <StateScreen
            cy="courier-offer-invalid"
            icon={<Link2Off className="size-6" />}
            tone="amber"
            title="Este link ya no funciona"
            text="Puede que el restaurante haya compartido uno nuevo. Pídeselo de nuevo."
        />
    )
}

const inputClass =
    'block min-h-12 w-full rounded-xl border border-[#D7E1EF] bg-white px-3.5 text-base text-[#12234A] outline-none transition placeholder:text-[#9AA7BA] focus:border-[#2438A8] focus:ring-4 focus:ring-[#2438A8]/10 aria-[invalid=true]:border-[#D92D20]'

function Field({
    id,
    label,
    error,
    children,
}: {
    id: string
    label: string
    error: string | null
    children: ReactNode
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-sm font-semibold text-[#243556]">
                {label}
            </label>
            {children}
            {error && (
                <p data-cy={`${id}-error`} className="text-sm text-[#B42318]">
                    {error}
                </p>
            )}
        </div>
    )
}
