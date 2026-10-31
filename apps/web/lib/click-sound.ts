/**
 * A short mechanical click, synthesised so there is no audio file to load:
 * a 30 ms burst of filtered noise for the tick, over a quick low thump for
 * body, like a physical switch. Silent wherever audio is unavailable.
 */

let context: AudioContext | undefined;

export function playClick(): void {
  try {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    context ??= new Context();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;

    // The tick: decaying white noise through a band-pass filter.
    const length = Math.floor(context.sampleRate * 0.03);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) samples[index] = (Math.random() * 2 - 1) * (1 - index / length) ** 4;
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const band = context.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2400;
    band.Q.value = 1.4;
    const tickGain = context.createGain();
    tickGain.gain.value = 0.32;
    noise.connect(band).connect(tickGain).connect(context.destination);
    noise.start(now);

    // The body: a low sine dropping in pitch and fading within 50 ms.
    const thump = context.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(190, now);
    thump.frequency.exponentialRampToValueAtTime(80, now + 0.05);
    const thumpGain = context.createGain();
    thumpGain.gain.setValueAtTime(0.18, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    thump.connect(thumpGain).connect(context.destination);
    thump.start(now);
    thump.stop(now + 0.06);
  } catch {
    // No sound is better than a broken toggle.
  }
}
