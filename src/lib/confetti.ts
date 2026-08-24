import confetti from 'canvas-confetti';

const FISIO_COLORS = ['#00504d', '#156966', '#8ad3cf', '#14b8a6', '#fbbf24', '#34d399'];

export function celebrateSession() {
  const end = Date.now() + 1200;
  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: FISIO_COLORS,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: FISIO_COLORS,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export function celebrateToken() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: FISIO_COLORS,
    scalar: 0.9,
  });
}

export function celebrateStreak() {
  const duration = 1500;
  const end = Date.now() + duration;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 90,
      spread: 120,
      origin: { x: Math.random(), y: Math.random() },
      colors: FISIO_COLORS,
      scalar: 1.2,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export function celebrateAchievement() {
  confetti({
    particleCount: 100,
    spread: 100,
    origin: { y: 0.5 },
    colors: FISIO_COLORS,
    shapes: ['star', 'circle'],
    scalar: 1.1,
  });
  setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 80,
      origin: { y: 0.6 },
      colors: FISIO_COLORS,
    });
  }, 200);
}
