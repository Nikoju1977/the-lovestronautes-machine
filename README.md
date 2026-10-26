![Thelovestronautes Machine](banner.svg)

# Thelovestronautes Machine

> **Projet signature · 05/06 · WEB AUDIO** — [Étude de projet : problème, choix techniques et limites](https://github.com/Nikoju1977/Nikoju1977/blob/main/SHOWCASE.md) · [Portfolio Studio Niko Design](https://github.com/Nikoju1977).


[![Démo](https://img.shields.io/badge/Démo-en_ligne-00ff9d?style=flat-square&labelColor=050a0d)](https://nikoju1977.github.io/the-lovestronautes-machine/) [![PWA](https://img.shields.io/badge/PWA-installable-00d4ff?style=flat-square&labelColor=050a0d)](#) [![Licence](https://img.shields.io/badge/Licence-MIT-9fb4ba?style=flat-square&labelColor=050a0d)](LICENSE)

**Machine musicale dans le navigateur** — séquenceur pas-à-pas Web Audio pour créer des grooves psytrance, par le projet [Thelovestronautes](https://soundcloud.com/nicolas-julienne-670246252).

**Démo** : [nikoju1977.github.io/the-lovestronautes-machine](https://nikoju1977.github.io/the-lovestronautes-machine/)

## Fonctionnalités

- 🥁 Séquenceur pas-à-pas Web Audio, sans samples externes
- 🎚️ BPM éditable + Tap Tempo, **swing 50–75 %**, morphing et automation live
- 🎛️ Mixeur 8 pistes, chaos pad, clavier tactile et oscilloscope temps réel
- 🎚️ **Égaliseur master 5 bandes** (80, 250, 1 000, 4 000, 10 000 Hz), ±12 dB, bypass, reset et mémorisation
- 🥁 **Trois nouvelles machines** : 909 Snare, 808 Hi-Hat et Sub Bass, séquenceurs 16 pas et paramètres de synthèse réglables
- ☄ **Biniou électronique / Cyber Breton** : piste BINI dédiée, anche synthétique, drone A, harmoniseurs ±1 octave, pitch bend MIDI, drive, tone, echo et espace/reverb
- ↶ **Undo/Redo** sur les éditions de performance principales
- ⇩ **Export / import JSON** du projet complet
- ● **Enregistrement du master** en WebM/Ogg selon le navigateur (mode stéréo)
- 🎛️ **Studio Pro** : mute, solo, pan et EQ 3 bandes ±9 dB par piste
- 💿 **Export WAV PCM stéréo 16 bits et MP3 320 kb/s** depuis le master traité, avec AudioWorklet + encodeur en Worker utilisable hors ligne
- 🔊 Limiteur de sécurité master, options 4/8/16/32 mesures, progression et annulation
- 🌀 **Psytrance Production Suite** : Full-On, Dark Psy, Progressive et Forest, avec kick accordable, bassline roulante, acid 303 et supersaw
- 🧬 **FX psychédéliques** : LFO synchronisé, filtre résonant et glide, delay ping-pong stéréo, risers et sidechain
- 🗺️ **Song Mode** : arrangement automatique A/B/C/D utilisable pendant la lecture et l'export WAV/MP3
- 🔌 Web MIDI In/Out et routage audio 4 canaux
- 🧠 Ghost Pilot Mistral optionnel
- 💾 Sauvegarde locale des patterns et réglages
- 📱 PWA installable avec mode hors-ligne

## Égaliseur et nouvelles machines

Dans **FX**, l'égaliseur à 5 bandes agit sur le bus master stéréo avant l'analyseur et le compresseur. **EQ: BYPASS** met les cinq gains à 0 dB sans modifier leurs valeurs; **FLAT 0 dB** remet les réglages à plat. Le bus master conserve une marge de niveau de 0,72 pour limiter la saturation lors des boosts. En mode **MULTI-OUT 4CH**, les canaux physiques restent séparés et contournent cet égaliseur : ce dernier traite uniquement le bus FX/preview.

Les pistes **909 SNARE**, **808 HAT** et **SUB BASS** sont disponibles dans **SEQ**, disposent chacune de son volume, mutation et longueur dans **MIX**, et de paramètres de timbre + boutons **TEST** dans **FX**. Elles utilisent exclusivement la synthèse Web Audio. Les nouveaux patterns d'usine contiennent quelques rythmes de démonstration; les anciens projets JSON restent compatibles et chargent ces pistes vides pour préserver leur arrangement.

Les paramètres et les nouvelles pistes sont conservés par la sauvegarde locale, l'export/import JSON et l'historique Undo/Redo. Après mise à jour du site, actualiser l'application installée si nécessaire afin de charger le nouveau cache PWA.

## Psytrance Production Suite : Full-On / Dark Psy / Progressive / Forest

Dans **FX → PSYTRANCE PRO**, un clic charge un jeu de **quatre patterns A/B/C/D** et les réglages de production correspondants. **A = intro**, **B = groove**, **C = peak-time**, **D = breakdown**. Tempos : **Full-On 145 BPM**, **Dark Psy 152 BPM**, **Progressive 136 BPM**, **Forest 150 BPM**.

Le moteur musical inclut :

- **Kick** accordable de 43 à 65 Hz (decay et punch), **bassline K-B-B-B** avec 3 pulsations entre les kicks, notes accordées à la tonalité du preset et sidechain.
- **Acid inspiré TB-303** : filtre résonant, enveloppe, accent par pas, glide, LFO tempo-sync et drive.
- **SuperSaw** à trois oscillateurs, delay stéréo **ping-pong** (1/8, 3/16, 1/4), feedback et niveaux d'envoi.
- **Risers** optionnels une mesure avant chaque bloc de huit mesures.
- **Song Mode** : une chaîne de lettres A/B/C/D (par défaut `AABBCCDD`) et **1 / 2 / 4 / 8 / 16 mesures par section**. Le séquenceur change de pattern au bon passage de mesure. L'export WAV ou MP3 enregistre aussi ces changements d'arrangement.

**Important** : charger un preset **remplace les patterns A/B/C/D**. Sauvegarder le projet JSON avant, ou restaurer avec UNDO. Les anciens projets conservent le moteur existant jusqu'à activation explicite du mode psy. Les réglages et l'arrangement sont mémorisés dans le projet **v6**, en restant compatibles avec les anciennes sauvegardes.

Les tests vérifient l'intégrité des patterns, les changements de section, la migration JSON et la planification des synthés. Une écoute critique sur casque et enceintes reste nécessaire pour finaliser le mix.

## Studio Pro — console, mastering et exports audio

Dans **MIX**, chaque piste dispose des boutons **M** (mute), **S** (solo), du panoramique (**PAN**) et d'un égaliseur trois bandes **LOW / MID / HIGH** entre -9 et +9 dB. Les huit pistes, Biniou électronique inclus, sont couvertes. Le master conserve ses effets et son égaliseur cinq bandes; un limiteur dynamique et un gain de sortie sont ajoutés après le compresseur.

Dans **FX → STUDIO EXPORT**, choisir **4 / 8 / 16 / 32 mesures**, puis **EXPORT WAV** ou **EXPORT MP3**. Le studio démarre le pattern sélectionné depuis le premier pas, enregistre **en temps réel** le bus master post-traitement, arrête le séquenceur et conserve **1,6 s** de queue d'effets.

- **WAV** : PCM stéréo 16 bits sans perte, fréquence d'échantillonnage de l'AudioContext (44,1 ou 48 kHz en général).
- **MP3** : stéréo **320 kbit/s**, encodage dans un Web Worker à 32, 44,1 ou 48 kHz.
- **Hors connexion** : les scripts, AudioWorklet, Worker et encodeur MP3 sont intégrés au cache PWA v7.
- **Contraintes** : garder l'onglet actif. Lancer après avoir arrêté PLAY et REC MASTER. Désactiver MULTI-OUT 4CH pour disposer d'un bus master stéréo complet. Le bouton **ARRÊTER** permet d'annuler le rendu.
- **Compatibilité** : AudioWorklet sur les navigateurs récents, avec ScriptProcessor comme repli. Les paramètres console sont enregistrés dans le JSON et restaurés avec les projets anciens.

Le MP3 utilise [lamejs v1.2.1](https://github.com/zhuker/lamejs), distribué sous **LGPL-3.0** dans le fichier distinct `vendor/lame.min.js`. Voir `vendor/LICENSE-lamejs.txt` et les [sources de lamejs](https://github.com/zhuker/lamejs/tree/master/src). La licence principale MIT ne s'applique pas à cette bibliothèque tierce.

## Biniou électronique

Dans l'onglet **FX**, activez **BINIOU E** pour armer le clavier live et la nouvelle piste **BINI** du séquenceur. **DRONE A** ajoute un bourdon continu. Le mode **CYBER** ajoute une harmonisation à l'octave grave et aiguë, un vibrato plus nerveux et davantage de saturation. **Harmony** règle le niveau des octaves, tandis que **Pitch** — ou un vrai message MIDI Pitch Bend — transpose le biniou sur ±12 demi-tons. **Drive**, **Tone**, **Echo** et **Space** façonnent ensuite la chaîne d'effets.

## Stack

`HTML/CSS/JS` · `Web Audio API` · `AudioWorklet` · `Web Worker` · `PWA`

## Lancer en local

Pour tester aussi la PWA et le Service Worker, servez le dossier en HTTP local :

```bash
python3 -m http.server 8080
```

Puis ouvrez `http://localhost:8080` et appuyez sur **ARMEMENT SYSTÈME LIVE**.

## Validation

Le dépôt inclut un contrôle statique sans dépendances :

```bash
node scripts/validate.mjs
node scripts/test-audio-exports.mjs
node scripts/test-psytrance.mjs
```

La même validation est exécutée automatiquement par GitHub Actions sur les pushes et pull requests.

## Licence

[MIT](LICENSE) © 2026 Nicolas Julienne — Studio Niko Design
