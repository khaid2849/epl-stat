import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
export const formatCost = (cost: number): string => `£${cost.toFixed(1)}m`
export const formatNum = (n: number | null | undefined, decimals = 2): string =>
  n == null ? '-' : Number(n).toFixed(decimals)
export const formatDate = (iso: string | null): string => {
  if (!iso) return 'TBC'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
