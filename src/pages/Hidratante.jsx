import { motion, useScroll, useTransform } from 'framer-motion'
import Navbar from '../components/Navbar'
import hero from '../assets/hidratante/hero.webp'
import smoke from '../assets/hidratante/smoke.webp'
import oleoCoco from '../assets/ingredientes/oleo-coco.webp'
import murumuru from '../assets/ingredientes/murumuru.webp'
import acidoHialuronico from '../assets/ingredientes/acido-hialuronico.webp'
import colageno from '../assets/ingredientes/colageno.webp'
import vitaminaE from '../assets/ingredientes/vitamina-e.webp'
import renataVideo from '../assets/videos/renata.mp4'
import { useEffect, useRef } from 'react'

function IngredientCards() {

  const targetRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"]
  })

  const x = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", "-400%"]
  )

  const cards = [
    oleoCoco,
    murumuru,
    acidoHialuronico,
    colageno,
    vitaminaE,
  ]

  return (

    <section
      ref={targetRef}
      className="relative h-[500vh]"
    >

      <div className="sticky top-0 h-screen overflow-hidden">

        <motion.div
          style={{ x }}
          className="flex h-full"
        >

          {cards.map((image, index) => (

            <div
              key={index}
              className="
                w-[100vw]
                h-screen
                flex-shrink-0
                flex
                items-center
                justify-center
                px-6
              "
            >

              <img
                src={image}
                alt=""
                className="
                  w-full
                  max-w-[500px]
                  rounded-[40px]
                  shadow-[0_30px_80px_rgba(0,0,0,0.08)]
                "
              />

            </div>

          ))}

        </motion.div>

      </div>

    </section>


  )
}

export default function Hidratante() {

  const videoRef = useRef(null)

useEffect(() => {
  if (videoRef.current) {
    videoRef.current.play().catch(() => {})
  }
}, [])

  return (
    <div className="bg-[#fffafc] pt-30">
      

      
<Navbar />

      {/* HERO */}
      <section className="min-h-screen flex items-center px-6 md:px-12">

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
              Nutre.
              <br />
              Protege.
              <br />
              Regenera.
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

<section className="px-6 py-20 md:py-32">

  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ duration: 1 }}
    viewport={{ once: true }}
    className="max-w-7xl mx-auto"
  >
    <img
      src={smoke}
      alt="Hidratante Íntimo She"
      className="w-full rounded-[3rem] shadow-[0_30px_80px_rgba(0,0,0,0.12)]"
    />
  </motion.div>

</section>

<section className="pb-24 md:pb-40 px-6">

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

<section className="py-32 bg-white">

  <div className="text-center">

    <p className="uppercase tracking-[0.4em] text-pink-500 text-sm font-semibold mb-6">
      FÓRMULA PREMIUM
    </p>

     <h2 className="text-[2.5rem] md:text-5xl font-black leading-[0.95]">
      Ingredientes selecionados.
    </h2>

  </div>

  <IngredientCards />

</section>

<section className="bg-white py-2 md:py-4 px-6">

  <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

    {/* VIDEO */}

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

      <div className="overflow-hidden rounded-[3rem] shadow-[0_30px_80px_rgba(0,0,0,0.08)] aspect-[9/16] max-w-[450px] mx-auto">

        <video
        ref={videoRef}
          autoPlay
          playsInline
          controls
          preload="auto"
          className="w-full h-full object-cover"
        >
          <source
            src={renataVideo}
            type="video/mp4"
          />
        </video>

      </div>

    </motion.div>

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

      <h2 className="text-5xl md:text-7xl font-black leading-[0.95] mb-8">

        Todo grande produto
        <br />
        começa com
        <br />
        uma pergunta.

      </h2>

      <p className="text-xl md:text-2xl text-zinc-600 leading-relaxed mb-10">

        Como desenvolver um cuidado íntimo
        que fosse agradável de usar,
        confortável no dia a dia e compatível
        com a delicadeza da região íntima?

      </p>

      <div>

        <p className="font-black text-2xl">

          Dra. Renata Alves Moreira

        </p>

        <p className="text-zinc-500 text-lg">

          Ginecologista

        </p>

      </div>

    </motion.div>

  </div>

</section>

    </div>
  )
}