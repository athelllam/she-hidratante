import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

import logo from '../assets/she-logo.webp'

export default function Navbar() {
  const [hasReachedTenPercent, setHasReachedTenPercent] = useState(false)

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

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[88%] max-w-5xl"
    >
      <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[1.5rem] px-4 md:px-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">

          <Link to="/">
            <motion.img
              whileHover={{ scale: 1.02 }}
              src={logo}
              alt="She"
              className="w-32 md:w-40 opacity-90"
            />
          </Link>

          <div className="relative min-w-[128px] md:min-w-[150px] h-[46px] md:h-[48px] flex items-center justify-center">
            <motion.div
              style={{ opacity: welcomeOpacity, scale: welcomeScale, filter: welcomeBlur }}
              className="absolute inset-0 flex items-center justify-center text-black text-sm md:text-base font-bold whitespace-nowrap"
            >
              Bem vinda!
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              initial={false}
              animate={{
                opacity: buttonOpacity,
                scale: buttonScale,
                y: buttonY,
                filter: buttonBlur,
              }}
              transition={{
                opacity: { duration: 0.9, ease: 'easeOut' },
                scale: { duration: 0.9, ease: 'easeOut' },
                y: { duration: 0.9, ease: 'easeOut' },
                filter: { duration: 0.9, ease: 'easeOut' },
              }}
              className="relative isolate overflow-hidden text-black px-6 md:px-8 py-3 rounded-2xl text-sm md:text-base font-bold shadow-[0_10px_30px_rgba(236,72,153,0.28)] bg-[#f472b6]"
            >
              {hasReachedTenPercent && (
                <>
                  {/* Bolhas pequenas e independentes: surgem, aquecem e esfriam em pontos diferentes. */}
                  {[
                    { size: 48, x: ['8%', '28%', '6%', '42%', '12%'], y: ['20%', '4%', '42%', '12%', '20%'], colors: ['#f9a8d4', '#ec4899', '#ef4444', '#f9a8d4', '#f9a8d4'], duration: 2.4, delay: -0.6 },
                    { size: 54, x: ['34%', '14%', '48%', '24%', '34%'], y: ['58%', '34%', '8%', '48%', '58%'], colors: ['#f472b6', '#db2777', '#ef4444', '#f9a8d4', '#f472b6'], duration: 2.8, delay: -1.7 },
                    { size: 44, x: ['58%', '42%', '70%', '50%', '58%'], y: ['14%', '46%', '26%', '54%', '14%'], colors: ['#fbcfe8', '#ec4899', '#f43f5e', '#f9a8d4', '#fbcfe8'], duration: 2.2, delay: -1.1 },
                    { size: 50, x: ['76%', '58%', '88%', '68%', '76%'], y: ['56%', '24%', '44%', '12%', '56%'], colors: ['#f9a8d4', '#f43f5e', '#dc2626', '#db2777', '#f9a8d4'], duration: 2.7, delay: -2.1 },
                    { size: 42, x: ['20%', '46%', '30%', '8%', '20%'], y: ['70%', '54%', '26%', '48%', '70%'], colors: ['#fbcfe8', '#ec4899', '#ef4444', '#db2777', '#fbcfe8'], duration: 2.3, delay: -0.3 },
                    { size: 46, x: ['52%', '78%', '60%', '86%', '52%'], y: ['74%', '38%', '10%', '62%', '74%'], colors: ['#fda4af', '#db2777', '#ef4444', '#f9a8d4', '#fda4af'], duration: 2.9, delay: -2.5 },
                    { size: 40, x: ['4%', '24%', '12%', '36%', '4%'], y: ['46%', '72%', '58%', '18%', '46%'], colors: ['#fbcfe8', '#ec4899', '#dc2626', '#db2777', '#fbcfe8'], duration: 2.1, delay: -1.4 },
                    { size: 46, x: ['92%', '72%', '96%', '82%', '92%'], y: ['22%', '48%', '10%', '62%', '22%'], colors: ['#f9a8d4', '#ec4899', '#ef4444', '#fda4af', '#f9a8d4'], duration: 2.5, delay: -1.9 },
                    { size: 50, x: ['86%', '66%', '96%', '74%', '86%'], y: ['78%', '58%', '34%', '16%', '78%'], colors: ['#fbcfe8', '#db2777', '#dc2626', '#f9a8d4', '#fbcfe8'], duration: 2.6, delay: -0.9 },
                    { size: 44, x: ['64%', '88%', '76%', '96%', '64%'], y: ['84%', '70%', '46%', '28%', '84%'], colors: ['#f9a8d4', '#ec4899', '#ef4444', '#db2777', '#f9a8d4'], duration: 2.4, delay: -2.7 },
                  ].map((bubble, index) => (
                    <motion.span
                      key={index}
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        width: bubble.size,
                        height: bubble.size,
                        left: 0,
                        top: 0,
                        marginLeft: `calc(${bubble.x[0]} - ${bubble.size / 2}px)`,
                        marginTop: `calc(${bubble.y[0]} - ${bubble.size / 2}px)`,
                        filter: 'blur(7px)',
                      }}
                      animate={{
                        left: bubble.x,
                        top: bubble.y,
                        scale: [0.55, 1.05, 0.72, 1.12, 0.55],
                        opacity: [0.2, 0.95, 0.58, 0.88, 0.2],
                        backgroundColor: bubble.colors,
                      }}
                      transition={{
                        duration: bubble.duration,
                        repeat: Infinity,
                        repeatType: 'mirror',
                        ease: 'easeInOut',
                        delay: bubble.delay,
                      }}
                    />
                  ))}
                  <span className="absolute inset-0 rounded-2xl bg-white/5 pointer-events-none" />
                </>
              )}
              <span className="relative z-10">Comprar</span>
            </motion.button>
          </div>

        </div>
      </div>
    </motion.nav>
  )
}