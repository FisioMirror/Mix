import { motion } from 'framer-motion';

export function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-background overflow-hidden pointer-events-none"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Soft gradient background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(at 50% 40%, rgba(138,211,207,0.20) 0px, transparent 60%),
            radial-gradient(at 100% 100%, rgba(160,190,253,0.10) 0px, transparent 50%)
          `,
        }}
      />

      {/* Main content */}
      <main className="relative z-20 flex flex-col items-center justify-center min-h-screen p-6">
        <div className="relative flex flex-col items-center">
          {/* Logo as loader centerpiece — larger */}
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="glass-card rounded-full w-40 h-40 md:w-52 md:h-52 flex items-center justify-center shadow-ambient-teal breathe-teal overflow-hidden"
          >
            <img src="/logo.png" alt="FisioMirror" className="w-28 h-28 md:w-36 md:h-36 object-contain" />
          </motion.div>

          {/* Branding */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="font-display font-headline-lg text-headline-lg md:text-display-lg tracking-tight mb-3">
              <span className="gradient-text-editorial">FisioMirror</span>
            </h1>
            <div className="flex items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ scale: [0.6, 1, 0.6], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                  className="w-2.5 h-2.5 rounded-full bg-primary"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </motion.div>
  );
}
