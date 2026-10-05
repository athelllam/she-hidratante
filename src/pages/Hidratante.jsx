import { AnimatePresence, motion, useMotionValue, useScroll, useTransform, useSpring } from 'framer-motion'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { buildYampiCheckoutUrl } from '../utils/affiliateTracking'
import hero from '../assets/hidratante/hero.webp'
import smoke from '../assets/hidratante/smoke.webp'
import oleoCoco from '../assets/ingredientes/oleo-coco.webp'
import murumuru from '../assets/ingredientes/murumuru.webp'
import acidoHialuronico from '../assets/ingredientes/acido-hialuronico.webp'
import colageno from '../assets/ingredientes/colageno.webp'
import vitaminaE from '../assets/ingredientes/vitamina-e.webp'
import renataVideo from '../assets/videos/renata.mp4'
import blister from '../assets/hidratante/blister.webp'
import video2 from '../assets/videos/video2.mp4'
import scrollVideo from '../assets/videos/0930.mp4'
import scrollVideoPoster from '../assets/videos/scroll-video-poster.webp'
import logo from '../assets/she-logo.webp'
import amazonLogo from '../assets/amazon-logo.webp'
import comparisonBefore from '../assets/hidratante/before.webp'
import comparisonAfter from '../assets/hidratante/after.webp'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import canalHid from '../assets/hidratante/canal_hid.webp'
import canalNoHid from '../assets/hidratante/canal_nohid.webp'
import cartHidratante from '../assets/cart/hidratante.webp'
import sheLogo from '../assets/she-logo.webp'
import cartBlister from '../assets/cart/blister.webp'
import cartStick from '../assets/cart/stick-clareador.webp'
import cartPocket from '../assets/cart/pocket-size.webp'

import cliente01 from '../assets/clientes/cliente-01.webp'
import cliente02 from '../assets/clientes/cliente-02.webp'
import cliente03 from '../assets/clientes/cliente-03.webp'
import cliente04 from '../assets/clientes/cliente-04.webp'
import cliente05 from '../assets/clientes/cliente-05.webp'
import cliente06 from '../assets/clientes/cliente-06.webp'
import cliente07 from '../assets/clientes/cliente-07.webp'
import cliente08 from '../assets/clientes/cliente-08.webp'
import cliente09 from '../assets/clientes/cliente-09.webp'
import cliente10 from '../assets/clientes/cliente-10.webp'
import cliente11 from '../assets/clientes/cliente-11.webp'
import cliente12 from '../assets/clientes/cliente-12.webp'
import cliente13 from '../assets/clientes/cliente-13.webp'
import cliente14 from '../assets/clientes/cliente-14.webp'
import cliente15 from '../assets/clientes/cliente-15.webp'
import cliente16 from '../assets/clientes/cliente-16.webp'
import cliente17 from '../assets/clientes/cliente-17.webp'
import cliente18 from '../assets/clientes/cliente-18.webp'
import cliente19 from '../assets/clientes/cliente-19.webp'
import cliente20 from '../assets/clientes/cliente-20.webp'
import cliente21 from '../assets/clientes/cliente-21.webp'
import cliente22 from '../assets/clientes/cliente-22.webp'

const clienteFotos = [
  cliente01, cliente02, cliente03, cliente04, cliente05, cliente06,
  cliente07, cliente08, cliente09, cliente10, cliente11, cliente12,
  cliente13, cliente14, cliente15, cliente16, cliente17, cliente18,
  cliente19, cliente20, cliente21, cliente22,
]

function IngredientCard({ image, index, scrollXProgress, total, scrollResetKey }) {
  const [isZoomed, setIsZoomed] = useState(false)
  useEffect(() => {
    setIsZoomed(false)
  }, [scrollResetKey])
  const zoom = useSpring(isZoomed ? 1 : 0, {
    stiffness: 150,
    damping: 24,
    mass: 0.8,
  })
  const activeIndex = useTransform(
    scrollXProgress,
    [0, 1],
    [0, total - 1]
  )

  const baseScale = useTransform(activeIndex, (value) => {
    const distance = Math.abs(value - index)
    return Math.max(0.78, 1 - distance * 0.14)
  })

  const scale = useTransform([baseScale, zoom], ([base, zoomed]) =>
    base * (1 + zoomed * 0.24)
  )

  const opacity = useTransform(activeIndex, (value) => {
    const distance = Math.abs(value - index)
    return Math.max(0.72, 1 - distance * 0.08)
  })

  const y = useTransform(activeIndex, (value) => {
    const distance = Math.abs(value - index)
    return Math.min(18, distance * 12)
  })

  return (
    <motion.div
      style={{
        scale,
        opacity,
        y,
        zIndex: isZoomed ? 30 : 1,
      }}
      className="w-[56vw] max-w-[340px] md:w-[28vw] md:max-w-[400px] flex-shrink-0 snap-center select-none overflow-visible"
    >
      <motion.div
        onClick={() => setIsZoomed((value) => !value)}
        animate={{ scale: isZoomed ? 1.32 : 1 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="relative cursor-pointer select-none origin-center"
        title="Clique para ampliar"
      >
        <img
          src={image}
          alt=""
          draggable="false"
          className="w-full rounded-[40px] shadow-[0_30px_80px_rgba(0,0,0,0.08)] select-none pointer-events-none"
        />
      </motion.div>
    </motion.div>
  )
}



  const useViewportCenterIntensity = (ref) => {
    const [intensity, setIntensity] = useState(0)

    useEffect(() => {
      let frame = null

      const update = () => {
        frame = null
        const node = ref.current
        if (!node) return

        const rect = node.getBoundingClientRect()
        const elementCenter = rect.top + rect.height / 2
        const viewportCenter = window.innerHeight / 2
        const distance = Math.abs(elementCenter - viewportCenter)

        // Full effect at viewport center, fading out over 42% of viewport height.
        const fadeDistance = window.innerHeight * 0.42
        const next = Math.max(0, Math.min(1, 1 - distance / fadeDistance))

        setIntensity(prev => Math.abs(prev - next) < 0.015 ? prev : next)
      }

      const requestUpdate = () => {
        if (frame === null) frame = window.requestAnimationFrame(update)
      }

      requestUpdate()
      window.addEventListener('scroll', requestUpdate, { passive: true })
      window.addEventListener('resize', requestUpdate)

      return () => {
        window.removeEventListener('scroll', requestUpdate)
        window.removeEventListener('resize', requestUpdate)
        if (frame !== null) window.cancelAnimationFrame(frame)
      }
    }, [ref])

    return intensity
  }

function MucosaComparison({ onEnter }) {
  const [position, setPosition] = useState(50)
  const [comparisonInView, setComparisonInView] = useState(false)
  const ref = useRef(null)
  const dragging = useRef(false)
  const sectionRef = useRef(null)
  const comparisonIntensity = useViewportCenterIntensity(sectionRef)

  useEffect(() => {
    const node = sectionRef.current
    if (!node || !onEnter) return

    const observer = new IntersectionObserver(([entry]) => {
      setComparisonInView(entry.isIntersecting)

      if (entry.isIntersecting && onEnter) {
        onEnter()
      }
    }, { threshold: 0.12 })

    observer.observe(node)
    return () => observer.disconnect()
  }, [onEnter])

  const updateFromClientX = (clientX) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return

    const next = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.max(0, Math.min(100, next)))
  }

  const stopDragging = () => {
    dragging.current = false
  }

  return (
    <section ref={sectionRef} className="px-5 md:px-10 pt-7 pb-12 md:pt-10 md:pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">

          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight text-black">
            Veja a diferença.
          </h2>
              <div className="mt-4 text-[11px] md:text-xs tracking-[0.35em] text-zinc-500 uppercase">
            HIDRATAÇÃO PROFUNDA
          </div>

        </div>

        <div
          ref={ref}
          className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[32px] shadow-[0_30px_90px_rgba(0,0,0,0.10)] select-none"
          style={{ touchAction: 'pan-y' }}
        >
          {/* DEPOIS: imagem base, sempre visível à direita */}
          <img
            src={canalHid}
            alt="Depois — mucosa hidratada"
            draggable="false"
            className="block w-full h-auto"
          />

          {/* ANTES: imagem inteira na mesma escala; somente o recorte muda */}
          <img
            src={canalNoHid}
            alt="Antes — mucosa"
            draggable="false"
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          />

          {/* Divisor: só muda o ponto de corte */}
          <div
            className="absolute inset-y-0 z-20 w-[2px] -translate-x-1/2 bg-white shadow-[0_0_14px_rgba(0,0,0,0.25)]"
            style={{ left: `${position}%` }}
          >
            <button
              type="button"
              aria-label="Arraste para comparar antes e depois"
              onPointerDown={(event) => {
                event.preventDefault()
                dragging.current = true
                event.currentTarget.setPointerCapture?.(event.pointerId)
                updateFromClientX(event.clientX)
              }}
              onPointerMove={(event) => {
                if (dragging.current) {
                  updateFromClientX(event.clientX)
                }
              }}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_30px_rgba(0,0,0,0.16)] cursor-ew-resize"
              style={{ touchAction: 'none' }}
            >
              ↔
            </button>
          </div>

          {/* Rótulos fixos: ANTES esquerda / DEPOIS direita */}
          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-between px-5 md:px-8">
            <span className="rounded-full bg-white/90 px-5 py-2 text-[10px] md:text-xs font-medium tracking-[0.28em] uppercase text-black shadow-sm">
              Antes
            </span>

            <span className="rounded-full bg-white/90 px-5 py-2 text-[10px] md:text-xs font-medium tracking-[0.28em] uppercase text-black shadow-sm">
              Depois
            </span>
          </div>
        </div>

        <p
          className="mt-5 text-center tracking-[0.32em] uppercase"
          style={{
            color: `rgb(${161 + Math.round(83 * comparisonIntensity)}, ${161 - Math.round(84 * comparisonIntensity)}, ${161 + Math.round(4 * comparisonIntensity)})`,
            fontSize: `calc(${10 + 3 * comparisonIntensity}px)`,
            transition: 'color 120ms linear, font-size 120ms linear',
          }}
        >
          Arraste para comparar
        </p>
      </div>
    </section>
  )
}


