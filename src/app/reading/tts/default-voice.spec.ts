import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DefaultVoice, pickVoice } from './default-voice';
import type { Voice } from './voices';

const voices: Voice[] = [
  { name: 'zh-CN-XiaoxiaoNeural', locale: 'zh-CN', gender: 'Female' },
  { name: 'zh-CN-XiaoyiNeural', locale: 'zh-CN', gender: 'Female' },
  { name: 'zh-CN-YunjianNeural', locale: 'zh-CN', gender: 'Male' },
  { name: 'zh-CN-YunxiNeural', locale: 'zh-CN', gender: 'Male' },
  { name: 'zh-CN-YunxiaNeural', locale: 'zh-CN', gender: 'Male' },
  { name: 'zh-CN-YunyangNeural', locale: 'zh-CN', gender: 'Male' },
  { name: 'zh-TW-HsiaoChenNeural', locale: 'zh-TW', gender: 'Female' },
  { name: 'en-AU-NatashaNeural', locale: 'en-AU', gender: 'Female' },
  { name: 'en-US-AnaNeural', locale: 'en-US', gender: 'Female' },
  { name: 'en-US-AvaMultilingualNeural', locale: 'en-US', gender: 'Female' },
  { name: 'en-US-JennyNeural', locale: 'en-US', gender: 'Female' },
  { name: 'en-US-GuyNeural', locale: 'en-US', gender: 'Male' },
  { name: 'ko-KR-InJoonNeural', locale: 'ko-KR', gender: 'Male' },
];

describe('pickVoice', () => {
  afterEach(() => vi.restoreAllMocks());

  it('gives each language one woman’s voice and one man’s voice, the same for every kasha', () => {
    for (const draw of [0, 0.5, 0.99]) {
      vi.spyOn(Math, 'random').mockReturnValue(draw);
      expect(pickVoice(voices, 'zh', 'Female')?.name).toBe('zh-CN-XiaoxiaoNeural');
      expect(pickVoice(voices, 'zh', 'Male')?.name).toBe('zh-CN-YunyangNeural');
      vi.restoreAllMocks();
    }
  });

  it('does not depend on the order Edge lists the voices in', () => {
    const reversed = [...voices].reverse();

    expect(pickVoice(reversed, 'zh', 'Male')?.name).toBe('zh-CN-YunyangNeural');
    expect(pickVoice(reversed, 'en', 'Female')?.name).toBe(pickVoice(voices, 'en', 'Female')?.name);
  });

  it('never picks a child’s voice (Xiaoyi, Yunxia, Ana): Svet wants adults', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    expect(pickVoice(voices, 'zh', 'Female')?.name).toBe('zh-CN-XiaoxiaoNeural');
    expect(pickVoice(voices.filter((v) => v.name !== 'zh-CN-YunyangNeural'), 'zh', 'Male')?.name).not.toBe(
      'zh-CN-YunxiaNeural',
    );
    expect(pickVoice(voices, 'en', 'Female')?.name).toBe('en-US-JennyNeural');
  });

  it('keeps a child’s voice only when the language has nothing else', () => {
    const onlyChild: Voice[] = [{ name: 'zh-CN-XiaoyiNeural', locale: 'zh-CN', gender: 'Female' }];

    expect(pickVoice(onlyChild, 'zh', 'Female')?.name).toBe('zh-CN-XiaoyiNeural');
  });

  it('picks the usual variety of the language', () => {
    expect(pickVoice(voices, 'zh', 'Female')?.locale).toBe('zh-CN');
    expect(pickVoice(voices, 'en', 'Male')?.name).toBe('en-US-GuyNeural');
  });

  it('leaves the voices that read many languages for last', () => {
    expect(pickVoice(voices, 'en', 'Female')?.name).toBe('en-US-JennyNeural');
  });

  it('takes another kind of voice when the language has none of hers', () => {
    expect(pickVoice(voices, 'ko', 'Female')?.name).toBe('ko-KR-InJoonNeural');
  });

  it('finds nothing for a language without voices', () => {
    expect(pickVoice(voices, 'fi', 'Female')).toBeNull();
  });
});

describe('DefaultVoice', () => {
  beforeEach(() => localStorage.clear());

  it('starts with a woman’s voice and keeps her choice for the next start', () => {
    expect(TestBed.inject(DefaultVoice).gender()).toBe('Female');

    TestBed.inject(DefaultVoice).set('Male');
    TestBed.resetTestingModule();

    expect(TestBed.inject(DefaultVoice).gender()).toBe('Male');
  });
});
