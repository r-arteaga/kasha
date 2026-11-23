import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiIcon, TuiNotification } from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';
import { Library } from '../../library/library';
import { SharedAudio } from '../../reading/player/shared-audio';
import { pickVoice, usualLocale, type VoiceGender } from '../../reading/tts/default-voice';
import { detectLanguage } from '../../reading/tts/detect-language';
import { VoiceCatalog } from '../../reading/tts/voice-catalog';
import { languageLabel, localeFlag } from '../../reading/tts/voices';
import { AppLanguage } from '../../settings/app-language';
import { readStored, store } from '../../shared/local-storage';
import { FolderList } from '../shared/folder-list';
import { KashaList } from '../shared/kasha-list';
import { PasteDraft } from './paste-draft';

type Tab = 'kashas' | 'lessons';
const TAB_KEY = 'kalare.homeTab';

/** Home: a box to paste a text and hear it at once; below, all her kashas and her tree of folders. */
@Component({
  selector: 'k-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FolderList, KashaList, RouterLink, TranslocoDirective, TuiButton, TuiIcon, TuiNotification, TuiSegmented],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  private readonly library = inject(Library);
  private readonly appLanguage = inject(AppLanguage);
  private readonly router = inject(Router);
  private readonly sharedAudio = inject(SharedAudio);
  private readonly catalog = inject(VoiceCatalog);
  protected readonly draft = inject(PasteDraft);

  protected readonly state = this.library.state;
  protected readonly kashas = this.library.kashas;
  protected readonly hasFolders = computed(() => this.library.foldersIn(null).length > 0);
  protected readonly tab = signal<Tab>(readStored<Tab>(TAB_KEY) === 'lessons' ? 'lessons' : 'kashas');
  protected readonly tabIndex = computed(() => (this.tab() === 'kashas' ? 0 : 1));
  protected readonly canListen = computed(() => this.draft.text().trim() !== '');
  private readonly language = computed(() => detectLanguage(this.draft.text()));
  /** "Chino": the language she will hear, so a wrong guess shows before she listens. */
  protected readonly languageName = computed(() => {
    const language = this.language();
    return language ? languageLabel(language, this.appLanguage.lang()) : null;
  });
  /** 🇨🇳: the country of the voice ▷ will use (the usual one until the voice list has loaded). */
  protected readonly flag = computed(() => {
    const language = this.language();
    if (!language) return null;
    const voices = this.catalog.languages().flatMap((entry) => entry.voices);
    const locale = pickVoice(voices, language, this.draft.voiceGender())?.locale ?? usualLocale(language);
    return locale ? localeFlag(locale) : null;
  });
  protected readonly voiceGender = this.draft.voiceGender;

  constructor() {
    // The list of voices, so the flag is the voice's own; /listen needs it anyway.
    void this.catalog.load();
  }

  protected chooseVoiceGender(gender: VoiceGender): void {
    this.draft.chooseVoiceGender(gender);
  }

  protected edit(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  protected clear(): void {
    this.draft.set('');
  }

  protected chooseTab(index: number): void {
    const tab: Tab = index === 0 ? 'kashas' : 'lessons';
    this.tab.set(tab);
    store(TAB_KEY, tab);
  }

  protected listen(): void {
    if (!this.canListen()) return;
    // Her tap lets the player start by itself once the audio is ready (Safari on iPhone needs one).
    this.sharedAudio.unlock();
    void this.router.navigate(['/listen']);
  }
}
