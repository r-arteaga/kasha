import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DefaultVoice } from '../../reading/tts/default-voice';
import { PasteDraft } from './paste-draft';

describe('PasteDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('keeps the text on the phone for the next start', () => {
    TestBed.inject(PasteDraft).set('我的哥哥长得很高。');
    TestBed.resetTestingModule();

    expect(TestBed.inject(PasteDraft).text()).toBe('我的哥哥长得很高。');
  });

  it('reads with the kind of voice in Ajustes until she picks another under ▷', () => {
    TestBed.inject(DefaultVoice).set('Male');
    const draft = TestBed.inject(PasteDraft);

    expect(draft.voiceGender()).toBe('Male');

    draft.chooseVoiceGender('Female');

    expect(draft.voiceGender()).toBe('Female');
    expect(TestBed.inject(DefaultVoice).gender()).toBe('Male');
  });

  it('keeps her pick while she edits the text, and forgets it when she empties the box', () => {
    const draft = TestBed.inject(PasteDraft);
    draft.set('我的哥哥');
    draft.chooseVoiceGender('Male');

    draft.set('我的哥哥长得很高。');
    expect(draft.voiceGender()).toBe('Male');

    draft.set('');
    expect(draft.voiceGender()).toBe('Female');
  });
});