function IngredientCards() {
  const carouselRef = useRef(null)
  const [scrollResetKey, setScrollResetKey] = useState(0)

  const { scrollXProgress } = useScroll({
    container: carouselRef,
  })

  const cards = [
    acidoHialuronico,
    murumuru,
    oleoCoco,
    colageno,
    vitaminaE,
  ]

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return

    const centerCard = () => {
      const cards = el.children
      const target = cards[2]
      if (!target) return

      const left = target.offsetLeft - (el.clientWidth - target.clientWidth) / 2
      el.scrollLeft = left
    }

    const frame = requestAnimationFrame(() => {
      const previousSnap = el.style.scrollSnapType
      el.style.scrollSnapType = 'none'
      centerCard()
      requestAnimationFrame(() => { el.style.scrollSnapType = previousSnap })
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="relative mt-7 md:mt-10">
      <div
        ref={carouselRef}
        onScroll={() => setScrollResetKey((value) => value + 1)}
        className="flex gap-3 md:gap-5 overflow-x-auto overflow-y-hidden py-6 md:py-8 snap-x snap-proximity overscroll-x-contain scrollbar-hide"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'auto',
          scrollBehavior: 'auto',
          paddingLeft: 'calc(50% - min(28vw, 170px))',
          paddingRight: 'calc(50% - min(28vw, 170px))',
        }}
      >
        {cards.map((image, index) => (
          <IngredientCard
            key={index}
            image={image}
            index={index}
            scrollXProgress={scrollXProgress}
            total={cards.length}
            scrollResetKey={scrollResetKey}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-28 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-28 bg-gradient-to-l from-white to-transparent" />
    </div>
  )
}


function BeforeAfterComparison() {
  const [position, setPosition] = useState(50)
  const [dragging, setDragging] = useState(false)
  const [comparisonInView, setComparisonInView] = useState(false)
  const comparisonRef = useRef(null)
  const comparisonIntensity = useViewportCenterIntensity(comparisonRef)

  useEffect(() => {
    const node = comparisonRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => setComparisonInView(entry.isIntersecting),
      { threshold: 0.12 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const updatePosition = (clientX) => {
    const rect = comparisonRef.current?.getBoundingClientRect()
    if (!rect) return

    const next = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, next)))
  }

  const handlePointerDown = (event) => {
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    updatePosition(event.clientX)
  }

  const handlePointerMove = (event) => {
    if (!dragging) return
    updatePosition(event.clientX)
  }

  const handlePointerUp = (event) => {
    setDragging(false)
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    } catch {
      // Pointer capture may already have been released by the browser.
    }
  }

  return (
    <section className="bg-white px-6 pt-12 pb-20 md:pt-20 md:pb-28">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[11px] md:text-xs tracking-[0.35em] uppercase text-zinc-400">
            ANTI INFLAMATÓRIO E FUNGICIDA NATURAL
          </p>
        </div>

        <div
          ref={comparisonRef}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-[2.5rem] bg-zinc-100 shadow-[0_30px_80px_rgba(0,0,0,0.12)] select-none"
          style={{ touchAction: 'pan-y' }}
          role="slider"
          aria-label="Comparador antes e depois"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          tabIndex={0}
        >
          {/* DEPOIS — imagem inteira fixa por baixo */}
          <img
            src={comparisonAfter}
            alt="Depois"
            draggable="false"
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />

          {/* ANTES — imagem inteira na mesma escala da imagem de depois; somente o recorte muda */}
          <img
            src={comparisonBefore}
            alt="Antes"
            draggable="false"
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          />

          {/* DIVISOR + CONTROLE */}
          <div
            className="absolute inset-y-0 z-20 w-[3px] bg-white shadow-[0_0_18px_rgba(0,0,0,0.28)] pointer-events-none"
            style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
          >
            <button
              type="button"
              aria-label="Arraste para comparar antes e depois"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="pointer-events-auto absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.22)] cursor-ew-resize"
              style={{ touchAction: 'none' }}
            >
              <span className="text-lg font-semibold text-zinc-900" aria-hidden="true">↔</span>
            </button>
          </div>
        </div>

        <p
          className="mt-5 text-center font-medium uppercase tracking-[0.28em]"
          style={{
            color: `rgb(${161 + Math.round(83 * comparisonIntensity)}, ${161 - Math.round(84 * comparisonIntensity)}, ${161 + Math.round(4 * comparisonIntensity)})`,
            fontSize: `calc(${12 + 3 * comparisonIntensity}px)`,
            transition: 'color 120ms linear, font-size 120ms linear',
          }}
        >
          Arraste para comparar
        </p>
      </div>
    </section>
  )
}

function VideoCover({ children, onPlay, ariaLabel, source }) {
  const [ready, setReady] = useState(false)
  const coverVideoRef = useRef(null)

  useEffect(() => {
    const video = coverVideoRef.current
    if (!video) return

    const showFirstFrame = () => setReady(true)
    video.addEventListener('loadeddata', showFirstFrame)
    video.addEventListener('canplay', showFirstFrame)

    return () => {
      video.removeEventListener('loadeddata', showFirstFrame)
      video.removeEventListener('canplay', showFirstFrame)
    }
  }, [])

  return (
    <div className="absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
      <video
        ref={coverVideoRef}
        playsInline
        preload="metadata"
        className={`absolute inset-0 w-full h-full object-cover scale-[1.015] blur-[3px] transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        <source src={source} type="video/mp4" />
      </video>

      <button
        type="button"
        onClick={onPlay}
        className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center cursor-pointer"
        aria-label={ariaLabel}
      >
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative px-8 py-5 md:px-12 md:py-7">
            <div className="absolute inset-y-1/2 -translate-y-1/2 -inset-x-12 bg-gradient-to-r from-transparent via-white/90 to-transparent blur-xl" />
            <div className="absolute inset-y-1/2 -translate-y-1/2 -inset-x-6 bg-gradient-to-r from-transparent via-white/65 to-transparent blur-md" />
            <div className="relative">
              {children}
            </div>
          </div>

          <span className="mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white shadow-[0_0_30px_rgba(255,255,255,0.85),0_12px_35px_rgba(0,0,0,0.28)] transition-transform duration-300 hover:scale-110 active:scale-95">
            <span className="block ml-1 text-[22px] leading-none" aria-hidden="true">▶</span>
          </span>
        </div>
      </button>
    </div>
  )
}


function formatBRL(value) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function QuantityControl({ quantity, onMinus, onPlus }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onMinus}
        aria-label="Diminuir quantidade"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-base font-bold text-zinc-800 transition hover:bg-zinc-200 active:scale-95"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-bold text-zinc-900">{quantity}</span>
      <button
        type="button"
        onClick={onPlus}
        aria-label="Aumentar quantidade"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-base font-bold text-zinc-800 transition hover:bg-zinc-200 active:scale-95"
      >
        +
      </button>
    </div>
  )
}

function CartProduct({ image, name, description, price, oldPrice, quantity, onMinus, onPlus }) {
  return (
    <div className="group rounded-[24px] border border-pink-100 bg-white p-3.5 shadow-[0_12px_35px_rgba(236,72,153,0.07)] transition-all duration-300 hover:border-pink-200 hover:shadow-[0_16px_42px_rgba(236,72,153,0.11)]">
      <div className="flex items-center gap-3">
        <div className="relative flex h-[86px] w-[86px] shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-[#fff4f8] to-[#fffafb] ring-1 ring-pink-100">
          <img src={image} alt={name} className="h-full w-full object-contain p-2 scale-[1.20]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-zinc-950">{name}</p>
              {description && (
                <p className="mt-0.5 text-[9px] leading-3 text-zinc-400">{description}</p>
              )}
            </div>
            {oldPrice && (
              <span className="shrink-0 rounded-full bg-pink-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-pink-600 ring-1 ring-pink-100">
                Oferta
              </span>
            )}
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            {oldPrice && (
              <span className="text-xs font-medium text-zinc-400 line-through decoration-zinc-400">
                {formatBRL(oldPrice)}
              </span>
            )}
            <span className="text-[17px] font-black tracking-tight text-pink-600">
              {formatBRL(price)}
            </span>
          </div>

          <div className="mt-2">
            <QuantityControl
              quantity={quantity}
              onMinus={onMinus}
              onPlus={onPlus}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SheCart({ open, onClose, affiliateId = null }) {
  const [hydrantQty, setHydrantQty] = useState(1)
  const [blisterQty, setBlisterQty] = useState(1)
  const [bumps, setBumps] = useState({
    hydrant: false,
    stick: false,
    pocket: false,
  })
  const [showFreeShippingToast, setShowFreeShippingToast] = useState(false)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  const bumpItems = [
    {
      key: 'hydrant',
      token: '6G99ZYJTDE',
      name: 'Hidratante 100ml +1',
      description: 'Hidrata profundamente a região íntima',
      oldPrice: 139.90,
      price: 97.90,
      image: cartHidratante,
    },
    {
      key: 'stick',
      token: 'IWK5ZWCEUO',
      name: 'Stick Clareador de Pele',
      description: 'Para escurecimento, manchas, melasma, cicatrizes',
      oldPrice: 149.90,
      price: 97.90,
      image: cartStick,
    },
    {
      key: 'pocket',
      token: 'ORM1LRMTT5',
      name: 'Pocket Size 15ml',
      description: 'Leve para qualquer lugar e fique hidratada sempre',
      price: 16.90,
      image: cartPocket,
    },
  ]

  const toggleBump = (key) => {
    setBumps((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  

  const buildCheckoutUrl = () => {
    const products = []

    if (hydrantQty > 0) products.push(`EFH0YOIDTO:${hydrantQty}`)
    if (blisterQty > 0) products.push(`7B6B7IL4ZM:${blisterQty}`)
    if (bumps.hydrant) products.push('6G99ZYJTDE:1')
    if (bumps.stick) products.push('IWK5ZWCEUO:1')
    if (bumps.pocket) products.push('ORM1LRMTT5:1')

    return buildYampiCheckoutUrl({ tokens: products, affiliateId })
  }

  const total =
    hydrantQty * 119.90 +
    blisterQty * 18.90 +
    (bumps.hydrant ? 97.90 : 0) +
    (bumps.stick ? 97.90 : 0) +
    (bumps.pocket ? 16.90 : 0)

  const hasProducts =
    hydrantQty > 0 ||
    blisterQty > 0 ||
    Object.values(bumps).some(Boolean)

  const hasFreeShipping = total > 200

  useEffect(() => {
    if (!hasFreeShipping) {
      setShowFreeShippingToast(false)
      return
    }

    setShowFreeShippingToast(true)
    const timeout = window.setTimeout(() => {
      setShowFreeShippingToast(false)
    }, 2600)

    return () => window.clearTimeout(timeout)
  }, [hasFreeShipping])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999]">
          <motion.button
            type="button"
            aria-label="Fechar carrinho"
            onClick={onClose}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="absolute right-0 top-0 h-full w-full max-w-[500px] overflow-y-auto bg-[#fffafc] shadow-[-20px_0_70px_rgba(0,0,0,0.18)]"
          >
            <AnimatePresence>
              {showFreeShippingToast && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="pointer-events-none fixed left-1/2 top-1/2 z-[10010] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-emerald-200 bg-white/95 px-5 py-3 text-sm font-black text-emerald-600 shadow-[0_18px_55px_rgba(16,185,129,0.20)] backdrop-blur-md"
                >
                  🚚 GANHOU FRETE GRÁTIS
                </motion.div>
              )}
            </AnimatePresence>

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-5 py-5 backdrop-blur-md">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-pink-500">SHE</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">
                  Seu carrinho
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-xl text-zinc-700 transition hover:bg-zinc-200 active:scale-95"
              >
                ×
              </button>
            </div>

            <div className="px-4 pb-8 pt-5 sm:px-5">
              <div className="space-y-3">
                <CartProduct
                    image={cartHidratante}
                    name="Hidratante Íntimo She"
                    description="Hidrata profundamente a região íntima"
                    oldPrice={139.90}
                    price={119.90}
                    quantity={hydrantQty}
                    onMinus={() => setHydrantQty((q) => Math.max(1, q - 1))}
                    onPlus={() => setHydrantQty((q) => q + 1)}
                  />

                <CartProduct
                    image={cartBlister}
                    name="Blister She"
                    description="Faça seus próprios ovinhos em casa"
                    price={18.90}
                    quantity={blisterQty}
                    onMinus={() => setBlisterQty((q) => Math.max(0, q - 1))}
                    onPlus={() => setBlisterQty((q) => q + 1)}
                  />
              </div>

              <div className="mt-7">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-pink-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-pink-600">
                    Ofertas especiais
                  </span>
                  <span className="h-px flex-1 bg-pink-100" />
                </div>
                <h3 className="mt-2 text-xl font-black tracking-tight text-zinc-950">
                  Aproveite e adicione
                </h3>
                <p className="mt-1 text-xs text-zinc-500">Condições exclusivas para o seu pedido.</p>

                <div className="mt-3 space-y-3">
                  {bumpItems.map((item) => {
                    const active = bumps[item.key]

                    return (
                      <motion.div
                        key={item.key}
                        layout
                        className={`flex items-center gap-3 rounded-[22px] border p-3.5 transition-all duration-300 ${
                          active
                            ? 'border-amber-300 bg-amber-50 shadow-[0_8px_30px_rgba(245,158,11,0.18)]'
                            : 'border-zinc-200 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.04)]'
                        }`}
                      >
                        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#fff7fa]">
                          <img
                            src={item.image}
                            alt={item.name}
                            className={`h-full w-full object-contain p-1.5 ${item.key === 'pocket' ? 'scale-[1.7]' : 'scale-[1.20]'}`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-tight text-zinc-950">
                            {item.name}
                          </p>
                           {item.description && (
                             <p className="mt-0.5 text-[9px] leading-3 text-zinc-400">
                               {item.description}
                             </p>
                           )}

                          {item.oldPrice && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-pink-600">
                                Oferta
                              </span>

                              {(item.key === 'hydrant' || item.key === 'stick') && (
                                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.04em] text-emerald-600 ring-1 ring-emerald-100">
                                  <span className="text-[9px] leading-none">🚚</span> Frete grátis
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              {item.oldPrice && (
                                <span className="text-[11px] font-medium text-zinc-400 line-through">
                                  {formatBRL(item.oldPrice)}
                                </span>
                              )}
                              <span className="text-[16px] font-black tracking-tight text-pink-600">
                                {formatBRL(item.price)}
                              </span>
                            </div>

                            <motion.button
                              type="button"
                              onClick={() => toggleBump(item.key)}
                              whileTap={{ scale: 0.94 }}
                              animate={active ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                              transition={active ? { duration: 0.45 } : { duration: 0.2 }}
                              className={`relative shrink-0 overflow-hidden rounded-full px-3.5 py-2.5 text-[11px] font-black transition-all duration-500 ${
                                active
                                  ? 'bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 text-white shadow-[0_0_24px_rgba(245,158,11,0.65)]'
                                  : 'bg-black text-white hover:bg-zinc-800'
                              }`}
                            >
                              {active && (
                                <motion.span
                                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent"
                                  initial={{ x: '-120%' }}
                                  animate={{ x: '120%' }}
                                  transition={{ duration: 0.7, ease: 'easeInOut' }}
                                />
                              )}
                              <span className="relative whitespace-nowrap">
                                {active ? 'Adicionado ✓' : 'Adicionar'}
                              </span>
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-8 border-t border-zinc-200 pt-5">
                <AnimatePresence initial={false}>
                  {hasFreeShipping && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: 4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -4 }}
                      transition={{ duration: 0.3 }}
                      className="mb-4 overflow-hidden"
                    >
                      <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-emerald-600">
                        <span className="text-sm">🚚</span>
                        <span>Ganhou frete grátis</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mb-4 flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-[0.04em] text-zinc-400">
                  <span>ACUMULE</span>
                  <span className="font-black text-green-800">{formatBRL(total * 0.10)}</span>
                  <span>EM CASHBACK</span>
                </div>

                <div className="flex items-end justify-between">
                  <span className="text-sm text-zinc-500">Total</span>
                  <span className="text-2xl font-black text-zinc-950">
                    {formatBRL(total)}
                  </span>
                </div>

                <motion.button
                  type="button"
                  disabled={!hasProducts}
                  whileTap={hasProducts ? { scale: 0.985 } : undefined}
                  onClick={async () => {
                    if (hasProducts) {
                                        window.location.href = buildCheckoutUrl()
                    }
                  }}
                  className="mt-5 w-full rounded-full bg-black px-6 py-4 text-sm font-black text-white shadow-[0_15px_35px_rgba(0,0,0,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.22)] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
                >
                  Finalizar compra
                </motion.button>

                <p className="mt-3 text-center text-[10px] leading-4 text-zinc-400">
                  Para comprar muitas unidades, entre em contato com a gente{' '}
                  <a
                    href="https://wa.me/553132784332"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-500 transition-colors"
                  >
                    clicando aqui!
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="w-3 h-3 shrink-0 text-[#25D366]"
                      fill="currentColor"
                    >
                      <path d="M20.5 3.5A11.9 11.9 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.15 1.6 5.96L.02 24l6.25-1.64a11.88 11.88 0 0 0 5.77 1.48h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.19-1.24-6.19-3.48-8.41ZM12.05 21.7h-.01a9.77 9.77 0 0 1-4.98-1.37l-.36-.21-3.71.97.99-3.61-.23-.37a9.75 9.75 0 0 1-1.5-5.18C2.25 6.53 6.65 2.3 12.05 2.3a9.63 9.63 0 0 1 6.84 2.84 9.65 9.65 0 0 1 2.84 6.87c0 5.36-4.36 9.69-9.68 9.69Zm5.33-7.27c-.29-.15-1.72-.85-1.99-.95-.27-.1-.46-.15-.66.15-.2.29-.76.95-.93 1.14-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.47-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.58-.9-2.16-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.29-1.02.99-1.02 2.42s1.05 2.81 1.19 3.01c.15.2 2.06 3.15 4.99 4.42.7.3 1.24.48 1.66.61.7.22 1.34.19 1.84.12.56-.08 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.56-.34Z" />
                    </svg>
                  </a>
                </p>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}


function ScrollDrivenIntroVideo() {
  const sectionRef = useRef(null)
  const videoRef = useRef(null)

  // idle -> primeira interação
  // playing -> abertura automática do vídeo
  // autoScrolling -> vídeo terminou e a página está indo para o Hero
  // scroll -> controle normal do vídeo pelo scroll
  const phaseRef = useRef('idle')
  const autoScrollFrameRef = useRef(null)
  const appliedTimeRef = useRef(-1)
  const durationRef = useRef(0)

  useEffect(() => {
    const section = sectionRef.current
    const video = videoRef.current
    if (!section || !video) return

    const getProgress = () => {
      const sectionTop = section.offsetTop

      // Ponto exato em que queremos "entregar" o vídeo ao scroll na volta:
      // quando a base da seção/vídeo está aproximadamente no primeiro quarto da viewport.
      // Assim, no momento em que esse ponto aparece na tela, o próximo pixel
      // de scroll para cima já começa a retroceder o vídeo.
      const triggerOffset = window.innerHeight * 0.25
      const scrollRange = Math.max(1, section.offsetHeight - triggerOffset)
      const relativeScroll = window.scrollY - sectionTop

      return Math.min(1, Math.max(0, relativeScroll / scrollRange))
    }

    const applyScrollTime = () => {
      if (phaseRef.current !== 'scroll') return

      const duration = durationRef.current || video.duration
      if (!Number.isFinite(duration) || duration <= 0) return

      const progress = getProgress()
      const target = progress * Math.max(0, duration - 0.001)

      if (Math.abs(target - appliedTimeRef.current) < 0.006) return

      try {
        video.pause()
        video.currentTime = target
        appliedTimeRef.current = target
      } catch {
        // Tenta novamente no próximo evento de scroll.
      }
    }

    let lastScrollY = window.scrollY

    const requestScrollFrame = () => {
      if (phaseRef.current !== 'scroll') return
      window.requestAnimationFrame(applyScrollTime)
    }

    const finishAutoScroll = () => {
      if (phaseRef.current !== 'autoScrolling') return

      const target = section.offsetTop + section.offsetHeight
      const distance = Math.abs(window.scrollY - target)

      if (distance <= 2) {
        // IMPORTANTE:
        // Não recalcula o vídeo a partir do scroll durante a transição.
        // Mantém o último frame exatamente no final e só depois libera o scroll.
        try {
          video.pause()
          const duration = durationRef.current || video.duration
          if (Number.isFinite(duration) && duration > 0) {
            const finalTime = Math.max(0, duration - 0.001)
            video.currentTime = finalTime
            appliedTimeRef.current = finalTime
          }
        } catch {}

        phaseRef.current = 'scroll'
        lastScrollY = window.scrollY

        // Libera o controle de scroll somente depois que o scroll automático
        // realmente chegou ao destino.
        requestAnimationFrame(() => {
          if (phaseRef.current === 'scroll') {
            applyScrollTime()
          }
        })

        return
      }

      autoScrollFrameRef.current = window.requestAnimationFrame(finishAutoScroll)
    }

    const scrollToHero = () => {
      if (phaseRef.current !== 'playing') return

      // Congela o vídeo no último frame antes de iniciar o movimento da página.
      try {
        video.pause()
        const duration = durationRef.current || video.duration
        if (Number.isFinite(duration) && duration > 0) {
          const finalTime = Math.max(0, duration - 0.001)
          video.currentTime = finalTime
          appliedTimeRef.current = finalTime
        }
      } catch {}

      phaseRef.current = 'autoScrolling'

      const target = section.offsetTop + section.offsetHeight

      window.scrollTo({
        top: target,
        behavior: 'smooth',
      })

      autoScrollFrameRef.current = window.requestAnimationFrame(finishAutoScroll)
    }

    const startExperience = (event) => {
      if (phaseRef.current !== 'idle') return

      if (event?.cancelable) {
        event.preventDefault()
      }

      phaseRef.current = 'playing'

      try {
        video.currentTime = 0
        video.playbackRate = 2.4
      } catch {}

      const playPromise = video.play()

      if (playPromise?.catch) {
        playPromise.catch(() => {
          requestAnimationFrame(() => {
            video.play().catch(() => {})
          })
        })
      }
    }

    const handleWheel = (event) => {
      if (phaseRef.current === 'idle') {
        startExperience(event)
      }
    }

    const handleTouchStart = (event) => {
      if (phaseRef.current === 'idle') {
        startExperience(event)
      }
    }

    const handlePointerDown = (event) => {
      if (event.pointerType !== 'touch' && phaseRef.current === 'idle') {
        startExperience(event)
      }
    }

    const handleScroll = () => {
      const currentY = window.scrollY
      const direction = currentY - lastScrollY
      lastScrollY = currentY

      // Durante o auto-scroll, NÃO toca no currentTime.
      // Isso elimina a "balançada" / pequena rebobinada no final.
      if (phaseRef.current === 'autoScrolling') {
        return
      }

      if (phaseRef.current === 'scroll') {
        if (Math.abs(direction) < 1) return
        requestScrollFrame()
      }
    }

    const handleMetadata = () => {
      durationRef.current = Number.isFinite(video.duration) ? video.duration : 0

      if (phaseRef.current === 'idle') {
        try {
          video.pause()
          video.currentTime = 0
        } catch {}
      }
    }

    const handleEnded = () => {
      if (phaseRef.current === 'playing') {
        scrollToHero()
      }
    }

    video.addEventListener('loadedmetadata', handleMetadata)
    video.addEventListener('durationchange', handleMetadata)
    video.addEventListener('ended', handleEnded)

    window.addEventListener('scroll', handleScroll, { passive: true })
    section.addEventListener('wheel', handleWheel, { passive: false })
    section.addEventListener('touchstart', handleTouchStart, { passive: false })
    section.addEventListener('pointerdown', handlePointerDown, { passive: false })

    video.load()

    return () => {
      video.removeEventListener('loadedmetadata', handleMetadata)
      video.removeEventListener('durationchange', handleMetadata)
      video.removeEventListener('ended', handleEnded)

      window.removeEventListener('scroll', handleScroll)
      section.removeEventListener('wheel', handleWheel)
      section.removeEventListener('touchstart', handleTouchStart)
      section.removeEventListener('pointerdown', handlePointerDown)

      if (autoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current)
      }
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative h-[220vh] bg-black"
      aria-label="Apresentação She"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={scrollVideo}
          poster={scrollVideoPoster}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          className="h-full w-full object-cover"
          aria-hidden="true"
        />
      </div>
    </section>
  )
}

export default function Hidratante({ affiliateId = null, affiliate = null }) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const [comparisonReached, setComparisonReached] = useState(false)
  const [visitorName, setVisitorName] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [ingredientSectionInView, setIngredientSectionInView] = useState(false)
  const ingredientSectionRef = useRef(null)
  const ingredientSectionIntensity = useViewportCenterIntensity(ingredientSectionRef)

  useEffect(() => {
    const node = ingredientSectionRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => setIngredientSectionInView(entry.isIntersecting),
      { threshold: 0.12 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const savedName = localStorage.getItem('sheVisitorName')
    if (savedName) setVisitorName(savedName)
  }, [])

  const videoRef = useRef(null)
  const [videoStarted, setVideoStarted] = useState(false)
  const secondVideoRef = useRef(null)
  const [secondVideoStarted, setSecondVideoStarted] = useState(false)

  const handleVideoPlay = () => {
    setVideoStarted(true)
  }

  const handleCoverPlay = async () => {
    try {
      await videoRef.current?.play()
    } catch (error) {
      // O navegador pode bloquear a reprodução; os controles nativos continuam disponíveis.
    }
  }

  const handleSecondVideoPlay = () => {
    setSecondVideoStarted(true)
  }

  const handleSecondCoverPlay = async () => {
    try {
      await secondVideoRef.current?.play()
    } catch (error) {
      // O navegador pode bloquear a reprodução; os controles nativos continuam disponíveis.
    }
  }


  return (
    <div className="bg-[#fffafc]">
      

      
<Navbar compact={comparisonReached} onBuy={() => setCartOpen(true)} />

      <ScrollDrivenIntroVideo />

      {/* HERO */}
      <section className="min-h-[90vh] flex items-center px-6 md:px-12 pt-20 pb-8 md:pt-28 md:pb-12">

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-5 items-center">

          {/* TEXTO */}
          <motion.div className="order-2 lg:order-1"
            initial={{
              opacity: 0,
              y: 40,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 1,
            }}
          >

            <p className="uppercase tracking-[0.4em] text-pink-500 text-sm font-semibold mb-2">
              HIDRATANTE ÍNTIMO SHE
            </p>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] mb-6">
              Hidrata.
              <br />
              <span className="text-pink-500">Nutre.</span>
              <br />
              Protege.
              <br />
              <span className="text-pink-500">Regenera.</span>
            </h1>

            <p className="text-zinc-600 text-xl leading-relaxed max-w-xl">
              Desenvolvido para proporcionar hidratação,
              conforto e bem-estar na rotina de cuidados íntimos.
            </p>



          </motion.div>

          {/* IMAGEM */}
          <motion.div
  className="order-1 lg:order-2 relative"
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 1.2,
            }}
            
          >

            <div className="absolute inset-0 bg-pink-300/30 blur-[80px] rounded-full"></div>

            <motion.img
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              src={hero}
              alt="Hidratante Íntimo She"
              className="relative z-2 rounded-[3rem] shadow-[0_30px_80px_rgba(0,0,0,0.15)]"
              
            />

          </motion.div>

        </div>

      </section>

      {/* SECTION 2 */}

<section className="px-6 pt-8 pb-20 md:pt-12 md:pb-32">

  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ duration: 1 }}
    viewport={{ once: true }}
    className="max-w-7xl mx-auto"
  >
    <div>
      <p className="uppercase tracking-[0.4em] text-pink-500 text-sm font-semibold mb-2 text-center">
        AGORA 1,5X MAIS CONCENTRADO
      </p>
      <div className="overflow-hidden rounded-[3rem] shadow-[0_30px_80px_rgba(0,0,0,0.12)]">
        <img
          src={smoke}
          alt="Hidratante Íntimo She"
          className="w-full"
        />
      </div>
    </div>
  </motion.div>

</section>

<section className="pb-10 md:pb-16 px-6">

  <div className="max-w-5xl mx-auto text-center">

    <motion.h2
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="text-5xl md:text-8xl font-black leading-[0.95] mb-8"
    >
      Mais que
      <br />
      hidratação.
    </motion.h2>

    <motion.p
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.8 }}
      viewport={{ once: true }}
      className="text-xl md:text-3xl text-zinc-600 leading-relaxed"
    >
      Desenvolvido para mulheres que valorizam conforto,
      bem-estar e uma rotina de autocuidado sofisticada.
    </motion.p>

  </div>

</section>

<section
  ref={ingredientSectionRef}
  className="pt-14 pb-20 md:pt-20 md:pb-24 bg-white"
>

  <div className="text-center">

    <p className="uppercase tracking-[0.4em] text-pink-500 text-sm font-semibold mb-6">
      FÓRMULA PREMIUM
    </p>

     <h2 className="text-[2.5rem] md:text-5xl font-black leading-[0.95]">
      Ingredientes selecionados.
    </h2>

  </div>

  <IngredientCards />

  <p
    className="mt-1 text-center tracking-[0.35em] uppercase"
    style={{
      color: `rgb(${161 + Math.round(83 * ingredientSectionIntensity)}, ${161 - Math.round(84 * ingredientSectionIntensity)}, ${161 + Math.round(4 * ingredientSectionIntensity)})`,
      fontSize: `calc(${11 + 3 * ingredientSectionIntensity}px)`,
      transition: 'color 120ms linear, font-size 120ms linear',
    }}
  >
    Role para os lados
  </p>

</section>

<section className="bg-white px-6 pt-2 pb-20 md:pt-4 md:pb-28">
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
    viewport={{ once: true, amount: 0.35 }}
    className="max-w-4xl mx-auto text-center"
  >
    <p className="text-xl md:text-3xl text-zinc-600 leading-relaxed font-medium">
      Os componentes da She promovem a hidratação profunda, duradoura.
      <br className="hidden md:block" />{' '}
      Auxiliando na lubrificação natural da mucosa vaginal.
    </p>

    <div className="mt-7">
      <button
  type="button"
  onClick={() => setCartOpen(true)}
  className="inline-flex items-center justify-center rounded-full bg-black px-7 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(0,0,0,0.16)] active:scale-[0.98]"
>
  Comprar
</button>
    </div>
  </motion.div>
</section>

<MucosaComparison onEnter={() => setComparisonReached(true)} />

      <BeforeAfterComparison />

      <div className="mt-16 md:mt-20 w-full overflow-hidden select-none" aria-label="Avaliações de clientes">
      <div className="text-center px-4">
        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-zinc-950">
          Milhares de clientes satisfeitas
        </h2>

        <div className="mt-4 flex items-center justify-center gap-3" aria-label="Nota 5.0 de 5 na Amazon">
          <span className="text-[#f5b301] text-xl md:text-2xl tracking-[0.12em]" aria-hidden="true">★★★★★</span>
          <span className="text-sm md:text-base font-semibold text-zinc-700">5.0</span>
          <span className="mx-1 h-5 w-px bg-zinc-200" aria-hidden="true" />
          <img src={amazonLogo} alt="Amazon" className="w-[76px] md:w-[88px] h-auto object-contain" />
        </div>
      </div>

      <div className="relative mt-8 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 md:w-24 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 md:w-24 bg-gradient-to-l from-white to-transparent" />

        <div
          className="flex w-max gap-3 md:gap-5"
          style={{ animation: 'she-clientes-marquee 52s linear infinite' }}
        >
          <div className="flex shrink-0 gap-3 md:gap-5">
            {clienteFotos.map((image, index) => (
              <div
                key={`cliente-a-${index}`}
                className="w-[145px] md:w-[190px] shrink-0 overflow-hidden rounded-[22px] md:rounded-[28px] bg-zinc-100 shadow-[0_14px_40px_rgba(0,0,0,0.08)]"
              >
                <img
                  src={image}
                  alt="Cliente She"
                  draggable="false"
                  className="block h-[205px] md:h-[270px] w-full object-cover select-none pointer-events-none"
                />
              </div>
            ))}
          </div>

          <div className="flex shrink-0 gap-3 md:gap-5" aria-hidden="true">
            {clienteFotos.map((image, index) => (
              <div
                key={`cliente-b-${index}`}
                className="w-[145px] md:w-[190px] shrink-0 overflow-hidden rounded-[22px] md:rounded-[28px] bg-zinc-100 shadow-[0_14px_40px_rgba(0,0,0,0.08)]"
              >
                <img
                  src={image}
                  alt=""
                  draggable="false"
                  className="block h-[205px] md:h-[270px] w-full object-cover select-none pointer-events-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <style>{`
      @keyframes she-clientes-marquee {
        from { transform: translate3d(0, 0, 0); }
        to { transform: translate3d(-50%, 0, 0); }
      }
    `}</style>

        <div className="mt-12 md:mt-16 mx-auto max-w-3xl px-5 md:px-8 text-center">
          <div className="relative rounded-[2rem] border border-zinc-200/70 bg-[#fffdfb] px-7 py-9 md:px-12 md:py-11 shadow-[0_18px_50px_rgba(0,0,0,0.045)]">
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-serif text-6xl leading-none text-pink-300" aria-hidden="true">“</span>

            <p
              className="font-serif text-[19px] md:text-[23px] leading-[1.65] text-zinc-700 italic"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              “Eu sentia muita secura e dor nas relações, descobri na She um hidratante íntimo que em apenas 2 semanas de uso já recuperou toda minha lubrificação. Agora consigo ter relações tranquila novamente. Super indico e aprovado!”
            </p>

            <div className="mt-7">
              <div className="mx-auto mb-3 h-px w-10 bg-zinc-300" />
              <p
                className="font-serif text-sm md:text-base tracking-[0.08em] text-zinc-500"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                - Letícia Soares
              </p>
            </div>
          </div>
        </div>


      <section className="bg-white px-6 pt-8 pb-12 md:pt-10 md:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="inline-flex items-center justify-center rounded-full bg-black px-8 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(0,0,0,0.16)] active:scale-[0.98]"
          >
            Comprar
          </button>
        </div>
      </section>


<section className="bg-white py-2 md:py-4 px-6">

  <div className="max-w-5xl mx-auto flex flex-col gap-10 items-center">

    {/* VIDEO */}

    

    {/* TEXTO */}

    <motion.div
      initial={{
        opacity: 0,
        x: 40,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        duration: 0.8,
      }}
      viewport={{
        once: true,
      }}
    >

      <p className="uppercase tracking-[0.4em] text-pink-500 text-sm font-semibold mb-6">
        DESENVOLVIDO POR GINECOLOGISTA
      </p>

      <h2 className="text-4xl md:text-6xl font-black leading-[0.95] mb-8">

        Na She, você tem os cuidados de uma médica nas palmas de suas mãos.

      </h2>

      <div className="mt-12 md:mt-16 mx-auto max-w-3xl px-5 md:px-8 text-center">
        <div className="relative rounded-[2rem] border border-zinc-200/70 bg-[#fffdfb] px-7 py-9 md:px-12 md:py-11 shadow-[0_18px_50px_rgba(0,0,0,0.045)]">
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-serif text-6xl leading-none text-pink-300" aria-hidden="true">“</span>

          <p
            className="font-serif text-[19px] md:text-[23px] leading-[1.65] text-zinc-700 italic"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            “Como desenvolver um cuidado íntimo que fosse agradável de usar, confortável no dia a dia e compatível com a delicadeza da região íntima?”
          </p>

          <div className="mt-7">
            <div className="mx-auto mb-3 h-px w-10 bg-zinc-300" />
            <p
              className="font-serif text-sm md:text-base tracking-[0.08em] text-zinc-500"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              - Dra. Renata Alves Moreira
            </p>
            <p
              className="font-serif text-sm md:text-base tracking-[0.08em] text-zinc-500"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Médica Ginecologista
            </p>
            <p
              className="font-serif text-sm md:text-base tracking-[0.08em] text-zinc-500"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              CRM 62968
            </p>
          </div>
        </div>
      </div>

    </motion.div>

      <motion.div
      initial={{
        opacity: 0,
        x: -40,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        duration: 0.8,
      }}
      viewport={{
        once: true,
      }}
    >

      <div className="relative overflow-hidden rounded-[3rem] shadow-[0_30px_80px_rgba(0,0,0,0.08)] aspect-[9/16] max-w-[450px] mx-auto bg-white">

        <video
          ref={videoRef}
          playsInline
          controls
          preload="none"
          onPlay={handleVideoPlay}
          className="w-full h-full object-cover"
        >
          <source
            src={renataVideo}
            type="video/mp4"
          />
        </video>

        {!videoStarted && (
          <VideoCover
              source={renataVideo}
            onPlay={handleCoverPlay}
            ariaLabel="Aperte o Play para assistir ao vídeo"
          >
            <span className="block text-black text-2xl md:text-3xl font-black leading-tight max-w-[330px]" style={{ textShadow: '0 0 5px rgba(255,255,255,0.98), 0 0 14px rgba(255,255,255,0.9)' }}>
              Descubra como a She pode te ajudar.
            </span>
            <span className="block mt-4 text-black text-sm md:text-base font-semibold tracking-wide" style={{ textShadow: '0 0 4px rgba(255,255,255,0.98), 0 0 12px rgba(255,255,255,0.9)' }}>
              Aperte o Play!
            </span>
          </VideoCover>
        )}

      </div>

    </motion.div>


  </div>

</section>

<section className="bg-white pt-32 pb-8 md:pt-40 md:pb-8 px-6">

  <div className="max-w-5xl mx-auto text-center">

    <p className="uppercase tracking-[0.35em] text-pink-500 text-sm font-semibold mb-6">
      TECNOLOGIA SHE
    </p>

    <h2 className="text-5xl md:text-7xl font-black leading-[0.95]">

      Fácil, prático
      <br />
      e tecnológico.

    </h2>

    <motion.img
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      src={blister}
      alt="Blister She"
      className="w-full max-w-xl mx-auto my-20"
    />

    <h3 className="text-4xl md:text-6xl font-black leading-tight">

      Crie seus próprios
      <br />
      óvulos íntimos.

    </h3>

    <p className="text-2xl md:text-3xl text-zinc-500 mt-4">

      Em casa.

    </p>

    <div className="mt-8">
      <button
  type="button"
  onClick={() => setCartOpen(true)}
  className="inline-flex items-center justify-center rounded-full bg-black px-7 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(0,0,0,0.16)] active:scale-[0.98]"
>
  Comprar
</button>
    </div>

  </div>

</section>

<section className="bg-white pt-0 md:pt-2 pb-24 px-6">

  <div className="max-w-4xl mx-auto text-center">

    <div className="relative overflow-hidden rounded-[3rem] shadow-[0_30px_80px_rgba(0,0,0,0.08)] aspect-[9/16] max-w-[450px] mx-auto bg-white">

      <video
        ref={secondVideoRef}
        playsInline
        controls
        preload="none"
        onPlay={handleSecondVideoPlay}
        className="w-full h-full object-cover"
      >
        <source
          src={video2}
          type="video/mp4"
        />
      </video>

      {!secondVideoStarted && (
        <VideoCover
          source={video2}
          onPlay={handleSecondCoverPlay}
          ariaLabel="Aperte o Play para assistir ao vídeo de como usar"
        >
          <span className="block text-black text-sm md:text-base font-semibold tracking-[0.35em] uppercase" style={{ textShadow: '0 0 4px rgba(255,255,255,0.98), 0 0 12px rgba(255,255,255,0.9)' }}>
            COMO USAR
          </span>
          <span className="block mt-4 text-black text-4xl md:text-6xl font-black leading-tight" style={{ textShadow: '0 0 5px rgba(255,255,255,0.98), 0 0 14px rgba(255,255,255,0.9)' }}>
            Assista.
          </span>
        </VideoCover>
      )}    </div>

    <div className="mt-16 md:mt-20 flex justify-center px-8" aria-hidden="true">
      <div className="w-full max-w-[280px] h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.18) 18%, #111 50%, rgba(0,0,0,0.18) 82%, transparent 100%)' }} />
    </div>

    <div className="mt-10 max-w-2xl mx-auto text-center px-2">
      <p className="text-base md:text-lg leading-7 md:leading-8 text-zinc-600">
        {visitorName ? `${visitorName}, ` : ''}se você chegou até aqui, é porque provavelmente está vivendo algum desconforto ou buscando uma forma melhor de cuidar da sua intimidade — e nós podemos te ajudar. A She foi desenvolvida de mulher para mulher, de médica para paciente. Deixe a She cuidar do seu íntimo, enquanto você cuida do que realmente importa: aproveitar a vida.
      </p>

      <a
        href="https://wa.me/553132784332?text=Ol%C3%A1!%20Eu%20quero%20conhecer%20a%20She."
        target="_blank"
        rel="noreferrer"
        className="mt-7 inline-flex items-center justify-center rounded-full bg-black px-9 py-4 text-base font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_35px_rgba(0,0,0,0.18)] active:scale-[0.98]"
      >
        Eu quero!
      </a>
    </div>

  </div>

</section>

      <SheCart open={cartOpen} onClose={() => setCartOpen(false)} affiliateId={affiliateId} />

      <footer className="relative overflow-hidden bg-[#0b0b0d] text-white px-6 pt-16 pb-8 md:pt-24 md:pb-10">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[340px] rounded-full blur-[100px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at top, #3A1835 0%, #170D16 42%, rgba(9,8,10,0) 78%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-[1.2fr_1fr_1fr_1fr] gap-x-8 gap-y-12 md:gap-16">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="inline-block">
                <motion.img whileHover={{ scale: 1.02 }} src={logo} alt="She" className="w-36 md:w-44 brightness-0 invert opacity-95" />
              </Link>
              <p className="mt-6 max-w-sm text-sm leading-6 text-white/55">Cuidado íntimo, conforto e bem-estar para fazer parte da sua rotina.</p>
              <p className="mt-6 text-xs tracking-[0.18em] uppercase text-white/35">CNPJ 51.327.547/0001-37</p>
              <p className="mt-1 text-xs tracking-[0.18em] uppercase text-white/35">SHE COISA DE MULHER LTDA</p>
            </div>
            <div>
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-pink-300">Navegue</p>
              <nav className="mt-5 flex flex-col gap-3 text-sm text-white/70">
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
                <a href="https://wa.me/553132784332" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Contato</a>
                <a href="#sobre" className="hover:text-white transition-colors">Sobre</a>
                <a href="#trabalhe-conosco" className="hover:text-white transition-colors">Trabalhe Conosco</a>
              </nav>
            </div>
            <div className="col-span-1 md:col-span-1">
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-pink-300">Legal</p>
              <nav className="mt-5 flex flex-col gap-3 text-sm text-white/70">
                <Link to="/politica-de-privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link>
                <Link to="/termos-de-uso" className="hover:text-white transition-colors">Termos de Uso</Link>
              </nav>
            </div>

            <div className="col-span-1 md:col-span-1">
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-pink-300">Nossas Redes</p>
              <nav className="mt-5 flex flex-col gap-4 text-sm text-white/70">
                <a
                  href="https://www.instagram.com/she.coisademulher/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 hover:text-white transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="w-5 h-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                  <span>she.coisademulher</span>
                </a>

                <a
                  href="https://wa.me/553132784332"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 hover:text-white transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="w-5 h-5 shrink-0 text-[#25D366]"
                    fill="currentColor"
                  >
                    <path d="M20.5 3.5A11.9 11.9 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.15 1.6 5.96L.02 24l6.25-1.64a11.88 11.88 0 0 0 5.77 1.48h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.19-1.24-6.19-3.48-8.41ZM12.05 21.7h-.01a9.77 9.77 0 0 1-4.98-1.37l-.36-.21-3.71.97.99-3.61-.23-.37a9.75 9.75 0 0 1-1.5-5.18C2.25 6.53 6.65 2.3 12.05 2.3a9.63 9.63 0 0 1 6.84 2.84 9.65 9.65 0 0 1 2.84 6.87c0 5.36-4.36 9.69-9.68 9.69Zm5.33-7.27c-.29-.15-1.72-.85-1.99-.95-.27-.1-.46-.15-.66.15-.2.29-.76.95-.93 1.14-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.47-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.58-.9-2.16-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.29-1.02.99-1.02 2.42s1.05 2.81 1.19 3.01c.15.2 2.06 3.15 4.99 4.42.7.3 1.24.48 1.66.61.7.22 1.34.19 1.84.12.56-.08 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.2-.56-.34Z" />
                  </svg>
                  <span>Fale com a gente!</span>
                </a>
              </nav>
            </div>
          </div>
          <div className="mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-white/35">
            <span>© {new Date().getFullYear()} She. Todos os direitos reservados.</span>
            <span>She Coisa de Mulher</span>
          </div>
        </div>
      </footer>

    </div>
  )
}