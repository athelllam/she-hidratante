import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Lenis from '@studio-freight/lenis'

import hero from './assets/hero.webp'
import box from './assets/box.webp'
import towel from './assets/towel.webp'
import products from './assets/she-produtos-premium.webp'
import smoke from './assets/smoke.webp'
import logo from './assets/she-logo.webp'

export default function App() {

const [loading, setLoading] = useState(true)
const [openModal, setOpenModal] = useState(false)

const launchDate = new Date('2026-06-30T00:00:00').getTime()

const [timeLeft, setTimeLeft] = useState({
  dias: '00',
  horas: '00',
  minutos: '00',
  segundos: '00',
})

useEffect(() => {

  const interval = setInterval(() => {

    const now = new Date().getTime()

    const distance = launchDate - now

    if (distance < 0) {

      clearInterval(interval)

      setTimeLeft({
        dias: '00',
        horas: '00',
        minutos: '00',
        segundos: '00',
      })

      return

    }

    setTimeLeft({
      dias: String(
        Math.floor(distance / (1000 * 60 * 60 * 24))
      ).padStart(2, '0'),

      horas: String(
        Math.floor(
          (distance % (1000 * 60 * 60 * 24)) /
          (1000 * 60 * 60)
        )
      ).padStart(2, '0'),

      minutos: String(
        Math.floor(
          (distance % (1000 * 60 * 60)) /
          (1000 * 60)
        )
      ).padStart(2, '0'),

      segundos: String(
        Math.floor(
          (distance % (1000 * 60)) / 1000
        )
      ).padStart(2, '0'),
    })

  }, 1000)

  return () => clearInterval(interval)

}, [])


  /* SMOOTH SCROLL */
  useEffect(() => {

    const lenis = new Lenis({
      duration: 1,
      smoothWheel: true,
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

  }, [])

  /* LOADING */
  useEffect(() => {

    const timer = setTimeout(() => {
      setLoading(false)
    }, 1700)

    return () => clearTimeout(timer)

  }, [])

  return (

    <>
      {/* LOADING */}
      <AnimatePresence>

        {loading && (

          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="fixed inset-0 z-[9999] bg-[#fffafc] flex items-center justify-center overflow-hidden"
          >

            <div className="absolute w-[28rem] h-[28rem] bg-pink-300/20 blur-[80px] rounded-full"></div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                duration: 1,
              }}
              className="relative z-10 text-center"
            >

              <motion.img
                animate={{
                  y: [0, -4, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                src={logo}
                alt="She"
                className="w-52 md:w-72 mx-auto"
              />

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 180 }}
                transition={{
                  delay: 0.3,
                  duration: 1.2,
                }}
                className="h-[2px] bg-gradient-to-r from-pink-400 to-fuchsia-400 rounded-full mx-auto mt-8"
              />

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

      {/* SITE */}
      <div className="bg-[#fffafc] overflow-x-hidden text-zinc-900 relative">

        {/* PARTICLES */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">

          {Array.from({ length: 8 }).map((_, index) => (

            <motion.div
              key={index}
              animate={{
                y: [0, -80, 0],
                x: [0, 20, 0],
                opacity: [0.05, 0.15, 0.05],
              }}
              transition={{
                duration: 18 + index,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute rounded-full bg-pink-300/30 blur-xl"
              style={{
                width: `${18 + index * 2}px`,
                height: `${18 + index * 2}px`,
                left: `${(index * 11) % 100}%`,
                top: `${(index * 17) % 100}%`,
              }}
            />

          ))}

        </div>

        {/* BACKGROUND */}
        <div className="fixed top-[-10rem] left-[-10rem] w-[32rem] h-[32rem] bg-pink-300/15 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="fixed bottom-[-10rem] right-[-10rem] w-[32rem] h-[32rem] bg-rose-300/15 blur-[80px] rounded-full pointer-events-none"></div>

        {/* NAVBAR */}
        <motion.nav
          initial={{ y: -80 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[88%] max-w-5xl"
        >

          <div className="bg-white/50 backdrop-blur-md border border-white/40 rounded-[2rem] px-5 md:px-8 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">

            <div className="flex items-center justify-between">

              <motion.img
                whileHover={{
                  scale: 1.02,
                }}
                src={logo}
                alt="She"
                className="w-32 md:w-40 opacity-90"
              />

              <motion.button
                whileHover={{
                  scale: 1.03,
                  y: -1,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                onClick={() => setOpenModal(true)}
                className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 md:px-8 py-3 rounded-2xl text-sm md:text-base font-bold shadow-[0_10px_30px_rgba(236,72,153,0.28)]"
              >

                Lista VIP

              </motion.button>

            </div>

          </div>

        </motion.nav>

        {/* HERO */}
        <section className="relative min-h-[120vh] flex items-center px-5 md:px-10 py-32 overflow-hidden">

          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 md:gap-24 items-center relative z-10">

            {/* LEFT */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >

              {/* BADGE */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="inline-flex items-center gap-2 bg-white/55 backdrop-blur-md border border-pink-100 px-5 py-2 rounded-full shadow-lg mb-10"
              >

                <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></div>

                <span className="uppercase tracking-[0.2em] text-xs font-semibold text-pink-600">
                  SHE ESTÁ EVOLUINDO
                </span>

              </motion.div>

              {/* TITLE */}
              <motion.h1
                initial={{
                  opacity: 0,
                  y: 50,
                  filter: 'blur(4px)',
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                }}
                transition={{
                  duration: 1.1,
                }}
                viewport={{ once: true }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight mb-10"
              >

                O íntimo
                <br />

                <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 bg-clip-text text-transparent">
                  merece evolução.
                </span>

              </motion.h1>

              {/* SUBTITLE */}
              <motion.p
                initial={{
                  opacity: 0,
                  y: 20,
                  filter: 'blur(3px)',
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                }}
                transition={{
                  delay: 0.2,
                  duration: 1,
                }}
                viewport={{ once: true }}
                className="text-lg md:text-2xl text-zinc-600 leading-relaxed max-w-xl mb-12"
              >

                Uma nova fórmula.
                Novos produtos.
                Uma experiência completamente nova.

              </motion.p>

              {/* BUTTON */}
              <motion.button
                whileHover={{
                  scale: 1.02,
                  y: -1,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                onClick={() => setOpenModal(true)}
                className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-10 py-5 rounded-2xl text-lg font-bold shadow-[0_10px_40px_rgba(236,72,153,0.28)] mb-14"
              >

                Entrar na Lista VIP

              </motion.button>

              {/* WAITLIST */}
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.4,
                  duration: 0.8,
                }}
                viewport={{ once: true }}
                className="mb-10"
              >

                <div className="inline-flex items-center gap-3 bg-white/55 backdrop-blur-md border border-pink-100 px-5 py-4 rounded-2xl shadow-lg">

                  <div className="flex -space-x-3">

                    <div className="w-10 h-10 rounded-full bg-pink-300 border-2 border-white"></div>

                    <div className="w-10 h-10 rounded-full bg-rose-300 border-2 border-white"></div>

                    <div className="w-10 h-10 rounded-full bg-fuchsia-300 border-2 border-white"></div>

                  </div>

                  <div>

                    <p className="font-black text-lg text-zinc-900">
                      +2.184 mulheres
                    </p>

                    <p className="text-zinc-500 text-sm">
                      já entraram na VIP
                    </p>

                  </div>

                </div>

              </motion.div>

              {/* COUNTDOWN */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md">

           {[
              [timeLeft.dias || '00', 'Dias'],
              [timeLeft.horas || '00', 'Horas'],
              [timeLeft.minutos || '00', 'Min'],
              [timeLeft.segundos || '00', 'Seg'],
            ].map((item, index) => (

                  <motion.div
                    whileHover={{
                      y: -3,
                      scale: 1.02,
                    }}
                    key={index}
                    className="w-full aspect-square rounded-[1.6rem] bg-white/55 backdrop-blur-md border border-pink-100 shadow-xl flex flex-col items-center justify-center"
                  >

                    <div className="text-2xl md:text-4xl font-black text-pink-600">
                      {item[0]}
                    </div>

                    <div className="text-[10px] md:text-sm uppercase tracking-wider text-zinc-500 mt-1">
                      {item[1]}
                    </div>

                  </motion.div>

                ))}

              </div>

            </motion.div>

            {/* HERO IMAGE */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.92,
                y: 60,
              }}
              whileInView={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              transition={{
                duration: 1.2,
              }}
              viewport={{ once: true }}
              className="relative"
            >

              <div className="absolute inset-0 bg-gradient-to-r from-pink-300 to-rose-300 blur-[60px] opacity-30 rounded-full"></div>

              <motion.div
                animate={{
                  y: [0, -6, 0],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative z-10"
              >

                <img
                  src={hero}
                  alt="She"
                  loading="lazy"
                  className="rounded-[2.5rem] md:rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.14)] w-full h-[520px] md:h-[760px] object-cover"
                />

              </motion.div>

            </motion.div>

          </div>

        </section>

        {/* STORYTELLING */}
        <section className="relative py-32 px-5 md:px-10 overflow-hidden">

          <motion.div
            initial={{
              opacity: 0,
              y: 50,
              filter: 'blur(3px)',
            }}
            whileInView={{
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
            }}
            transition={{
              duration: 1,
            }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto text-center relative z-10"
          >

            <motion.p
              className="uppercase tracking-[0.5em] text-pink-500 text-xs md:text-sm font-semibold mb-8"
            >

              A NOVA ERA DA SHE

            </motion.p>

            <motion.h2
              className="text-5xl md:text-8xl font-black leading-[0.95] mb-14"
            >

              Mais do que
              <br />
              um produto.
              <br />

              <span className="bg-gradient-to-r from-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
                Uma experiência.
              </span>

            </motion.h2>

            <motion.p
              className="text-xl md:text-3xl text-zinc-600 leading-relaxed max-w-4xl mx-auto"
            >

              Estamos criando a versão mais sofisticada,
              tecnológica e premium da She já feita.

            </motion.p>

          </motion.div>

        </section>

        {/* CARDS */}
        <section className="py-24 md:py-32 px-5 md:px-10">

          <div className="max-w-7xl mx-auto">

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
              viewport={{ once: true }}
              className="text-center mb-24"
            >

              <p className="uppercase tracking-[0.5em] text-pink-500 text-xs md:text-sm font-semibold mb-8">
                O FUTURO DA SHE
              </p>

              <h2 className="text-5xl md:text-8xl font-black leading-[0.95]">

                Mais tecnologia.
                <br />
                Mais autoestima.
                <br />
                Mais She.

              </h2>

            </motion.div>

            <div className="grid md:grid-cols-3 gap-10">

              {[
                {
                  title: 'Nova Fórmula',
                  text: 'Uma composição premium desenvolvida para hidratação profunda e conforto absoluto.',
                  image: smoke,
                },

                {
                  title: 'Experiência Premium',
                  text: 'Uma experiência visual, sensorial e emocional totalmente reposicionada.',
                  image: box,
                },

                {
                  title: 'Novos Produtos',
                  text: 'Uma linha completa de bem-estar feminino premium está chegando.',
                  image: products,
                },

              ].map((card, index) => (

                <motion.div
                  key={index}
                  initial={{
                    opacity: 0,
                    y: 60,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  whileHover={{
                    y: -6,
                    scale: 1.01,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.15,
                  }}
                  viewport={{ once: true }}
                  className="group bg-white/55 backdrop-blur-md border border-pink-100 rounded-[2.3rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.06)]"
                >

                  <div className="overflow-hidden">

                    <img
                      src={card.image}
                      alt={card.title}
                      loading="lazy"
                      className="h-72 w-full object-cover group-hover:scale-[1.02] transition-transform duration-[1200ms]"
                    />

                  </div>

                  <div className="p-10">

                    <h3 className="text-3xl md:text-4xl font-black mb-5">
                      {card.title}
                    </h3>

                    <p className="text-zinc-600 text-lg leading-relaxed">
                      {card.text}
                    </p>

                  </div>

                </motion.div>

              ))}

            </div>

          </div>

        </section>

        {/* FINAL HERO */}
        <section className="relative py-32 md:py-48 overflow-hidden">

          <img
            src={towel}
            alt="She"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-black/55"></div>

          <motion.div
            initial={{
              opacity: 0,
              y: 60,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 1,
            }}
            viewport={{ once: true }}
            className="relative z-10 px-5 text-center text-white max-w-5xl mx-auto"
          >

            <h2 className="text-5xl md:text-8xl font-black leading-[0.9] mb-10">

              Algo muito maior
              <br />
              está chegando.

            </h2>

            <p className="text-lg md:text-2xl text-white/90 leading-relaxed mb-14 max-w-3xl mx-auto">

              Entre para a lista VIP e seja uma das primeiras pessoas a descobrir o futuro da She.

            </p>

            <motion.button
              whileHover={{
                scale: 1.02,
                y: -1,
              }}
              whileTap={{
                scale: 0.98,
              }}
              onClick={() => setOpenModal(true)}
              className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-10 py-5 rounded-2xl text-lg font-bold shadow-[0_10px_40px_rgba(236,72,153,0.28)]"
            >

              Entrar na Lista VIP

            </motion.button>

          </motion.div>

        </section>

        {/* FOOTER */}
        <footer className="relative bg-[#fff0f5] py-20 px-5 overflow-hidden">

          <div className="absolute top-[-5rem] left-1/2 -translate-x-1/2 w-[20rem] h-[20rem] bg-pink-300/20 blur-[50px] rounded-full"></div>

          <div className="relative z-10 max-w-7xl mx-auto text-center">

            <motion.img
              whileHover={{ scale: 1.02 }}
              src={logo}
              alt="She"
              className="w-52 md:w-64 mx-auto mb-8 opacity-95"
            />

            <p className="text-zinc-500 text-lg mb-4">
              A próxima geração da beleza íntima.
            </p>

            <p className="text-zinc-400 text-sm tracking-wide">
              SHE COISA DE MULHER LTDA
            </p>

            <p className="text-zinc-400 text-sm tracking-wide mt-1">
              CNPJ 51.327.547/0001-37
            </p>

          </div>

        </footer>

        {/* WHATSAPP */}
        <motion.a
          href="https://wa.me/553132784332?text=Olá!%20Quero%20saber%20mais%20sobre%20a%20She."
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-50"
          animate={{
            y: [0, -4, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >

          <div className="absolute inset-0 bg-green-400 blur-xl opacity-40 rounded-full"></div>

          <div className="relative bg-gradient-to-br from-green-400 to-green-500 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_10px_40px_rgba(34,197,94,0.35)] w-16 h-16 rounded-full flex items-center justify-center border border-white/20">

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              className="w-8 h-8 fill-white"
            >
              <path d="M19.11 17.39c-.29-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.91 1.13-.17.19-.34.22-.63.08-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.08-.15-.64-1.54-.88-2.11-.23-.56-.47-.48-.64-.49l-.54-.01c-.19 0-.48.07-.74.36-.26.29-1 1-.99 2.43 0 1.43 1.03 2.81 1.18 3 .14.19 2.03 3.1 4.92 4.35.69.3 1.23.48 1.65.61.69.22 1.31.19 1.8.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.25.17-1.36-.07-.12-.26-.19-.55-.34zM16 3C8.83 3 3 8.83 3 16c0 2.54.74 5 2.13 7.11L3 29l6.08-2c2.03 1.11 4.31 1.69 6.92 1.69 7.17 0 13-5.83 13-13S23.17 3 16 3z"/>
            </svg>

          </div>

        </motion.a>

        {/* MODAL */}
        <AnimatePresence>

          {openModal && (

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
            >

              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.95,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  y: 10,
                }}
                transition={{
                  duration: 0.25,
                }}
                className="relative w-full max-w-xl bg-white rounded-[2.2rem] p-8 md:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.12)] overflow-hidden"
              >

                <div className="absolute top-[-5rem] right-[-5rem] w-[12rem] h-[12rem] bg-pink-300/20 blur-[40px] rounded-full"></div>

                <button
                  onClick={() => setOpenModal(false)}
                  className="absolute top-5 right-5 w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-all"
                >

                  ✕

                </button>

                <div className="relative z-10">

                  <img
                    src={logo}
                    alt="She"
                    className="w-32 mx-auto mb-8"
                  />

                  <h2 className="text-4xl md:text-5xl font-black text-center leading-[0.95] mb-5">

                    Entre para
                    <br />

                    <span className="bg-gradient-to-r from-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
                      a Lista VIP
                    </span>

                  </h2>

                  <p className="text-zinc-600 text-center text-lg mb-10 leading-relaxed">

                    Seja uma das primeiras pessoas a descobrir a nova era da She.

                  </p>

                  <form
                    action="https://formspree.io/f/xojbvqnj"
                    method="POST"
                    className="space-y-5"
                  >

                    <input
                      type="text"
                      name="nome"
                      placeholder="Seu nome"
                      required
                      className="w-full h-16 rounded-2xl border border-pink-100 bg-[#fffafc] px-6 text-lg outline-none focus:border-pink-400 transition-all"
                    />

                    <input
                      type="email"
                      name="email"
                      placeholder="Seu melhor e-mail"
                      required
                      className="w-full h-16 rounded-2xl border border-pink-100 bg-[#fffafc] px-6 text-lg outline-none focus:border-pink-400 transition-all"
                    />

                    <input
                      type="tel"
                      name="telefone"
                      placeholder="WhatsApp"
                      required
                      className="w-full h-16 rounded-2xl border border-pink-100 bg-[#fffafc] px-6 text-lg outline-none focus:border-pink-400 transition-all"
                    />

                    <motion.button
                      whileHover={{
                        scale: 1.01,
                      }}
                      whileTap={{
                        scale: 0.98,
                      }}
                      type="submit"
                      className="w-full h-16 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-lg font-black shadow-[0_10px_40px_rgba(236,72,153,0.28)]"
                    >

                      Entrar na Lista VIP

                    </motion.button>

                  </form>

                </div>

              </motion.div>

            </motion.div>

          )}

        </AnimatePresence>

      </div>
    </>
  )
}