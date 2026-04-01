import type { BestXIResponse } from '../../types'
import PlayerAvatar from '../PlayerAvatar'
import { formatCost, formatNum } from '../../lib/utils'

interface Props { data: BestXIResponse }

export default function BestXIPitch({ data }: Props) {
  const { players, total_predicted_points, total_cost } = data
  const gkps = players.filter(p => p.position === 'GKP')
  const defs = players.filter(p => p.position === 'DEF')
  const mids = players.filter(p => p.position === 'MID')
  const fwds = players.filter(p => p.position === 'FWD')

  const PlayerToken = ({ p }: { p: typeof players[0] }) => (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
      <PlayerAvatar optaCode={p.opta_code} webName={p.web_name} position={p.position} size={44} />
      <span className="text-xs text-white font-medium text-center leading-tight max-w-[60px] truncate">{p.web_name}</span>
      <span className="text-xs font-bold text-gold">{formatNum(p.predicted_points, 1)}</span>
    </div>
  )

  const Row = ({ group }: { group: typeof players; label: string }) => (
    <div className="flex justify-center gap-3 flex-wrap py-2">
      {group.map(p => <PlayerToken key={p.player_id} p={p} />)}
    </div>
  )

  return (
    <div className="rounded-xl overflow-hidden border border-navy-border">
      {/* Pitch */}
      <div
        className="relative py-6"
        style={{
          background: 'linear-gradient(180deg, #1a472a 0%, #1e5c34 50%, #1a472a 100%)',
          backgroundSize: '100% 100%'
        }}
      >
        {/* Pitch lines */}
        <div className="absolute inset-4 border border-white/20 rounded pointer-events-none" />
        <div className="absolute left-4 right-4 top-1/2 -translate-y-px h-px bg-white/20 pointer-events-none" />
        <div className="absolute left-1/2 top-4 bottom-4 -translate-x-px w-px bg-white/20 pointer-events-none hidden md:block" />

        <Row group={fwds} label="FWD" />
        <Row group={mids} label="MID" />
        <Row group={defs} label="DEF" />
        <Row group={gkps} label="GKP" />
      </div>
      {/* Footer */}
      <div className="bg-navy-light px-4 py-3 flex items-center justify-between">
        <div>
          <span className="text-gray-400 text-sm">Total Cost: </span>
          <span className="text-white font-bold">{formatCost(total_cost)}</span>
        </div>
        <div>
          <span className="text-gray-400 text-sm">Predicted Pts: </span>
          <span className="text-gold font-bold text-lg">{formatNum(total_predicted_points, 1)}</span>
        </div>
      </div>
    </div>
  )
}
