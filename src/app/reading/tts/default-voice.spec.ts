import { TestBed } from '@angular/core/testing';
import { DefaultVoice, pickVoice } from './default-voice';
import type { Voice } from './voices';

const voices: Voice[] = [
  { name: 'zh-CN-XiaoxiaoNeural', locale: 'zh-CN', gender: 'Female' },
  { name: 'zh-CN-XiaoyiNeural', locale: 'zh-CN', gender: 'Female' },
  { name: 'zh-CN-YunxiNeural', locale: 'zh-CN', gender: 'Male' },
  { name: 'zh-TW-HsiaoChenNeural', locale: 'zh-TW', gender: 'Female' },
  { name: 'en-AU-NatashaNeural', locale: 'en-AU', gender: 'Female' },
  { name: 'en-US-AvaMultilingualNeural', locale: 'en-US', gender: 'Female' },
  { name: 'en-US-JennyNeural', locale: 'en-US', gender: 'Female' },
  { name: 'en-US-GuyNeural', locale: 'en-US', gender: 'Male' },
  { name: 'ko-KR-InJoonNeural', locale: 'ko-KR', gender: 'Male' },
];

describe('pickVoice', () => {
  it('picks a voice of the kind she prefers, in the usual variety of the language', () => {
    expect(pickVoice(voices, 'zh', 'Male')?.name).toBe('zh-CN-YunxiNeural');
    expect(pickVoice(voices, 'zh', 'Female', () => 0)?.name).toBe('zh-CN-XiaoxiaoNeural');
    expect(pickVoice(voices, 'zh', 'Female', () => 0.99)?.name).toBe('zh-CN-XiaoyiNeural');
  });

  it('leaves the voices that read many languages for last', () => {
    expect(pickVoice(voices, 'en', 'Female', () => 0)?.name).toBe('en-US-JennyNeural');
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
