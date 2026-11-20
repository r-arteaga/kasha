import { computed, effect, inject, Injectable, type OnDestroy, signal } from '@angular/core';
import { nextSentenceStart, previousSentenceStart, sentenceEndAction } from '../domain/shadowing';
import { locate, type Position } from '../domain/timeline';
import type { Track } from '../track';
import { PauseToRepeat } from './pause-to-repeat';
import { PlaybackSpeed } from './playback-speed';

type PitchAwareAudio = HTMLAudioElement & { webkitPreservesPitch?: boolean };

/** Her turn to say a sentence back: which one, and for how long the player waits. */
export interface Turn {
  sentence: number;
  ms: number;
}

/** A sentence counts as finished this close to its end; the next one opens with ~100 ms of silence anyway. */
const END_EPSILON_S = 0.02;

/**
 * Plays a track and follows it: `time` moves every animation frame while playing, and `position` says which
 * sentence and word are being spoken. It also runs the shadowing practice: repeating a sentence, and pausing
 * after each one for her turn (src/app/reading/domain/shadowing.ts decides what happens at a sentence's end).
 * One per player screen (provided by the page, destroyed with it).
 */
@Injectable()
export class KaraokePlayer implements OnDestroy {
  private readonly audio: PitchAwareAudio = new Audio();
  private readonly speed = inject(PlaybackSpeed);
  private readonly pauseSetting = inject(PauseToRepeat);
  private url: string | null = null;
  private frame = 0;
  /** The sentence whose end is being watched. */
  private followed = -1;
  private turnTimer: ReturnType<typeof setTimeout> | undefined;
  private afterTurn: (() => void) | null = null;

  /** Playback speed (1 = the voice as generated). */
  readonly rate = this.speed.rate;
  readonly pauseToRepeat = this.pauseSetting.on;
  readonly repeat = signal(false);
  readonly track = signal<Track | null>(null);
  readonly playing = signal(false);
  readonly time = signal(0);
  readonly turn = signal<Turn | null>(null);
  /** Playing, or waiting for her to repeat: either way the main button pauses. */
  readonly active = computed(() => this.playing() || this.turn() !== null);
  readonly position = computed<Position>(() => {
    const turn = this.turn();
    // During her turn the sentence to repeat stays lit, with no word marked.
    if (turn) return { sentence: turn.sentence, word: -1 };
    return locate(this.track()?.sentences ?? [], this.time());
  });
  /** On the first sentence there is nothing to go back to; on the last, nothing to go on to. */
  readonly hasPrevious = computed(() => this.position().sentence > 0);
  readonly hasNext = computed(() => this.position().sentence < (this.track()?.sentences.length ?? 0) - 1);
  readonly progress = computed(() => {
    const duration = this.track()?.duration ?? 0;
    return duration > 0 ? Math.min(1, this.time() / duration) : 0;
  });

  constructor() {
    this.audio.preload = 'auto';
    this.audio.addEventListener('play', () => {
      this.playing.set(true);
      this.followed = this.sentenceAt(this.audio.currentTime);
      this.follow();
    });
    this.audio.addEventListener('pause', () => this.stopFollowing());
    this.audio.addEventListener('ended', () => {
      this.stopFollowing();
      this.sentenceEnded();
    });
    // A slower voice keeps its pitch, as a person speaking slowly would (Safari still reads the prefixed name).
    this.audio.preservesPitch = true;
    this.audio.webkitPreservesPitch = true;
    effect(() => this.applyRate(this.rate()));
  }

  setRate(rate: number): void {
    this.speed.set(rate);
  }

  toggleRepeat(): void {
    this.repeat.update((on) => !on);
  }

  /** Turning the pauses off during her turn carries on at once instead of waiting it out. */
  setPauseToRepeat(on: boolean): void {
    this.pauseSetting.set(on);
    if (!on) this.endTurnNow();
  }

  load(track: Track): void {
    this.cancelTurn();
    this.audio.pause();
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(track.audio);
    this.audio.src = this.url;
    // Loading a source resets the playback rate to the default one, so both carry the chosen speed.
    this.applyRate(this.rate());
    this.track.set(track);
    this.time.set(0);
    this.followed = 0;
  }

