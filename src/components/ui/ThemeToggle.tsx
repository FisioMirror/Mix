import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.05 }}
      className="relative w-11 h-11 rounded-xl surface-elevated flex items-center justify-center overflow-hidden"
      aria-label="Cambiar tema"
    >
      <AnimatePresence mode="wait">
        {theme === 'light' ? (
          <motion.div key="sun" initial={{ y: -20, opacity: 0, rotate: -90 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 20, opacity: 0, rotate: 90 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
            <Sun className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
          </motion.div>
        ) : (
          <motion.div key="moon" initial={{ y: -20, opacity: 0, rotate: 90 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 20, opacity: 0, rotate: -90 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
            <Moon className="w-5 h-5 text-brand-400" strokeWidth={2.5} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
