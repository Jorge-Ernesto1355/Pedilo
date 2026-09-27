import { Suspense } from 'react'
import ResetPasswordForm from './ResetPasswordForm'

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ResetPasswordLoading />}>
            <ResetPasswordForm />
        </Suspense>
    )
}

function ResetPasswordLoading() {
    return (
        <main
            className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 py-10 sm:px-8"
            aria-busy="true"
        >
            <section className="w-full max-w-[480px] rounded-[24px] border border-[#E6EAF2] bg-white p-6 shadow-[0_24px_70px_-28px_rgba(30,64,175,.25)] sm:p-10">
                <div className="h-7 w-24 animate-pulse rounded-lg bg-[#DCE7F4]" />
                <div className="mt-12 h-12 w-4/5 animate-pulse rounded-lg bg-[#DCE7F4]" />
                <div className="mt-5 h-16 w-full animate-pulse rounded-lg bg-[#DCE7F4]" />
                <div className="mt-8 h-12 w-full animate-pulse rounded-xl bg-[#DCE7F4]" />
            </section>
        </main>
    )
}