  toggle(): void {
    if (this.active()) this.pause();
    else this.play();
  }

  play(): void {
    if (!this.track()) return;
    this.cancelTurn();
    // Starting again from the end replays the text instead of doing nothing.
    if (this.audio.ended) this.moveTo(0);
    this.audio.play().catch((error: unknown) => {
      console.error('Playback did not start', error);
      this.playing.set(false);
    });
  }

  pause(): void {
    this.cancelTurn();
    this.audio.pause();
  }

  seek(seconds: number): void {
    this.cancelTurn();
    this.moveTo(seconds);
  }

  /** Jumps to a moment and plays from there (tapping a word, previous, next). */
  playFrom(seconds: number): void {
    this.seek(seconds);
    this.play();
  }

  previous(): void {
    const sentences = this.track()?.sentences ?? [];
    const turn = this.turn();
    // During her turn, "previous" means hearing that sentence again.
    if (turn) this.playFrom(sentences[turn.sentence].start);
    else this.playFrom(previousSentenceStart(sentences, this.time(), this.rate()));
  }

  next(): void {
    const sentences = this.track()?.sentences ?? [];
    const turn = this.turn();
    const from = turn ? sentences[turn.sentence].start : this.time();
    const target = nextSentenceStart(sentences, from);
    if (target !== null) this.playFrom(target);
  }

  ngOnDestroy(): void {
    this.cancelTurn();
    this.stopFollowing();
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    if (this.url) URL.revokeObjectURL(this.url);
  }

  /** Acts on the end of the followed sentence: go on, stop, start it again, or give her a turn first. */
  private sentenceEnded(): void {
    const sentences = this.track()?.sentences ?? [];
    const index = this.followed;
    const sentence = sentences[index];
    if (!sentence) return;

    const action = sentenceEndAction(sentences, index, {
      repeat: this.repeat(),
      pauseToRepeat: this.pauseToRepeat(),
      rate: this.rate(),
    });

    switch (action.kind) {
      case 'next':
        this.followed = index + 1;
        return;
      case 'end':
        return;
      case 'restart':
        this.moveTo(sentence.start);
        if (this.audio.paused) this.play();
        return;
      case 'turn':
        this.audio.pause();
        this.moveTo(action.then === 'restart' ? sentence.start : sentence.end);
        this.turn.set({ sentence: index, ms: action.ms });
        this.afterTurn = action.then === 'end' ? () => undefined : () => this.play();
        this.turnTimer = setTimeout(() => this.endTurnNow(), action.ms);
        return;
    }
  }

  private endTurnNow(): void {
    const continuation = this.afterTurn;
    if (!this.turn()) return;
    this.cancelTurn();
    continuation?.();
  }

  private cancelTurn(): void {
    clearTimeout(this.turnTimer);
    this.turnTimer = undefined;
    this.afterTurn = null;
    this.turn.set(null);
  }

  private moveTo(seconds: number): void {
    const duration = this.track()?.duration ?? 0;
    const time = Math.min(Math.max(0, seconds), duration);
    this.audio.currentTime = time;
    this.time.set(time);
    this.followed = this.sentenceAt(time);
  }

  private sentenceAt(time: number): number {
    return locate(this.track()?.sentences ?? [], time).sentence;
  }

  private applyRate(rate: number): void {
    this.audio.defaultPlaybackRate = rate;
    this.audio.playbackRate = rate;
  }

  private follow(): void {
    cancelAnimationFrame(this.frame);
    const tick = () => {
      const time = this.audio.currentTime;
      this.time.set(time);
      const sentences = this.track()?.sentences ?? [];
      const followed = sentences[this.followed];
      // The last sentence ends with the audio itself ('ended').
      if (followed && this.followed < sentences.length - 1 && time >= followed.end - END_EPSILON_S) {
        this.sentenceEnded();
        if (this.audio.paused) return;
      }
      this.frame = requestAnimationFrame(tick);
    };
    tick();
  }

  private stopFollowing(): void {
    cancelAnimationFrame(this.frame);
    this.playing.set(false);
    this.time.set(this.audio.currentTime);
  }
}
