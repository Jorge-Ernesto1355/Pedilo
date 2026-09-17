'use client'

import { useState } from 'react'
import type { DateRange } from '../dashboard-data/dashboardData.types'

export function useDateRangeFilter(initialRange: DateRange = 'seven-days') {
    const [range, setRange] = useState<DateRange>(initialRange)
    return { range, setRange }
}
