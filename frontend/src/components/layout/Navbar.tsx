import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Matches', end: true },
  { to: '/players', label: 'Players', end: false },
  { to: '/predictions', label: 'Predictions', end: false },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="bg-black sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-6 h-[60px] flex items-center gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center flex-shrink-0 p-0.5">
            <img src="/logos/epl_icon.png" alt="EPL" className="w-full h-full object-contain" />
          </div>
          <span className="text-white font-bold text-sm uppercase tracking-widest hidden sm:block">
            Stats
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-7 flex-1">
          {navLinks.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `text-sm font-medium py-[19px] border-b-2 transition-colors ${
                  isActive
                    ? 'text-[#c8ff00] border-[#c8ff00]'
                    : 'text-[#999] border-transparent hover:text-white'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center ml-auto md:hidden">
          <button className="text-white" onClick={() => setOpen(o => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-black border-t border-[#1e1e1e] px-6 py-4 flex flex-col gap-1">
          {navLinks.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `py-3 text-sm font-medium border-b border-[#1a1a1a] last:border-0 ${
                  isActive ? 'text-[#c8ff00]' : 'text-[#999]'
                }`
              }
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
