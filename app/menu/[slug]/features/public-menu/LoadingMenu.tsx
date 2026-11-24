// Skeleton del menú público sin dependencias: lo usan los loading.tsx (incluido el
// raíz, que viaja en todas las rutas), así que no debe importar PublicMenuPage.
export function LoadingMenu() {
    return (
        <main className="min-h-screen bg-[#F5F8FC] p-4 sm:p-8">
            <div className="mx-auto max-w-5xl animate-pulse space-y-5">
                <div className="h-40 rounded-[24px] bg-[#DCE5F3] sm:h-56" />
                <div className="h-7 w-56 rounded bg-[#DCE5F3]" />
                <div className="h-12 rounded-xl bg-[#DCE5F3]" />
                <div className="space-y-3 rounded-[24px] bg-white p-6">
                    <div className="h-6 w-40 rounded bg-[#E8EEF6]" />
                    <div className="h-24 rounded bg-[#F1F4F9]" />
                    <div className="h-24 rounded bg-[#F1F4F9]" />
                </div>
            </div>
        </main>
    )
}
