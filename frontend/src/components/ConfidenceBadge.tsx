export default function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence < 1.0)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-900/50 text-green-300">High</span>
  if (confidence < 2.5)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-900/50 text-yellow-300">Med</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-400">Low</span>
}
