'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sileo'
import { useState } from 'react'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000,
                        gcTime: 30 * 60 * 1000,
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            }),
    )

    return (
        <QueryClientProvider client={queryClient}>
            <Toaster
                position="top-right"
                theme="light"
                offset={{ top: '0.75rem', right: '0.75rem' }}
                options={{ fill: '#111827', roundness: 14 }}
            />
            {children}
        </QueryClientProvider>
    )
}
