import { detectLanguage } from './detect-language';

describe('detectLanguage', () => {
  it.each([
    ['你是不是学生？', 'zh'],
    ['私は学生です。', 'ja'],
    ['안녕하세요, 저는 학생이에요.', 'ko'],
    ['Ты студент?', 'ru'],
    ['Я їжу яблуко.', 'uk'],
    ['Καλημέρα, τι κάνεις;', 'el'],
    ['¿Dónde está la estación de tren?', 'es'],
    ['Where is the train station, please?', 'en'],
    ['Je suis étudiant et je vis à Paris.', 'fr'],
    ['Ich bin Student und wohne in Berlin.', 'de'],
    ['Io sono uno studente e non ho fame.', 'it'],
    ['Você não está em casa?', 'pt'],
  ])('reads %s as %s', (text, language) => {
    expect(detectLanguage(text)).toBe(language);
  });

  it('goes by the writing system most of the text uses', () => {
    expect(detectLanguage('我喜欢 Starbucks 的咖啡，因为很好喝。')).toBe('zh');
  });

  it('says nothing when there are no letters', () => {
    expect(detectLanguage('  123 — !! ')).toBeNull();
  });
});
