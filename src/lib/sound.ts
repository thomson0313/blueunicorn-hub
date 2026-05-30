let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

/** Browsers block audio until a user gesture; call this once after a click/keypress. */
export function unlockAudio(): void {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

/** Play a short, soft "pop" for an incoming chat message. */
export function playMessageChime(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

/** Play a short, professional two-note notification chime. */
export function playAlertChime(): void {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);

  // Gentle rise and fall envelope.
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

  const notes = [
    { freq: 880, start: 0, dur: 0.18 }, // A5
    { freq: 1318.5, start: 0.16, dur: 0.5 }, // E6
  ];

  for (const n of notes) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = n.freq;
    g.gain.setValueAtTime(0.0001, now + n.start);
    g.gain.exponentialRampToValueAtTime(0.6, now + n.start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
    osc.connect(g);
    g.connect(master);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.dur + 0.05);
  }
}
