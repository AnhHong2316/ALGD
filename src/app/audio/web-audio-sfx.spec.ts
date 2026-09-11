import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebAudioSfx } from './web-audio-sfx';

/** Ghi lại việc đã dựng bao nhiêu nguồn âm và đã nối vào đâu. */
function fakeAudioContext() {
  const started: number[] = [];
  const context = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createGain: () => ({
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }),
    createOscillator: () => ({
      type: '',
      frequency: { setValueAtTime: vi.fn(), value: 0 },
      connect: vi.fn(),
      start: vi.fn((at: number) => started.push(at)),
      stop: vi.fn(),
    }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(64) }),
    createBufferSource: () => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn((at: number) => started.push(at)),
      stop: vi.fn(),
    }),
    createBiquadFilter: () => ({
      type: '',
      frequency: { setValueAtTime: vi.fn(), value: 0 },
      Q: { setValueAtTime: vi.fn(), value: 0 },
      connect: vi.fn(),
    }),
    sampleRate: 44100,
  };
  return { context, started };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>)['AudioContext'];
});

describe('WebAudioSfx', () => {
  it('không ném lỗi khi máy không có AudioContext', () => {
    const sfx = new WebAudioSfx();

    expect(() => {
      sfx.play('knock');
      sfx.play('tick');
      sfx.play('toll');
      sfx.play('chime');
    }).not.toThrow();
  });

  it('dựng nguồn âm khi máy có AudioContext', () => {
    const { context, started } = fakeAudioContext();
    (globalThis as Record<string, unknown>)['AudioContext'] = function () {
      return context;
    };

    new WebAudioSfx().play('toll');

    expect(started.length).toBeGreaterThan(0);
  });

  it('chime dựng nhiều nguồn hơn tick vì nó là ba nốt', () => {
    const { context, started } = fakeAudioContext();
    (globalThis as Record<string, unknown>)['AudioContext'] = function () {
      return context;
    };

    const sfx = new WebAudioSfx();
    sfx.play('tick');
    const afterTick = started.length;
    sfx.play('chime');

    expect(started.length - afterTick).toBeGreaterThan(afterTick);
  });
});
