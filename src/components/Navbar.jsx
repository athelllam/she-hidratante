import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

import logo from '../assets/she-logo.webp'

export default function Navbar({ compact = false, onBuy, buttonLabel = 'Comprar', productPrice = null, productOldPrice = null }) {
  const [hasReachedTenPercent, setHasReachedTenPercent] = useState(false)
  const [visitorName, setVisitorName] = useState('')

  useEffect(() => {
    const savedName = localStorage.getItem('sheVisitorName')
    if (savedName) setVisitorName(savedName)
  }, [])

  useEffect(() => {
    const checkScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0

      // Once 10% is reached, the state is permanent for this page visit.
      if (progress >= 0.1) {
        setHasReachedTenPercent(true)
      }
    }

    checkScroll()
    window.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)

    return () => {
      window.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [])

  const welcomeOpacity = hasReachedTenPercent ? 0 : 1
  const welcomeScale = hasReachedTenPercent ? 0.94 : 1
  const welcomeBlur = hasReachedTenPercent ? 'blur(6px)' : 'blur(0px)'

  const buttonOpacity = hasReachedTenPercent ? 1 : 0
  const buttonScale = hasReachedTenPercent ? 1 : 0.96
  const buttonY = hasReachedTenPercent ? 0 : 4
  const buttonBlur = hasReachedTenPercent ? 'blur(0px)' : 'blur(4px)'
  const buyButtonScale = compact ? 0.88 : 1
  // O conjunto (botão + preço) permanece centrado na barra; não deslocar quando compacto.
  const contentY = 0

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[88%] max-w-5xl"
    >
      <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[1.5rem] px-4 md:px-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">

          <Link to="/home">
            <motion.img
              whileHover={{ scale: 1.02 }}
              src={logo}
              alt="She"
              className="w-32 md:w-40 opacity-90"
            />
          </Link>

          <div className="relative min-w-[150px] md:min-w-[172px] h-[70px] md:h-[72px] flex items-center justify-center">
            <motion.div
              style={{ opacity: welcomeOpacity, scale: welcomeScale, filter: welcomeBlur }}
              className="absolute inset-0 flex items-center justify-center text-black text-sm md:text-base font-bold whitespace-nowrap"
            >
              {visitorName ? (
                <span className="flex flex-col items-center leading-tight">
                  <span>Bem vinda</span>
                  <span>{visitorName}!</span>
                </span>
              ) : (
                'Bem vinda!'
              )}
            </motion.div>

            <motion.div
              initial={false}
              animate={{
                opacity: buttonOpacity,
                scale: buttonScale,
                y: buttonY + contentY,
                filter: buttonBlur,
              }}
              transition={{
                opacity: { duration: 0.9, ease: 'easeOut' },
                scale: { duration: 0.9, ease: 'easeOut' },
                y: { duration: 0.9, ease: 'easeOut' },
                filter: { duration: 0.9, ease: 'easeOut' },
              }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
            <motion.button
              type="button"
              onClick={onBuy}
              whileHover={{
                scale: 1.03,
                y: -1,
              }}
              whileTap={{
                scale: 0.97,
              }}
              className="relative isolate overflow-hidden bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 md:px-8 py-2.5 rounded-2xl text-sm md:text-base font-bold shadow-[0_10px_30px_rgba(236,72,153,0.28)]"
            >
              <span className="relative z-10">{buttonLabel}</span>
            </motion.button>
            <motion.div
              initial={false}
              animate={{ opacity: hasReachedTenPercent && productPrice != null ? 1 : 0, y: hasReachedTenPercent && productPrice != null ? 0 : -4, height: hasReachedTenPercent && productPrice != null ? 'auto' : 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="mt-0.5 flex items-center justify-center gap-1.5 whitespace-nowrap text-[11px] md:text-[12px] leading-none font-medium tracking-wide overflow-hidden"
              aria-hidden={!(hasReachedTenPercent && productPrice != null)}
            >
              {productOldPrice != null && (
                <span className="text-zinc-500 line-through decoration-zinc-400">R${Number(productOldPrice).toFixed(2).replace('.', ',')}</span>
              )}
              <span className="font-semibold text-[#DB2777]">R${Number(productPrice).toFixed(2).replace('.', ',')}</span>
            </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </motion.nav>
  )
}