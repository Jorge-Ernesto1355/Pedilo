import {
    BusinessPreviewSkeleton,
    BusinessProfileSkeleton,
    MenuManagementSkeleton,
} from './components/CreateMenuStates'

export default function Loading() {
    return (
        <main className="min-h-screen bg-[#F5F8FC] px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
            <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[minmax(360px,480px)_minmax(0,1fr)]">
                <section className="rounded-2xl border border-[#DCE5F3] bg-white p-6 sm:p-8">
                    <BusinessProfileSkeleton />
                </section>
                <div className="space-y-5">
                    <BusinessPreviewSkeleton />
                    <MenuManagementSkeleton />
                </div>
            </div>
        </main>
    )
}
