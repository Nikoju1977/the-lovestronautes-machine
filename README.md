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
- 🔌 Web MIDI In/Out et routage audio 4 canaux
- 🧠 Ghost Pilot Mistral optionnel
- 💾 Sauvegarde locale des patterns et réglages
- 📱 PWA installable avec mode hors-ligne

## Égaliseur et nouvelles machines

Dans **FX**, l'égaliseur à 5 bandes agit sur le bus master stéréo avant l'analyseur et le compresseur. **EQ: BYPASS** met les cinq gains à 0 dB sans modifier leurs valeurs; **FLAT 0 dB** remet les réglages à plat. Le bus master conserve une marge de niveau de 0,72 pour limiter la saturation lors des boosts. En mode **MULTI-OUT 4CH**, les canaux physiques restent séparés et contournent cet égaliseur : ce dernier traite uniquement le bus FX/preview.

Les pistes **909 SNARE**, **808 HAT** et **SUB BASS** sont disponibles dans **SEQ**, disposent chacune de son volume, mutation et longueur dans **MIX**, et de paramètres de timbre + boutons **TEST** dans **FX**. Elles utilisent exclusivement la synthèse Web Audio. Les nouveaux patterns d'usine contiennent quelques rythmes de démonstration; les anciens projets JSON restent compatibles et chargent ces pistes vides pour préserver leur arrangement.

Les paramètres et les nouvelles pistes sont conservés par la sauvegarde locale, l'export/import JSON et l'historique Undo/Redo. Après mise à jour du site, actualiser l'application installée si nécessaire afin de charger le nouveau cache PWA.

## Biniou électronique

Dans l'onglet **FX**, activez **BINIOU E** pour armer le clavier live et la nouvelle piste **BINI** du séquenceur. **DRONE A** ajoute un bourdon continu. Le mode **CYBER** ajoute une harmonisation à l'octave grave et aiguë, un vibrato plus nerveux et davantage de saturation. **Harmony** règle le niveau des octaves, tandis que **Pitch** — ou un vrai message MIDI Pitch Bend — transpose le biniou sur ±12 demi-tons. **Drive**, **Tone**, **Echo** et **Space** façonnent ensuite la chaîne d'effets.

## Stack

`HTML/CSS/JS single-file` · `Web Audio API` · `PWA`

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
```

La même validation est exécutée automatiquement par GitHub Actions sur les pushes et pull requests.

## Licence

[MIT](LICENSE) © 2026 Nicolas Julienne — Studio Niko Design
