# Developing Kasha

What the app is and what may come next: [the README](../README.md), written for the person who practises with it. This page is for whoever works on the code.

Karaoke language reader: paste a text in the language you are learning, hear it with a Microsoft Edge neural voice and follow each word highlighted as it is spoken, to practise shadowing.

- Angular 22 + Taiga UI 5, installable as a PWA (iPhone target).
- Two Netlify Functions relay Edge's free online text-to-speech: `POST /api/tts` (one sentence → MP3 + word timings) and `GET /api/voices`.
- Product and design: [`PRODUCT.md`](../PRODUCT.md), [`docs/DESIGN.md`](DESIGN.md).

## Run it locally

```bash
npm install
npm start
```

`npm start` runs the functions on http://localhost:8888 (`scripts/dev-api.mts`, no Netlify CLI needed) and the app on http://localhost:4200, which proxies `/api` to them.

## Checks

```bash
npm run check
```

Runs the app's unit tests (`ng test`), the functions' tests (`vitest.functions.config.mts`) and the production build.

## How the timing works

The text is split into sentences on the phone (`Intl.Segmenter` plus line breaks). Each sentence is voiced by its own request, which returns its MP3 and the offset of each word. The MP3s are joined into one file; each sentence's place on the timeline comes from counting its MP3 frames (`src/app/reading/domain/mp3-duration.ts`), and Edge's words are matched to the text in order (`timeline.ts`).

Slower playback (0.5× to 1×, chosen in the player and remembered on the phone) is done by the browser, which stretches the audio and keeps the pitch. The highlight follows the audio's own clock, so the timeline stays the same at every speed and nothing is generated again.

Shadowing practice (`src/app/reading/domain/shadowing.ts`): "Repetir frase" plays the current sentence again and again; "Pausa para repetir" stops after each sentence for as long as it took to hear at the current speed, plus half a second, with a "Tu turno" notice; both together give a turn and then the same sentence again. "Frase anterior" restarts the current sentence once it has played for a second (real time), otherwise goes to the previous one; "Frase siguiente" goes to the next. The pause setting and the speed are remembered on the phone; repeating is not.

## Lessons and kashas

