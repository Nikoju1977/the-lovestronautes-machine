![Thelovestronautes Machine](banner.svg)

# Thelovestronautes Machine

> **Projet signature · 05/06 · WEB AUDIO** — [Étude de projet : problème, choix techniques et limites](https://github.com/Nikoju1977/Nikoju1977/blob/main/SHOWCASE.md) · [Portfolio Studio Niko Design](https://github.com/Nikoju1977).


[![Démo](https://img.shields.io/badge/Démo-en_ligne-00ff9d?style=flat-square&labelColor=050a0d)](https://nikoju1977.github.io/the-lovestronautes-machine/) [![PWA](https://img.shields.io/badge/PWA-installable-00d4ff?style=flat-square&labelColor=050a0d)](#) [![Licence](https://img.shields.io/badge/Licence-MIT-9fb4ba?style=flat-square&labelColor=050a0d)](LICENSE)

**Machine musicale dans le navigateur** — séquenceur pas-à-pas Web Audio pour créer des grooves psytrance, par le projet [Thelovestronautes](https://soundcloud.com/nicolas-julienne-670246252).

**Démo** : [nikoju1977.github.io/the-lovestronautes-machine](https://nikoju1977.github.io/the-lovestronautes-machine/)

## Fonctionnalités

- 🥁 Séquenceur pas-à-pas Web Audio, sans samples externes
- 🎚️ BPM éditable + Tap Tempo, **swing 50–75 %**, morphing et automation live
- 🎛️ Mixeur 11 pistes, chaos pad, clavier tactile et oscilloscope temps réel
- 🎚️ **Égaliseur master 5 bandes** (80, 250, 1 000, 4 000, 10 000 Hz), ±12 dB, bypass, reset et mémorisation
- 🥁 **Trois nouvelles machines** : 909 Snare, 808 Hi-Hat et Sub Bass, séquenceurs 16 pas et paramètres de synthèse réglables
- ⚡ **PSY V8 : cinq instruments jouables** TD-3, Volca FM2, Roland T-8, Theremin et PO-35 Speak dans un nouveau rack, deux pistes supplémentaires
- 🎹 **PSY V12 : synthé S1 MK2 inspiré du Cwejman** — 3 VCO, ring modulation, noise, deux filtres LPF/MMF, EG1/EG2, LFO, 4 presets, clavier et 11ᵉ piste MIDI-like
- 📱 **PSY V9** : interface mobile revue, activation sonore non bloquante, DÉMO PSY immédiate, TEST SON et accès direct FX / WAV / MP3
- 🎼 **PSY V10** : Song Mode et timeline 192 mesures, Kick & Bass Lab rolling K-B-B-B, Melody Lab tonal 64 pas, export complet WAV/MP3
- 🔧 **PSY V11** : stabilisation audio mobile (anti-surcharge, anti-craquements) et PO-35 vocal micro PCM avec réécoute d'échantillons complets
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

## PSY V11 — Corrections des coupures de son et du sampler vocal

Cette version cible deux défauts remontés sur téléphone Android : des interruptions / crépitements sonores et le sampler vocal **PO-35 Speak** qui ne restitue pas correctement une vraie prise micro.

**Stabilité du moteur** :
- Les 6 oscillateurs FM de chaque note restent disponibles, mais la polyphonie du moteur FM est désormais limitée à **3 voix simultanées** avec coupure progressive de la voix la plus ancienne. Le sampler SPEAK conserve 2 voix maximum.
- Lorsque le téléphone met l'onglet en arrière-plan puis le réactive, le scheduler **se resynchronise** au temps audio courant et limite le nombre de pas préparés par cycle, évitant un rattrapage massif de notes.
- Le morphing graphique / FX réalloue moins souvent sa courbe waveshaper (≈ 9 fois/s au maximum en automation, au lieu de 60). Le HUD analyse à environ 20 FPS et le drive Biniou désactive l'oversampling 2x sur mobile.
- L'application indique explicitement quand le contexte audio est suspendu / interrompu, avec la commande **REPRENDRE LE SON**.

**PO-35 Speak** :
- Enregistrement du micro en **PCM Web Audio** (AudioWorklet, repli ScriptProcessor) pendant trois secondes. Cette capture directe contourne des incompatibilités WebM / Opus / MediaRecorder rencontrées dans certains navigateurs mobiles.
- Plus de coupure à 0,2–0,7 seconde : un échantillon importé ou enregistré peut être lu jusqu'à **4 secondes** (ou jusqu'à la durée totale du fichier si plus court), avec un fondu d'entrée / sortie.
- Le timbre robotique conserve un signal vocal intelligible en parallèle de la modulation. Une prise valide se réécoute automatiquement après l'enregistrement ; **TEST VOIX** permet de la rejouer.
- Messages de statut et compteur 3–2–1, prévention du double enregistrement, arrêt automatique des pistes micro, bouton **EFFACER MA VOIX**. Aucun envoi de voix à un serveur.
- Le nouvel encodeur PCM AudioWorklet est enregistré au maximum une fois par contexte, partagé entre le micro et l'export WAV/MP3.

**Pour tester** : dans Chrome Android, ouvrir le site → **ACTIVER LE SON** → **MACHINES** → **PO-35 SPEAK** → **MICRO 3 S** → accorder la permission micro → parler pendant le décompte → écouter la réécoute automatique ou appuyer sur **TEST VOIX**. Vérifier que la piste SPEAK n'est pas mutée dans **MIX**. Pour éviter de réenregistrer, importer un fichier WAV ou MP3. L'échantillon est gardé en mémoire tant que la page reste ouverte, mais **pas** dans l'export JSON du projet.

Les tests automatisés vérifient la durée de la voix, la capture PCM simulée, la fermeture du flux micro et la polyphonie. L'écoute humaine et la vraie autorisation du micro sur Android doivent encore être confirmées sur l'appareil final.

## V11 — Stabilité audio et sampler vocal Android

- Polyphonie FM limitée à deux notes simultanées, et sampler vocal à une seule voix à la fois pour réduire les pics CPU.
- Samples vocaux joués pendant 3 s maximum par pas ; la phrase enregistrée de 3 s se lit entièrement, sans nouveau déclenchement pendant sa lecture, afin d'éviter l'accumulation des voix sur le séquenceur.
- Préécoute des cinq machines attend désormais réellement l'autorisation de l'AudioContext avant de déclencher le son, notamment sur Android.
- Enregistrement micro PCM avec protection contre les captures simultanées, messages d'erreur explicites et option **IMPORT AUDIO** en secours.
- Cache PWA v11 : nouvelle version des scripts distribuée aux utilisateurs.

**Limite :** les tests de code ne remplacent pas un essai du micro et du haut-parleur sur le téléphone concerné. Le micro nécessite HTTPS, une permission accordée et une capture audio compatible.

## PSY V12 — S1 MK2 ANALOG LAB : sixième synthétiseur

Nouveau **synthétiseur numérique semi-modulaire inspiré du Cwejman S1 MK2**, jouable dans **MACHINES → S1 MK2** ou via le bouton visible **NOUVEAU SYNTHÉ VINTAGE · S1 MK2**. Il est entièrement construit avec Web Audio et ne nécessite ni serveur, ni abonnement, ni clé API.

**Signal de synthèse :** trois oscillateurs indépendants avec sinusoïde, triangle, dent de scie et pulse à largeur ajustable, réglage des niveaux, transpositions et accordages fins. **VCO2 × VCO3** utilisent une modulation en anneau réelle via un VCA modulé à fréquence audio. Un générateur de bruit complète les sources. L'étage de drive, les filtres et la sortie VCA sont reliés au mixeur du studio.

**Filtres :** filtre LPF sélectionnable **4 ou 6 pôles**, plus un **filtre multimode LP / HP / BP** sélectionnable **2, 4 ou 6 pôles** ; routage en série ou parallèle, contrôle de fréquence, résonance, balance et enveloppe de filtre. Les pentes sont des approximations numériques par cascades de filtres Biquad, pas des modèles électriques exacts.

**Modulations et enveloppes :** une enveloppe d'amplitude ADSR, une enveloppe de filtre et un LFO appliqué aux fréquences de coupure. Le rendu est **monophonique** ; les voix précédentes sont éteintes progressivement pour éviter une consommation CPU excessive sur smartphone.

**Préréglages musicaux :** PSY LEAD, SOLID ANALOG BASS, MODULAR RING INDUSTRIAL, COSMIC FILTER SPACE. Les boutons TEST et le clavier tactile permettent d'écouter les patches avant de programmer les notes.

**Intégration complète :**
- **SEQ :** piste « S1 MK2 · ANALOG », 16 pas par pattern A/B/C/D ; la piste existe dans les anciens projets sans détruire leurs patterns.
- **MORCEAU :** génération tonale de notes S1 dans les quatre patterns, et édition des **64 pas** via le Melody Lab.
- **MIX :** volume, mute, solo, pan et EQ 3 bandes spécifiques au S1.
- **FX / WAV / MP3 :** la sortie S1 passe dans le master comme les autres instruments et figure dans la capture des arrangements.
- **PWA v12 :** moteur et interface S1 disponibles hors ligne après chargement initial ; presets et contrôles restaurés via la sauvegarde JSON.

**Pour écouter sur Android :** ouvrir le site → **ACTIVER LE SON** → **NOUVEAU SYNTHÉ VINTAGE · S1 MK2** → **▶ ÉCOUTER S1**. Régler ensuite le filtre LPF, la résonance ou choisir un preset. Pour composer, activer ses pas dans **SEQ** ou choisir **S1 MK2** dans le piano roll de **MORCEAU**.

Cette création est **non officielle**, sans affiliation avec Cwejman Music. Il s'agit d'une interprétation de fonctionnalités typiques du synthétiseur, et non d'une émulation matérielle authentifiée. Aucune ROM, échantillon ou interface propriétaire n'est reproduit.

## PSY V10 — Song Mode, Kick & Bass Lab et Melody Lab

**Un nouvel onglet MORCEAU** permet de passer de quatre boucles à une vraie composition continue.

### 01 · PSY TRACK CREATOR
Choisir style (**Full-On, Dark Psy, Progressive, Forest Psy**), BPM 125–165, tonique, gamme (mineur, phrygien, mineur harmonique) et énergie 0–100 %. **GÉNÉRER LES 4 PATTERNS / 64 PAS** remplace les motifs des quatre patterns après sauvegarde Undo. Génération déterministe à partir de la même graine pour conserver la cohérence musicale. Elle crée un groove de kick/basse rolling K-B-B-B, des lignes acid, des leads FM et des notes de theremin. La basse suit les fondamentales de la progression tonale. Le contrôle *chaos* est neutralisé lors de la génération pour éviter les réécritures aléatoires du morceau pendant la lecture.

### 02 · KICK & BASS LAB
Kick quatre temps et basse sur les **douze autres doubles croches** de la mesure. Nouvelle enveloppe basse à gate court et deux oscillateurs (sinusoïde + dent de scie) pour limiter les chevauchements des graves. Réglages **TIGHT, CUTOFF, DRIVE, LEVEL** avec test instantané d'une mesure. La basse utilise le bus mixer SUB existant, donc fonctionne avec mute/solo, EQ et export.

### 03 · SONG MODE
Arrangement modifiable par section : nom, pattern A/B/C/D et durée 4–64 mesures ; ajout/suppression de sections (maximum 24). Une timeline affiche le morceau et surligne la section active pendant la lecture. Au **changement de mesure**, la lecture passe réellement au nouveau pattern tout en continuant le séquenceur. L'arrangement standard est :

| Section | Pattern | Mesures |
|---|---|---:|
| Intro | A | 16 |
| Build | B | 32 |
| Drop | C | 48 |
| Break | D | 16 |
| Rise | B | 24 |
| Final Drop | C | 40 |
| Outro | A | 16 |

**192 mesures = environ 5 min 18 s à 145 BPM.** La durée de 40 mesures du Final Drop est conservée dans les exports/imports JSON ; le BPM du Song Mode est synchronisé avec le tempo choisi dans Track Creator (même lorsqu'un ancien projet utilisait 128 BPM). Le bouton **LIRE LE MORCEAU** joue toute la timeline ; le bouton **EXPORT MORCEAU WAV / MP3** ouvre le panneau FX avec la nouvelle option **MORCEAU ENTIER**, pour capturer le master complet en temps réel. Gardez l'onglet actif ; un rendu de cinq minutes occupe beaucoup de mémoire, notamment sur Android. Préférez des sections plus courtes pour un premier essai sur un mobile modeste.

### 04 · MELODY LAB
Éditeur tactile de **quatre patterns de 16 pas**, soit 64 pas par piste pour FM2, acid et theremin. Choisir une gamme et une note ; toucher les pas pour les écrire. Les données restent les vraies notes du projet, enregistrées via les sauvegardes JSON et Undo/Redo. La génération conserve les harmonies d'une tonalité et d'une progression.

Les anciens projets sont compatibles : les réglages créateur absents sont initialisés avec des valeurs par défaut sans effacer les patterns existants. Le moteur ne requiert aucun serveur externe. Les quatre patterns existants restent la source de vérité de l'arrangement et peuvent être modifiés dans SEQ, MIX ou MACHINES.

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
node scripts/test-track-creator.mjs
node scripts/test-voice-reliability.mjs
```

La même validation est exécutée automatiquement par GitHub Actions sur les pushes et pull requests.

## Licence

[MIT](LICENSE) © 2026 Nicolas Julienne — Studio Niko Design
