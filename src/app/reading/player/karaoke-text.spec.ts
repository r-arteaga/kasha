import { TestBed } from '@angular/core/testing';
import type { Sentence } from '../domain/timeline';
import { KaraokeText } from './karaoke-text';

class NoResizeObserver {
  observe(): void {}
  disconnect(): void {}
}

function sentence(index: number, text: string, words: string[]): Sentence {
  let cursor = 0;
  return {
    index,
    paragraph: 0,
    text,
    start: index,
    end: index + 1,
    words: words.map((word) => {
      const charStart = text.indexOf(word, cursor);
      cursor = charStart + word.length;
      return { text: word, start: index, end: index + 1, charStart, charEnd: cursor };
    }),
  };
}

function render(sentences: Sentence[], readings: string[][] | null) {
  const fixture = TestBed.createComponent(KaraokeText);
  fixture.componentRef.setInput('sentences', sentences);
  fixture.componentRef.setInput('position', { sentence: 0, word: 0 });
  fixture.componentRef.setInput('locale', 'zh-CN');
  fixture.componentRef.setInput('readings', readings);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('KaraokeText', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= NoResizeObserver as unknown as typeof ResizeObserver;
  });

  it('puts each word’s reading over it', () => {
    const element = render([sentence(0, '有牛奶。', ['有', '牛奶'])], [['yǒu', 'niúnǎi']]);

    const words = [...element.querySelectorAll('.word')].map(
      (word) =>
        `${word.querySelector('.reading')?.textContent}=${word.querySelector('.base')?.textContent}`,
    );
    expect(words).toEqual(['yǒu=有', 'niúnǎi=牛奶']);
  });

  it('still shows a sentence the voice reported no words for (a countdown read as numbers)', () => {
    const element = render(
      [sentence(0, '有牛奶。', ['有', '牛奶']), sentence(1, '3、2、1！', [])],
      [['yǒu', 'niúnǎi'], []],
    );

    expect(element.querySelector('.sentence[data-s="1"]')?.textContent).toBe('3、2、1！');
  });

  it('shows the text alone when the readings are hidden', () => {
    const element = render([sentence(0, '有牛奶。', ['有', '牛奶'])], null);

    expect(element.querySelector('.reading')).toBeNull();
    expect(element.querySelector('.sentence')?.textContent).toBe('有牛奶。');
  });
});
