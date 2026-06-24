import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import logo from '../assets/she-logo.webp'

export default function Navbar() {
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

          <motion.button
            whileHover={{
              scale: 1.03,
              y: -1,
            }}
            whileTap={{
              scale: 0.97,
            }}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 md:px-8 py-3 rounded-2xl text-sm md:text-base font-bold shadow-[0_10px_30px_rgba(236,72,153,0.28)]"
          >
            Comprar
          </motion.button>

        </div>
      </div>
    </motion.nav>
  )
}