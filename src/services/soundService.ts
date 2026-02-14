/**
 * Base para notificações sonoras (volume baixo, som curto, throttle).
 * Não repete em spam; sons opcionais para acessibilidade.
 */

const VOLUME = 0.25;
const THROTTLE_MS = 1500;

let lastPlayedAt = 0;

function throttle(): boolean {
  const now = Date.now();
  if (now - lastPlayedAt < THROTTLE_MS) return false;
  lastPlayedAt = now;
  return true;
}

function playBeep(frequency: number, durationMs: number, type: OscillatorType = "sine"): void {
  if (!throttle()) return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(VOLUME, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + durationMs / 1000);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + durationMs / 1000);
  } catch {
    // Silently ignore if audio not supported or blocked
  }
}

export const soundService = {
  playMoneyReceiveSound(): void {
    playBeep(880, 120);
    setTimeout(() => playBeep(1100, 100), 80);
  },

  playShareInviteSound(): void {
    playBeep(660, 150, "sine");
  },

  playSuccessActionSound(): void {
    playBeep(523, 80);
    setTimeout(() => playBeep(659, 80), 60);
    setTimeout(() => playBeep(784, 120), 120);
  },
};
