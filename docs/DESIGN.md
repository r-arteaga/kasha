# Kasha design

Mode: Operate for the controls and forms, Read for the text being practised. The text is the product; everything else is quiet.

## 1. Use scene

She holds the phone in portrait, often with headphones, eyes on the text while she speaks along. Day or night, at home or on the move. So:

- **Theme follows the system** (light by day, dark at night), as iOS apps do, unless she pins light or dark in Ajustes.
- **The reading text is large** (22 px, line height 1.6) and the controls sit in a dock at the bottom, under the thumb.
- **The current sentence is in full contrast**, the rest are muted, so the eye finds its place after looking away.

## 2. The signature: the marker

The spoken word sits on a highlighter mark, like a pen on paper. The mark is one element that slides from word to word (140 ms, exponential ease-out); with reduced motion it jumps. The word's own colour does not change, so the text never flickers.

## 3. Tokens

Defined in `src/styles/tokens.css` as CSS custom properties, light and dark.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--k-paper` | `#fbfaf7` | `#141311` | page background |
| `--k-surface` | `#f2f0eb` | `#1e1c19` | dock, inputs, second layer |
| `--k-ink` | `#1c1b19` | `#edeae4` | text, current sentence |
| `--k-ink-muted` | `#6b6760` | `#a39e95` | other sentences, hints (≥4.5:1 on paper) |
| `--k-line` | `#e3e0d9` | `#2c2a26` | hairlines |
| `--k-accent` | `#b93d0b` | `#fb923c` | primary action, focus, progress |
| `--k-on-accent` | `#ffffff` | `#1c1b19` | text on the accent |
| `--k-marker` | `#ffd66b` | `#6b4c0e` | the spoken word's mark |
| `--k-on-marker` | `#1c1b19` | `#fff3d6` | text over the mark |

Taiga's own variables (`--tui-background-accent-1`, `--tui-text-primary`…) are mapped onto these in `src/styles/theme.css`, so Taiga components share the palette.

## 4. Type

- One family, the system UI font (`-apple-system`, SF Pro, with Hiragino and PingFang covering Japanese and Chinese on iOS).
- Scale (rem, ratio about 1.2): 0.8125 hint · 1 body · 1.375 reading text · 1.25 screen title.
- Weights: 400 text, 600 titles and buttons.

## 5. Layout

- 16 px side gutter; respect `env(safe-area-inset-*)` top and bottom.
- Settings everywhere: every screen but Ajustes has the gear at the right end of its top bar (Svet: "En todas las pantallas quiero el botón de ajustes"). Ajustes' back arrow returns to the screen it was opened from, or home when it was the first screen.
- Player: top bar with the back arrow, a muted line (language · voice while listening, the kasha's title once saved, with its trash) and the gear; scrolling text; bottom dock with the controls. The current sentence scrolls into the middle when it changes. A spoken word never breaks across two lines, so the marker always covers one word on one line.
- Readings: for Chinese and Korean, a switch under the top bar ("Pinyin" or "Romanización", eye icon; tinted in the accent while shown, quiet when hidden) shows the reading over each spoken word, as in Svet's "Pantalla II": the word is a column with its reading on top in 0.64 em, muted (fainter outside the current sentence); the spoken word's reading in ink and 600; the marker stays on the word, not the reading. A word and the marks glued to it never break across lines. Languages written in Latin letters get no switch.
- Dock, top to bottom: progress line; the two practice toggles as 44 px icon buttons on the left (repeat-1 for "Repetir frase", mic for "Pausa para repetir", their names kept for VoiceOver; filled accent when on) with the time on the right of the same row ("0:02 / 0:17", elapsed in ink, total muted); then save (or the kasha's folder), play / pause, and the slow toggle at 0,5×, shown as the snail alone (Svet: "es un símbolo reconocido de lento"), its name kept for VoiceOver, filled accent when on.
- Her turn: a dark card floats just above the dock ("Tu turno: repite la frase", a marker-coloured bar draining over the turn), so the dock does not move; the sentence to repeat stays in full contrast with no word marked.
- Touch targets at least 44 pt.
- Lecciones (home): wordmark ("Kasha" in capitals, wide tracking, accent) and settings gear, large title, the lessons as rows of one rounded `--k-surface` block with hairlines (title in 600, two muted lines of the text, then "3 kashas · 19 nov" with the count in the accent when there are some); "Nueva lección" fixed under the thumb. Empty: a notebook icon, what a lesson is and what to do.
- Lección: back arrow and pencil (edit), large title, then "Lección" / "Kashas N" as a full-width segment in two equal halves. It opens on Kashas when there are some. Lección shows the lesson as written (line breaks kept), the kashas' passages under a soft marker. Kashas lists each passage (two lines), with "voice · language · duration" under it and a muted trash button that asks for a second tap. "Nueva kasha" under the thumb opens selection mode, the way Photos or WhatsApp select: the top bar becomes ✕ (leave), the count in the middle ("Elige las frases" while none) and "Todas" / "Ninguna" on the right; the lesson shows one sentence per row with an empty circle on the left (paragraphs keep a gap); picked rows fill the circle with the accent and a check and join into one rounded marker block; the bottom keeps only "Siguiente". No instructions in text: the circles say what to tap. The picked sentences are always one block: tapping outside grows it to there (first-and-last and one-by-one both work), tapping an end lets that sentence go, tapping inside ends it there.
- Nueva / editar lección: back arrow, large title, "Título" (optional: the first line is used) and "Texto"; "Guardar" full width; when editing, "Borrar lección" in red, which asks for a second tap and says its kashas go too.
- Nueva kasha: back arrow to the lesson, large title, the passage in a quiet scrolling block, then a full-width two-option segment ("Voz" / "Fav", equal halves) over the voice choice. "Voz" shows the language and voice pickers, with a star button beside the voice to mark it as a favorite (filled accent when it is one). "Fav" shows the favorites as two columns of quiet `--k-surface` tiles (voice in 600, language muted under it), the chosen tile outlined in the accent; with none, a card says so and how to add one.
- Ajustes: back button, large title like "Lecciones", then groups the way iOS settings look: a small muted group title, the choices as 52 px rows of one rounded `--k-surface` block with hairlines between them, the chosen row marked with an accent check on the right. Theme rows carry a muted icon (sun-moon, sun, moon); language rows show each language in its own name and script. In the browser (not once installed) an "App" group comes first with one row, "Instalar Kasha", its reason under it and a chevron: it opens the install guide.
- App icon: the logo, `public/logo.svg`: a blue ladle of green kasha with the character 学 ("to learn") in it, outlined in black. Drawn from it by `npm run icons` (192 and 512 on a transparent background, maskable versions on paper in the safe zone, 180 on paper for iOS, the favicon); their addresses carry a version from their bytes, so the page, the manifest and Control Center always ask for the current icon (an app already on an iPhone's home screen keeps the icon it was added with; iOS never refreshes that one). While playing, Control Center and the lock screen show the kasha's text, "Kasha" and the 180 icon on paper.
- Install guide (`@khmyznikov/pwa-install`): on iPhone, a sheet with the icon, name and description, a line saying why ("se abre a pantalla completa… el móvil guarda tus lecciones") and "Añadir a pantalla de inicio", which shows Safari's steps. It only opens from Ajustes, never by itself.

## 6. Copy

Spanish from Spain with `tú`, English, and Russian with `вы`; every text lives in `src/i18n/{es,en,ru}.json`. Controls name their action ("Generar audio", "Reproducir"). Errors say what failed and what to do next, never a technical message.