The home screen opens on a box: she pastes a text and taps ▷ (Escuchar). `/listen` recognises the language on the phone (`src/app/reading/tts/detect-language.ts`: the writing system first, then common words for texts in Latin letters; no AI and no service), picks a random voice of the kind chosen in Ajustes (`default-voice.ts`, a woman's voice by default), makes the audio and starts playing a second later. The tap on ▷ plays a moment of silence on the one audio element all players share (`shared-audio.ts`), because Safari on iPhone only lets an element start by itself after it has played during a tap. In the player, tapping a word of the sentence being read holds the reading; tapping another sentence jumps to its start; the speeds are normal and slow (0.5×).

Chinese shows its pinyin and Korean its romanization over each spoken word, worked out on the phone with no AI and no network (`src/app/reading/transliteration/`). Pinyin comes from [pinyin-pro](https://github.com/zh-lx/pinyin-pro): the whole sentence is read at once so each character gets the reading its context asks for, and the syllables of a word are joined (牛奶 niúnǎi). Words it reads wrongly are corrected in `FIXES` in `pinyin.ts` (行人, 还钱); add one there when Svet finds another. Korean uses `romanize` from [es-hangul](https://github.com/toss/es-hangul) (Revised Romanization with sound changes: 같이 gachi). Each converter is a separate chunk loaded only for its language. The words are the ones the voice reports, so the reading sits over exactly what is marked. The "Pinyin" / "Romanización" switch above the text hides and shows them; the choice is kept on the phone (`show-readings.ts`, shown by default).

A kasha is a voiced text she keeps: one or more sentences with their voice, audio and timeline. It may stand alone or sit in a lesson, which works as a folder; the home screen has a tab for each. Folders nest: `Lesson.parentId` puts one inside another, so the "Lecciones" tab is a tree she organises as she likes (`/folder/:id` lists the folders and kashas inside one, and renames, moves or deletes it). Deleting a folder deletes nothing else: its folders and kashas move up one level, in the same transaction. A folder cannot be moved inside itself or one of its own folders. Older lessons keep their text, and inside them she can still pick a passage, choose a voice and get a kasha of that passage.

- Everything is kept on the phone in IndexedDB (`src/app/library/library-storage.ts`, database `kalare`; this and the `kalare.*` settings keep the app's first name so data saved before the rename to Kasha stays): lessons, kashas and their audio, as bytes, because older iOS Safari failed to store Blobs. The library (`src/app/library/library.ts`) holds the lists in memory as signals and writes to storage first, so a restart finds what the screens showed.
- A kasha keeps its own copy of the passage, voice and audio, so editing or shortening the lesson never breaks it; its passage is only marked in the lesson while the text there is still the same.
- The code calls them kashas throughout (`Kasha`, `addKasha`, `NewKashaPage` in `src/app/pages/new-kasha`); only the stored names keep the first ones, the store `karales` inside the database `kalare`, so what was saved before the renames stays.
- Deleting a lesson deletes its kashas and their audio in the same transaction.
- On the first save the app asks the browser to keep the data (`navigator.storage.persist()`). Safari may still clear the data of a site that is not installed and goes unused for weeks; installed as an app it keeps it.
- A kasha with no `lessonId` stands alone; putting it in a lesson or taking it out (`Library.moveKasha`) rewrites only its data, not its audio. No stored record changed shape for this, so nothing needed migrating.
- Routes, in English like the rest of the code: `/` home (paste box, kashas, lessons), `/listen` (the pasted text, voiced and played), `/folder/:id` (a folder of the tree), `/lesson/new`, `/lesson/:id`, `/lesson/:id/edit`, `/lesson/:id/kasha/new?from=&to=` (voice for a passage, in characters of the lesson's text), `/kasha/:id` (player), `/settings`. Any other address goes to the home screen.

## Installing it as an app (PWA)

- `@angular/pwa` set up the manifest (`public/manifest.webmanifest`) and Angular's service worker (`ngsw-config.json`): the app's files are cached on the first visit, so it opens without a connection. `/api/*` is never cached: generating a kasha needs the network, playing one does not (its audio is in IndexedDB). The worker only runs in production builds; `npm start` does not use it.
- iPhone: Safari has no install button, so `@khmyznikov/pwa-install` (`src/app/settings/install-app.ts`) shows how to add Kasha to the home screen. It opens only when she taps "Instalar Kasha" in Ajustes: its code loads then (its own chunk, about 38 kB compressed) and the element leaves the page with Ajustes, because once in the page Android opens it by itself at the next tap when the browser offers no install of its own. Its texts follow the phone's language; the description is Kasha's own, in the app's language.
- Installed, iOS keeps the app's data; a site only visited in Safari can lose it after weeks without use.
- Icons: `uv run --with resvg-py --with pillow scripts/make-icons.py` redraws `public/icons/*` and `public/favicon.ico` from `public/logo.svg`.
- To try the production build with its service worker locally, build it and serve `dist/kalare/browser` on `localhost` (service workers need HTTPS or localhost; on the phone through the PC's address they do not register, so the full check is on Netlify).

## Settings: theme and language

"Ajustes" (`/settings`, the gear on "Lecciones") picks the theme (automatic, light or dark) and the app's language (Spanish, English, Russian), both remembered on the phone (`kalare.theme`, `kalare.lang`).

- Texts go through [Transloco](https://jsverse.gitbook.io/transloco). The catalogs are `src/i18n/{es,en,ru}.json`, bundled with the app so it opens offline (`src/app/settings/translations.ts`). A test checks that English and Russian have exactly the Spanish keys and placeholders; to add a text, add it to all three.
- To add a language: its catalog, its code in `APP_LANGS` and `LANG_NAMES`, and its Taiga pack in `TAIGA_LANGUAGES` (`src/app/app.config.ts`).
- Without a saved choice the app starts in the phone's language when it is one of the three, otherwise in Spanish; the theme follows the phone.
- The theme drives Taiga's dark mode, which sets `tuiTheme="dark"` on `<body>`; Kasha's dark tokens switch on that attribute. A small script in `src/index.html` sets it before Angular starts, so the first paint is already right.

## The Edge TTS endpoint

The Edge TTS endpoint is undocumented and could stop working; audio already generated keeps working once it is stored on the phone (slice T3).
