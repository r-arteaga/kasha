# Product

<!-- impeccable:product-schema 1 -->

Written by the building agent on 2026-11-19 from the owner's request and decisions, without an interview with the end user. Lines marked "assumption" are still to be confirmed with her.

## Platform

web (installable PWA)

Angular 22 with Taiga UI 5, served free from Netlify, added to the home screen of the end user's iPhone and used full screen in portrait (widths 375–430 pt, notch and home indicator safe areas). Desktop browsers work but are not a target.

## Users

One user: a friend of the owner who is learning languages (which ones is not known yet). She explores grammar, uses and example sentences of a word with an AI chat, then wants to practise speaking them by shadowing: listening to a native-like voice and repeating right after it, sentence by sentence. The interface speaks Spanish (Spain, `tú`), English and Russian, chosen in Ajustes (owner's request, 2026-11-19); which one she uses is not known yet.

## Product Purpose

Kasha (KAraoke SHAdowing; called KALARE, "karaoke language reader", until 2026-11-20) turns any text she pastes into an audio she can shadow, with the spoken word highlighted as it plays. What her current workflow lacks is exactly that: knowing where the voice is in the text at every moment.

## Positioning

A free, personal shadowing reader: paste text, pick a voice, follow the highlight, repeat. Voices come from Microsoft Edge's free online text-to-speech; no account, no subscription, no ads.

## Operating Context

- Two moments: preparing (paste text from the AI chat, choose language and voice, generate) and practising (listen, follow, repeat; often with headphones, eyes on the text, one thumb on the controls).
- Practising happens again and again on the same texts, so they stay on the phone and play offline (v1 slice T3).
- Shadowing controls: repeat the current sentence, previous / next sentence, slower speed, a pause after each sentence to repeat it (v1 slice T2).

## Capabilities and Constraints

- Free to run: Netlify's free plan, no paid API. The Edge TTS endpoint is undocumented and may stop working; what was generated stays usable because the audio and timings are kept on the phone.
- Texts can be in any language Edge TTS speaks, including Japanese and Chinese, so the reading text uses the system fonts (full script coverage on iOS) rather than a self-hosted face.
- Plain, calm interface: one stable state on screen with the next action, never raw errors or internal states.

## Brand Commitments

- Name: Kasha, from KAraoke SHAdowing. Written "Kasha"; the wordmark shows it in capitals. It was KALARE until 2026-11-20.
- The reading text is the product; the interface stays out of its way.
- The design contract is [`docs/DESIGN.md`](docs/DESIGN.md).
