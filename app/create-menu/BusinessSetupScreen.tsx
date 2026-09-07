'use client'

import { FormProvider, useWatch } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { Check, ChevronRight, Store } from 'lucide-react'
import Link from 'next/link'
import { BusinessProfileForm } from './features/business-profile/BusinessProfileForm'
import { useBusinessProfileForm } from './features/business-profile/useBusinessProfileForm'
import { BusinessPreviewCard } from './features/business-preview/BusinessPreviewCard'
import { AddCategoryModal } from './features/category-management/AddCategoryModal'
import { useCategoryManagement } from './features/category-management/useCategoryManagement'
import { AddProductModal } from './features/product-management/AddProductModal'
import { ProductCatalogCard } from './features/product-management/ProductCatalogCard'
import { useProductManagement } from './features/product-management/useProductManagement'
import type { BusinessProfileValues } from './features/business-profile/businessProfile.schema'
import { useSaveBusinessProfile } from './features/business-profile/useSaveBusinessProfile'
import { useBusinessShareLink } from './features/business-sharing/useBusinessShareLink'
import { ShareLinkButton } from './features/business-sharing/ShareLinkButton'
import { QrCodeButton } from './features/business-sharing/QrCodeButton'
import { LocationPickerModal } from './features/business-location/LocationPickerModal'
import { useBusinessLocation } from './features/business-location/useBusinessLocation'
import type { LocationCoordinates } from './features/business-location/location.schema'

