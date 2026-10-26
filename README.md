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
- ⚡ **PSY V8 : cinq instruments jouables** TD-3, Volca FM2, Roland T-8, Theremin et PO-35 Speak dans un nouveau rack, deux pistes supplémentaires
- 📱 **PSY V9** : interface mobile revue, activation sonore non bloquante, DÉMO PSY immédiate, TEST SON et accès direct FX / WAV / MP3
- ☄ **Biniou électronique / Cyber Breton** : piste BINI dédiée, anche synthétique, drone A, harmoniseurs ±1 octave, pitch bend MIDI, drive, tone, echo et espace/reverb
- ↶ **Undo/Redo** sur les éditions de performance principales
- ⇩ **Export / import JSON** du projet complet
- ● **Enregistrement du master** en WebM/Ogg selon le navigateur (mode stéréo)
- 🎛️ **Studio Pro** : mute, solo, pan et EQ 3 bandes ±9 dB par piste
- 💿 **Export WAV PCM stéréo 16 bits et MP3 320 kb/s** depuis le master traité, avec AudioWorklet + encodeur en Worker utilisable hors ligne
- 🔊 Limiteur de sécurité master, options 4/8/16/32 mesures, progression et annulation
- 🔌 Web MIDI In/Out et routage audio 4 canaux
- 🧠 Ghost Pilot Mistral optionnel
- 💾 Sauvegarde locale des patterns et réglages
- 📱 PWA installable avec mode hors-ligne

## Égaliseur et nouvelles machines

Dans **FX**, l'égaliseur à 5 bandes agit sur le bus master stéréo avant l'analyseur et le compresseur. **EQ: BYPASS** met les cinq gains à 0 dB sans modifier leurs valeurs; **FLAT 0 dB** remet les réglages à plat. Le bus master conserve une marge de niveau de 0,72 pour limiter la saturation lors des boosts. En mode **MULTI-OUT 4CH**, les canaux physiques restent séparés et contournent cet égaliseur : ce dernier traite uniquement le bus FX/preview.

Les pistes **909 SNARE**, **808 HAT** et **SUB BASS** sont disponibles dans **SEQ**, disposent chacune de son volume, mutation et longueur dans **MIX**, et de paramètres de timbre + boutons **TEST** dans **FX**. Elles utilisent exclusivement la synthèse Web Audio. Les nouveaux patterns d'usine contiennent quelques rythmes de démonstration; les anciens projets JSON restent compatibles et chargent ces pistes vides pour préserver leur arrangement.

Les paramètres et les nouvelles pistes sont conservés par la sauvegarde locale, l'export/import JSON et l'historique Undo/Redo. Après mise à jour du site, actualiser l'application installée si nécessaire afin de charger le nouveau cache PWA.

## PSY V9 — Nouvelle interface téléphone et dépannage audio

Cette version corrige un problème d'ergonomie Android signalé après PSY V8 : un bouton audio au centre masquait la machine, le pattern BREAK presque silencieux pouvait rester sélectionné et les panneaux étaient comprimés en bas du téléphone.

- **ACTIVER LE SON** est maintenant **dans l'en-tête** : l'interface reste utilisable avant l'activation et indique clairement si l'AudioContext est activé, suspendu ou bloqué.
- **DÉMO PSY** sélectionne **C / DROP** et démarre le séquenceur sans effacer les patterns du projet. Les motifs BREAK restent accessibles sans être présentés comme une démo complète.
- **TEST SON** joue un kick et un son FM dans le vrai bus master, indépendamment du pattern sélectionné, pour diagnostiquer rapidement le volume du téléphone.
- **FX / WAV / MP3** ouvre directement le panneau des effets, de l'égaliseur master et des exports audio.
- **Mobile** : défilement vertical naturel de l'application au lieu d'un panneau bloqué à quelques dizaines de pixels ; onglets collants, grille de séquenceur en deux rangées de huit pas (cibles tactiles plus grandes), rack d'instruments en colonne.
- **Options avancées** (MIDI, multi-out, configuration IA, Undo/Redo, enregistrement rapide) sont repliées sur mobile mais restent accessibles. Sur ordinateur, le panneau avancé est développé automatiquement.
- **Stabilité audio** : pendant la reprise asynchrone de l'AudioContext, plusieurs pressions ne créent plus plusieurs moteurs Web Audio. Les échecs d'activation sont affichés dans l'interface.
- **PWA v9** : actualisation prioritaire des fichiers JavaScript et CSS quand le réseau est disponible ; les assets essentiels sont sauvegardés hors ligne.

**Mode d'emploi sur Android** : ouvrir le site dans Chrome → **ACTIVER LE SON** → **TEST SON** (kick + synthé FM) → **DÉMO PSY** → **MACHINES** ou **FX / WAV**. Si les commandes ne changent pas après une mise à jour, actualiser la page ou ouvrir le site dans un nouvel onglet Chrome.

## PSY V8 — Cinq instruments numériques jouables

**Nouveau : un onglet INSTRUMENTS et un gros bouton d’accès au rack.** Les cinq moteurs sont des interprétations numériques construites en Web Audio ; ils ne sont pas des produits officiels et n'utilisent aucun firmware ni sample propriétaire.

- **Behringer TD-3 / TB-303** : bassline acid avec oscillateurs en dents de scie et carré, filtre résonnant, enveloppe de filtre, accent, glide, cutoff. Connectée à la piste **ACID**.
- **Korg Volca FM2** : **6 oscillateurs FM**, deux porteuses et quatre modulateurs, trois algorithmes de modulation, index, profondeur de feedback, brillance et release. Connecté à **FM**.
- **Roland T-8** : boîte à rythmes inspirée des 808 / 909 : kick à pitch descendante et transitoire, snare bruitée, hi-hat métallique, kick tune/punch et hat open. Connectée à **KICK, SNARE et HAT**.
- **Stylophone Theremin** : un pad tactile XY qui contrôle en continu la hauteur et le volume avec vibrato et portamento. Disponible en direct et sur la nouvelle piste **THEREMIN**.
- **Teenage Engineering PO-35 Speak** : sampler vocal : enregistrer **3 secondes** au microphone ou charger un fichier audio local, puis jouer la voix avec pitch et coloration robotique sur la piste **SPEAK**. Sans échantillon vocal, un son robotique synthétisé reste disponible.

**Deux nouvelles pistes** portent le séquenceur à **10 pistes**. Les anciens projets sont migrés avec leurs pistes supplémentaires vides pour conserver les arrangements, et le nouveau projet propose des patterns d'exemple. Les réglages des machines sont enregistrés dans le projet et l'Undo/Redo; l'audio micro/importé n'est ni envoyé sur Internet ni sérialisé dans le JSON, donc il faut le recharger lors d'une nouvelle session. Le rendu WAV/MP3 du mix avec échantillon vocal reste possible. La permission du micro est indispensable pour enregistrer et MediaRecorder doit être pris en charge, sinon utiliser un fichier importé.

Une PWA précédemment installée peut conserver des fichiers anciens : ouvrir l'application depuis le navigateur et recharger la page. Le cache v8 et les scripts réseau-prioritaires facilitent les mises à jour.

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
node scripts/test-psy-machines.mjs
```

La même validation est exécutée automatiquement par GitHub Actions sur les pushes et pull requests.

## Licence

[MIT](LICENSE) © 2026 Nicolas Julienne — Studio Niko Design
