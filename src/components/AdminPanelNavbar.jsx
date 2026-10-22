import { useState } from 'react'

const Icon = ({ type }) => {
  const common = { viewBox: '0 0 24 24', className: 'h-4 w-4', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true }
  if (type === 'grid') return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  if (type === 'dre') return <svg {...common}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M7 8h10M7 12h4M7 16h7"/></svg>
  if (type === 'launch') return <svg {...common}><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></svg>
  if (type === 'traffic') return <svg {...common}><path d="M3 3v18h18M7 14l4-4 3 3 6-7"/></svg>
  if (type === 'products') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h8M8 12h5M8 16h8M17 11v5m-2.5-2.5h5"/></svg>
  if (type === 'admin') return <svg {...common}><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg>
  return <svg {...common}><path d="M3 7h18l-2 13H5L3 7Z"/><path d="M8 7a4 4 0 0 1 8 0"/></svg>
}

const menuItem = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zinc-700 no-underline transition hover:bg-pink-50 hover:text-pink-700 focus:bg-pink-50 focus:outline-none'

export default function AdminPanelNavbar({ currentPanel, onRefresh, refreshing = false, extraActions = null }) {
  const [open, setOpen] = useState(false)
  const links = [
    { href: '/admin', label: 'Painel de Afiliadas', icon: 'admin', key: 'admin' },
    { href: '/admin/produtos', label: 'Produtos e Upsell', icon: 'products', key: 'products' },
    { href: '/admin/trafego-pago', label: 'Meta Ads', icon: 'traffic', key: 'traffic' },
    { href: '/admin/negocio', label: 'Gestão do Negócio', icon: 'dre', key: 'business' },
  ].filter(item => item.key !== currentPanel)
  const internal = currentPanel === 'business'
    ? [{ href: '#negocio-indicadores', label: 'Indicadores', icon: 'grid' }, { href: '#negocio-dre', label: 'DRE', icon: 'dre' }, { href: '#negocio-lancamento', label: 'Lançamento', icon: 'launch' }]
    : currentPanel === 'traffic'
      ? [{ href: '#trafego-indicadores', label: 'Indicadores', icon: 'grid' }, { href: '#trafego-campanhas', label: 'Campanhas', icon: 'traffic' }]
      : []
  return <nav aria-label="Navegação do painel administrativo" className="sticky top-0 z-40 -mx-2 mb-6 rounded-2xl border border-white/70 bg-white/75 px-3 py-3 shadow-[0_8px_32px_rgba(236,72,153,.10)] backdrop-blur-xl md:mx-0 md:px-4">
    <div className="flex min-w-0 items-center gap-3">
      <a href={currentPanel === 'admin' ? '#admin-indicadores' : currentPanel === 'business' ? '#negocio-indicadores' : '#trafego-indicadores'} aria-label="SHE Painel - início" className="flex shrink-0 items-center gap-2 rounded-xl px-1 py-1 text-zinc-950 no-underline">
        <span className="text-xl font-black tracking-[-.09em]">SHE<span className="text-pink-500">.</span></span><span className="border-l border-pink-200 pl-2 text-[10px] font-black uppercase tracking-[.12em] text-zinc-500 sm:text-xs">PAINEL - {currentPanel === 'admin' ? 'AFILIADAS' : currentPanel === 'traffic' ? 'META ADS' : 'NEGÓCIO'}</span>
      </a>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <div className="relative">
          <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-2 rounded-xl border border-pink-200/80 bg-white/70 px-3 py-2.5 text-xs font-black text-zinc-700 shadow-sm transition hover:bg-pink-50 hover:text-pink-700"><span className="text-pink-500"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></span>Menu <span className={`text-pink-500 transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span></button>
          {open && <><button type="button" aria-label="Fechar menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)}/><div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-pink-100/90 bg-white/95 p-2 shadow-[0_16px_45px_rgba(30,10,20,.18)] backdrop-blur-xl">
            {internal.map(item => <a key={item.href} role="menuitem" href={item.href} onClick={() => setOpen(false)} className={menuItem}><span className="flex h-5 w-5 shrink-0 items-center justify-center text-pink-500"><Icon type={item.icon}/></span>{item.label}</a>)}
            {internal.length > 0 && <div className="my-1 h-px bg-pink-100"/>}
            {links.map(item => <a key={item.href} role="menuitem" href={item.href} onClick={() => setOpen(false)} className={menuItem}><span className="flex h-5 w-5 shrink-0 items-center justify-center text-pink-500"><Icon type={item.icon}/></span>{item.label}</a>)}
          </div></>}
        </div>
        {extraActions}
        {onRefresh && <button onClick={onRefresh} disabled={refreshing} className="shrink-0 rounded-xl bg-pink-500 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-pink-600 disabled:opacity-60 sm:text-sm">{refreshing ? 'Atualizando…' : 'Atualizar'}</button>}
      </div>
    </div>
  </nav>
}
