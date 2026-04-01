import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const links = [
  { to: '/', label: 'Home' },
  { to: '/standings', label: 'Standings' },
  { to: '/fixtures', label: 'Fixtures' },
  { to: '/players', label: 'Players' },
  { to: '/predictions', label: 'Predictions' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-gold border-b-2 border-gold' : 'text-white/80 hover:text-white'}`

  return (
    <nav className="bg-pl-purple sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <NavLink to="/" className="text-white font-bold text-lg flex items-center gap-2">
          ⚽ <span>EPL Stats</span>
        </NavLink>
        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={linkClass}>{l.label}</NavLink>)}
        </div>
        {/* Mobile */}
        <button className="md:hidden text-white" onClick={() => setOpen(o => !o)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-pl-purple border-t border-pl-purple-light px-4 py-3 flex flex-col gap-3">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={linkClass} onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
