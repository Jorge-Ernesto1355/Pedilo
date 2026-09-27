import { Suspense } from 'react'
import VerifyEmailPage from './VerifyEmailPage'

export default function VerifyEmailRoute() {
    return <Suspense fallback={<div className="min-h-screen bg-[#F5F7FB]" />}><VerifyEmailPage /></Suspense>
}
