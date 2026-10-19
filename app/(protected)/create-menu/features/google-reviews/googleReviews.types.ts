export type GoogleReviewLink = {
    id: string
    businessId: string
    qrCode: string
    url: string
    createdAt: string
    updatedAt: string
}

export type GoogleReviewsResponse = {
    link: GoogleReviewLink | null
    business?: {
        name: string
        logoUrl: string | null
        coverUrl: string | null
    } | null
}
