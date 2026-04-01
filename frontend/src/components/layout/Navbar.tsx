import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X, Tv } from 'lucide-react'

const links = [
  { to: '/standings', label: 'Standings' },
  { to: '/fixtures', label: 'Fixtures' },
  { to: '/players', label: 'Players' },
  { to: '/predictions', label: 'Predictions' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors px-1 py-4 border-b-2 ${
      isActive
        ? 'text-white border-white'
        : 'text-[#999] border-transparent hover:text-white'
    }`

  return (
    <nav className="bg-black sticky top-0 z-50 border-b border-[#1e1e1e]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded bg-white flex items-center justify-center">
            <span className="text-black font-black text-xs leading-none">EPL</span>
          </div>
          <span className="text-white font-bold text-sm hidden sm:block">EPL Stats</span>
        </NavLink>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-5 flex-1">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          <button className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-[#242424] transition-colors">
            <Tv size={12} />
            <span>TV</span>
          </button>
          <button className="text-xs font-medium text-[#999] hover:text-white transition-colors">Sign in</button>
          <button className="text-xs font-bold bg-white text-black px-3 py-1.5 rounded-full hover:bg-[#e5e5e5] transition-colors">
            Join
          </button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white" onClick={() => setOpen(o => !o)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-black border-t border-[#1e1e1e] px-4 py-3 flex flex-col gap-1">
          <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>Home</NavLink>
          {links.map(l => (
            <NavLink key={l.to} to={l.to} className={linkClass} onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
