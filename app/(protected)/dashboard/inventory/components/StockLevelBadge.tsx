import type { StockLevel } from '../inventory.types'
import { levelCopy } from '../inventoryFormat'

const styles: Record<StockLevel, { dot: string; text: string }> = {
    OK: { dot: 'bg-[#2E9B62]', text: 'text-[#1F6F45]' },
    LOW: { dot: 'bg-[#D49A22]', text: 'text-[#8A5E0B]' },
    CRITICAL: { dot: 'bg-[#E0702B]', text: 'text-[#A4470F]' },
    OUT: { dot: 'bg-[#C94040]', text: 'text-[#A52A2A]' },
}

export const levelBarColor: Record<StockLevel, string> = {
    OK: 'bg-[#2E9B62]',
    LOW: 'bg-[#D49A22]',
    CRITICAL: 'bg-[#E0702B]',
    OUT: 'bg-[#C94040]',
}

export function StockLevelBadge({ level }: { level: StockLevel }) {
    const style = styles[level]
    return (
        <span
            data-testid="stock-level"
            data-level={level}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${style.text}`}
        >
            <span className={`size-2 rounded-full ${style.dot}`} aria-hidden="true" />
            {levelCopy[level]}
        </span>
    )
}