export default function BusinessSetupScreen() {
    const form = useBusinessProfileForm()
    const profile = useWatch({ control: form.control, defaultValue: form.getValues() }) as BusinessProfileValues
    const categories = useCategoryManagement()
    const catalog = useProductManagement()
    const saveProfile = useSaveBusinessProfile()
    const location = useBusinessLocation(profile.coordinates ?? null)
    const sharing = useBusinessShareLink(profile.businessName)
    const [isProductModalOpen, setIsProductModalOpen] = useState(false)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [coverPreview, setCoverPreview] = useState<string | null>(null)
    const [showSaved, setShowSaved] = useState(false)

    useEffect(() => () => {
        if (logoPreview) URL.revokeObjectURL(logoPreview)
    }, [logoPreview])

    useEffect(() => () => {
        if (coverPreview) URL.revokeObjectURL(coverPreview)
    }, [coverPreview])

    function selectLogo(file: File | undefined) {
        if (!file || !file.type.startsWith('image/')) return
        if (logoPreview) URL.revokeObjectURL(logoPreview)
        setLogoPreview(URL.createObjectURL(file))
    }

    function selectCover(file: File | undefined) {
        if (!file || !file.type.startsWith('image/')) return
        if (coverPreview) URL.revokeObjectURL(coverPreview)
        setCoverPreview(URL.createObjectURL(file))
    }

    function handleProductSave(product: Parameters<typeof catalog.saveProduct.mutate>[0]) {
        catalog.saveProduct.mutate(product, {
            onSuccess: () => {
                setShowSaved(true)
                window.setTimeout(() => setShowSaved(false), 2600)
            },
        })
    }

    function handleLocationSave(coordinates: LocationCoordinates) {
        form.setValue('coordinates', coordinates, { shouldDirty: true, shouldValidate: true })
        location.saveLocation(coordinates)
    }

    function handleProfileSubmit(values: BusinessProfileValues) {
        saveProfile.mutate(values)
    }

    return (
        <FormProvider {...form}>
            <main className="min-h-screen bg-[#F5F8FC] text-[#12234A]">
                <header className="border-b border-[#DCE5F3] bg-white/90 backdrop-blur">
                    <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
                        <Link href="/" className="flex items-center gap-2.5 text-lg font-black tracking-[-.04em] text-[#12234A]"><span className="grid size-8 place-items-center rounded-[10px] bg-[#1E40AF] text-sm text-white shadow-[0_7px_16px_rgb(30_64_175_/_0.2)]">P</span>Pedilo</Link>
                        <div className="flex items-center gap-4"><span className="hidden text-xs font-semibold text-[#8996A9] sm:block">Configuración de tu menú</span><span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF8F2] px-3 py-1.5 text-xs font-bold text-[#23814C]"><span className="size-1.5 rounded-full bg-[#39A86B]" /> Borrador</span></div>
                    </div>
                </header>

                <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1440px] lg:grid-cols-[minmax(360px,480px)_minmax(0,1fr)]">
                    <div className="border-b border-[#DCE5F3] bg-white px-5 py-10 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-16">
                        <div className="mx-auto max-w-[430px] lg:sticky lg:top-10">
                            <BusinessProfileForm logoPreview={logoPreview} coverPreview={coverPreview} coordinates={location.coordinates} onLogoSelect={selectLogo} onCoverSelect={selectCover} onOpenLocationPicker={location.open} onSubmit={form.handleSubmit(handleProfileSubmit)} isSaving={saveProfile.isPending} saveState={saveProfile.isSuccess ? 'success' : saveProfile.isError ? 'error' : 'idle'} />
                            <div className="mt-8 flex items-center gap-3 rounded-xl border border-[#DCE5F3] bg-[#F8FAFE] px-3.5 py-3 text-xs leading-5 text-[#65738A]"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EAF0FF] text-[#2451C5]"><Store className="size-3.5" /></span><span>Los cambios se reflejan al instante en la vista previa.</span></div>
                        </div>
                    </div>

                    <div className="px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
                        <div className="mx-auto max-w-[760px] space-y-5">
                            <div className="mb-8 flex items-end justify-between gap-5"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#2451C5]">Tu menú online</p><h2 className="font-display text-3xl tracking-[-.055em] text-[#10224A] sm:text-4xl">Dale forma a tu escaparate.</h2></div><button type="button" onClick={categories.open} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#C9D7EA] bg-white px-3.5 py-2.5 text-sm font-bold text-[#243556] shadow-[0_5px_14px_rgb(20_48_105_/_0.04)] transition hover:-translate-y-0.5 hover:border-[#9EB3D8] hover:text-[#1E40AF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15"><span className="text-lg leading-none text-[#2451C5]">+</span><span className="hidden sm:inline">Agregar categoría</span><span className="sm:hidden">Categoría</span></button></div>
                            <BusinessPreviewCard {...profile} logoPreview={logoPreview} coverPreview={coverPreview} />
                            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#DCE5F3] bg-[#FBFCFE] p-3"><p className="mr-auto px-1 text-xs font-semibold text-[#8996A9]">Comparte tu menú con tus clientes</p><ShareLinkButton shareUrl={sharing.shareUrl} copied={sharing.copied} onCopy={sharing.copyLink} /><QrCodeButton shareUrl={sharing.shareUrl} /></div>
                            <ProductCatalogCard products={catalog.products} onAddProduct={() => setIsProductModalOpen(true)} />
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-transparent px-1 py-2 text-xs text-[#8996A9]"><span>Más adelante podrás conectar tu catálogo con WhatsApp.</span><span className="inline-flex items-center gap-1 font-semibold text-[#65738A]">Siguiente paso <ChevronRight className="size-3.5" /></span></div>
                        </div>
                    </div>
                </div>

                {showSaved && <div role="status" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-xl border border-[#BCE2C9] bg-white px-4 py-3 text-sm font-semibold text-[#23794A] shadow-[0_16px_40px_-20px_rgba(35,121,74,.4)]"><span className="grid size-6 place-items-center rounded-full bg-[#E7F7ED]"><Check className="size-3.5" /></span>Producto agregado</div>}
                <AddCategoryModal open={categories.isOpen} categories={categories.categories} onClose={categories.close} onSave={categories.addCategory} />
                <AddProductModal open={isProductModalOpen} categories={categories.categories} onClose={() => setIsProductModalOpen(false)} onSave={handleProductSave} />
                <LocationPickerModal open={location.isOpen} locationText={profile.location} coordinates={location.coordinates} onClose={location.close} onSave={handleLocationSave} />
            </main>
        </FormProvider>
    )
}
