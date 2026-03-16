"use client";

import { useRef, useCallback } from "react";

type SoundEvent = "coin" | "allin" | "win" | "fold" | "deal" | "raise";

export function usePokerSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  function ctx(): AudioContext {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  const playSound = useCallback((event: SoundEvent) => {
    try {
      const ac = ctx();
      const now = ac.currentTime;

      switch (event) {
        case "coin": {
          // A crisp coin "ding" – sine wave, 660→880 Hz, short envelope
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.connect(gain); gain.connect(ac.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(660, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now); osc.stop(now + 0.35);
          break;
        }

        case "raise": {
          // Two-tone chip slide
          [440, 550].forEach((freq, i) => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain); gain.connect(ac.destination);
            osc.type = "triangle";
            osc.frequency.value = freq;
            const t = now + i * 0.08;
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc.start(t); osc.stop(t + 0.25);
          });
          break;
        }

        case "allin": {
          // Deep whoosh: low-pass filtered noise sweep
          const bufSize = ac.sampleRate * 0.6;
          const buffer = ac.createBuffer(1, bufSize, ac.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

          const src = ac.createBufferSource();
          src.buffer = buffer;

          const filt = ac.createBiquadFilter();
          filt.type = "lowpass";
          filt.frequency.setValueAtTime(80, now);
          filt.frequency.exponentialRampToValueAtTime(600, now + 0.3);
          filt.frequency.exponentialRampToValueAtTime(80, now + 0.6);

          const gain = ac.createGain();
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

          src.connect(filt); filt.connect(gain); gain.connect(ac.destination);
          src.start(now);

          // Add dramatic bass thud
          const thud = ac.createOscillator();
          const thudGain = ac.createGain();
          thud.connect(thudGain); thudGain.connect(ac.destination);
          thud.type = "sine";
          thud.frequency.setValueAtTime(120, now);
          thud.frequency.exponentialRampToValueAtTime(40, now + 0.25);
          thudGain.gain.setValueAtTime(0.6, now);
          thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          thud.start(now); thud.stop(now + 0.45);
          break;
        }

        case "win": {
          // Ascending C-E-G fanfare
          const notes = [523.25, 659.25, 783.99];
          notes.forEach((freq, i) => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain); gain.connect(ac.destination);
            osc.type = "sine";
            osc.frequency.value = freq;
            const t = now + i * 0.15;
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.start(t); osc.stop(t + 0.5);
          });
          break;
        }

        case "fold": {
          // Short muted swish
          const bufSize = ac.sampleRate * 0.12;
          const buffer = ac.createBuffer(1, bufSize, ac.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

          const src = ac.createBufferSource();
          src.buffer = buffer;

          const filt = ac.createBiquadFilter();
          filt.type = "highpass";
          filt.frequency.value = 2000;

          const gain = ac.createGain();
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          src.connect(filt); filt.connect(gain); gain.connect(ac.destination);
          src.start(now);
          break;
        }

        case "deal": {
          // Crisp card flick (very short noise impulse)
          const bufSize = Math.ceil(ac.sampleRate * 0.04);
          const buffer = ac.createBuffer(1, bufSize, ac.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

          const src = ac.createBufferSource();
          src.buffer = buffer;

          const filt = ac.createBiquadFilter();
          filt.type = "bandpass";
          filt.frequency.value = 4000;
          filt.Q.value = 2;

          const gain = ac.createGain();
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          src.connect(filt); filt.connect(gain); gain.connect(ac.destination);
          src.start(now);
          break;
        }
      }
    } catch {
      // Silently fail if AudioContext is unavailable
    }
  }, []);

  return { playSound };
}
