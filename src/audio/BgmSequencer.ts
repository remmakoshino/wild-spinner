import * as Tone from 'tone';

import { ThreatTier } from '../utils/difficulty';
import { getTierMusicProfile } from './musicProfile';

export type BgmSection = 'explore' | 'battle' | 'boss';

export class BgmSequencer {
  private started = false;
  private currentSection: BgmSection = 'explore';
  private threatTier: ThreatTier = 0;

  private readonly masterFilter = new Tone.Filter(1800, 'lowpass').toDestination();
  private readonly master = new Tone.Gain(0.9).connect(this.masterFilter);
  private readonly exploreBus = new Tone.Volume(-6).connect(this.master);
  private readonly battleBus = new Tone.Volume(-60).connect(this.master);
  private readonly bossBus = new Tone.Volume(-60).connect(this.master);
  private readonly harmonyBus = new Tone.Volume(-36).connect(this.master);
  private readonly drumBus = new Tone.Volume(-30).connect(this.master);

  private readonly pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.03, decay: 0.2, sustain: 0.45, release: 0.8 }
  }).connect(this.exploreBus);

  private readonly bass = new Tone.MonoSynth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.35, release: 0.2 }
  }).connect(this.battleBus);

  private readonly lead = new Tone.FMSynth().connect(this.bossBus);
  private readonly harmony = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.25, release: 0.4 }
  }).connect(this.harmonyBus);

  private readonly kick = new Tone.MembraneSynth({
    octaves: 4,
    pitchDecay: 0.04,
    envelope: { attack: 0.001, decay: 0.24, sustain: 0.02, release: 0.08 }
  }).connect(this.drumBus);

  private readonly hat = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.055, sustain: 0 }
  }).connect(this.drumBus);

  private readonly exploreChords = [
    ['C4', 'E4', 'G4'],
    ['A3', 'C4', 'E4'],
    ['F3', 'A3', 'C4'],
    ['G3', 'B3', 'D4']
  ];

  private readonly battleNotes = ['C2', 'C2', 'G1', 'C2', 'D2', 'D2', 'G1', 'D2'];
  private readonly bossNotes = ['C5', 'D#5', 'G5', 'A#5', 'G5', 'D#5', 'C5', 'A#4'];

  private chordIndex = 0;
  private harmonyIndex = 0;
  private battleIndex = 0;
  private bossIndex = 0;
  private drumStep = 0;

  private readonly exploreLoop = new Tone.Loop((time) => {
    const chord = this.exploreChords[this.chordIndex];
    this.pad.triggerAttackRelease(chord, '1m', time, 0.52);
    this.chordIndex = (this.chordIndex + 1) % this.exploreChords.length;
  }, '1m');

  private readonly battleLoop = new Tone.Loop((time) => {
    const note = this.battleNotes[this.battleIndex];
    this.bass.triggerAttackRelease(note, '8n', time, 0.82);
    this.battleIndex = (this.battleIndex + 1) % this.battleNotes.length;
  }, '8n');

  private readonly bossLoop = new Tone.Loop((time) => {
    const note = this.bossNotes[this.bossIndex];
    this.lead.triggerAttackRelease(note, '16n', time, 0.52);
    this.bossIndex = (this.bossIndex + 1) % this.bossNotes.length;
  }, '16n');

  private readonly harmonyLoop = new Tone.Loop((time) => {
    const profile = getTierMusicProfile(this.threatTier);
    if (profile.harmonyDensity === 0) return;

    const baseChord = this.exploreChords[this.harmonyIndex % this.exploreChords.length];
    const layeredChord = this.buildLayeredChord(baseChord, profile.harmonyDensity);
    this.harmony.triggerAttackRelease(layeredChord, '2n', time, 0.45);
    this.harmonyIndex += 1;
  }, '2n');

  private readonly drumLoop = new Tone.Loop((time) => {
    const profile = getTierMusicProfile(this.threatTier);
    if (profile.percussionDensity === 0) return;

    const step = this.drumStep % 16;
    if (this.shouldKick(step, profile.percussionDensity)) {
      this.kick.triggerAttackRelease('C1', '16n', time, 0.82);
    }
    if (this.shouldHat(step, profile.percussionDensity)) {
      this.hat.triggerAttackRelease('16n', time, 0.22);
    }

    this.drumStep += 1;
  }, '16n');

  async unlockAndStart(): Promise<void> {
    await Tone.start();

    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
    }

    if (this.started) return;

    Tone.Transport.bpm.value = 124;
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = '4m';

    this.exploreLoop.start(0);
    this.battleLoop.start(0);
    this.bossLoop.start(0);
    this.harmonyLoop.start(0);
    this.drumLoop.start(0);

    this.applyTierProfile(this.threatTier, true);

    Tone.Transport.start();
    this.started = true;
  }

  transitionTo(next: BgmSection, fadeSec = 0.12): void {
    if (!this.started || this.currentSection === next) return;

    const atTime = Tone.Transport.nextSubdivision('1m');
    if (atTime === 0) return;

    Tone.Transport.scheduleOnce((time) => {
      this.fadeSection(this.exploreBus.volume, next === 'explore' ? -6 : -60, time, fadeSec);
      this.fadeSection(this.battleBus.volume, next === 'battle' ? -6 : -60, time, fadeSec);
      this.fadeSection(this.bossBus.volume, next === 'boss' ? -6 : -60, time, fadeSec);
    }, atTime);

    this.currentSection = next;
  }

  setThreatTier(tier: ThreatTier): void {
    this.threatTier = tier;
    this.applyTierProfile(tier, false);
  }

  dispose(): void {
    this.exploreLoop.dispose();
    this.battleLoop.dispose();
    this.bossLoop.dispose();
    this.harmonyLoop.dispose();
    this.drumLoop.dispose();
    this.pad.dispose();
    this.bass.dispose();
    this.lead.dispose();
    this.harmony.dispose();
    this.kick.dispose();
    this.hat.dispose();
    this.exploreBus.dispose();
    this.battleBus.dispose();
    this.bossBus.dispose();
    this.harmonyBus.dispose();
    this.drumBus.dispose();
    this.master.dispose();
    this.masterFilter.dispose();
  }

  private applyTierProfile(tier: ThreatTier, immediate: boolean): void {
    const profile = getTierMusicProfile(tier);

    if (immediate) {
      Tone.Transport.bpm.value = profile.bpm;
      this.harmonyBus.volume.value = profile.harmonyDb;
      this.drumBus.volume.value = profile.drumDb;
      this.masterFilter.frequency.value = profile.filterCutoffHz;
      return;
    }

    Tone.Transport.bpm.rampTo(profile.bpm, 0.8);
    this.harmonyBus.volume.rampTo(profile.harmonyDb, 0.7);
    this.drumBus.volume.rampTo(profile.drumDb, 0.7);
    this.masterFilter.frequency.rampTo(profile.filterCutoffHz, 0.9);
  }

  private buildLayeredChord(baseChord: string[], density: 0 | 1 | 2 | 3): string[] {
    if (density === 1) {
      return [...baseChord];
    }

    if (density === 2) {
      return [...baseChord, this.raiseOctave(baseChord[0])];
    }

    if (density === 3) {
      return [
        ...baseChord,
        this.raiseOctave(baseChord[0]),
        this.raiseOctave(baseChord[1]),
        this.raiseOctave(baseChord[2])
      ];
    }

    return [];
  }

  private raiseOctave(note: string): string {
    const octave = Number(note.slice(-1));
    const head = note.slice(0, -1);
    return `${head}${octave + 1}`;
  }

  private shouldKick(step: number, density: 0 | 1 | 2 | 3 | 4): boolean {
    if (density <= 1) return step === 0 || step === 8;
    if (density === 2) return step === 0 || step === 4 || step === 8 || step === 12;
    if (density === 3) return step % 2 === 0;
    return step % 2 === 0 || step === 3 || step === 11;
  }

  private shouldHat(step: number, density: 0 | 1 | 2 | 3 | 4): boolean {
    if (density <= 1) return step === 4 || step === 12;
    if (density === 2) return step % 4 === 2;
    if (density === 3) return step % 2 === 1;
    return true;
  }

  private fadeSection(
    volume: Tone.Param<"decibels">,
    toDb: number,
    atTime: number,
    fadeSec: number
  ): void {
    volume.cancelScheduledValues(atTime);
    volume.setValueAtTime(volume.value, atTime);
    volume.linearRampToValueAtTime(toDb, atTime + fadeSec);
  }
}
