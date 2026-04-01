import { FORM_COLORS } from '../lib/constants'

export default function FormBadges({ form }: { form: string }) {
  if (!form) return <span className="text-gray-500">-</span>
  return (
    <div className="flex gap-1">
      {form.split('').map((r, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-black"
          style={{ backgroundColor: FORM_COLORS[r] ?? '#6B7280' }}
        >
          {r}
        </span>
      ))}
    </div>
  )
}
