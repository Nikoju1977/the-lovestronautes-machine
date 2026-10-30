![Thelovestronautes Machine](banner.svg)

# Thelovestronautes Machine

> **Projet signature · 05/06 · WEB AUDIO** — [Étude de projet : problème, choix techniques et limites](https://github.com/Nikoju1977/Nikoju1977/blob/main/SHOWCASE.md) · [Portfolio Studio Niko Design](https://github.com/Nikoju1977).


[![Démo](https://img.shields.io/badge/Démo-en_ligne-00ff9d?style=flat-square&labelColor=050a0d)](https://nikoju1977.github.io/the-lovestronautes-machine/) [![PWA](https://img.shields.io/badge/PWA-installable-00d4ff?style=flat-square&labelColor=050a0d)](#) [![Licence](https://img.shields.io/badge/Licence-MIT-9fb4ba?style=flat-square&labelColor=050a0d)](LICENSE)

**Machine musicale dans le navigateur** — séquenceur pas-à-pas Web Audio pour créer des grooves psytrance, par le projet [Thelovestronautes](https://soundcloud.com/nicolas-julienne-670246252).

**Démo** : [nikoju1977.github.io/the-lovestronautes-machine](https://nikoju1977.github.io/the-lovestronautes-machine/)

## V23 — Composition Pro

Le bouton **COMPOSER UN MORCEAU** ouvre un espace de composition relié aux 18 synthés et au mixeur existants. [Guide pratique](COMPOSITION_GUIDE.md).

| Travail musical | Fonctionnement |
| --- | --- |
| Phrases | Jusqu’à 16 clips indépendants de 1, 2, 4 ou 8 mesures ; copie de mesures et duplication de clips |
| Piano roll | Notes, vélocité, durée, probabilité et décalage ±20 ms ; une note par pas et par piste |
| Harmonie | Six gammes, accordage des notes et transposition ; les percussions restent fixes |
| Structure | Jusqu’à 32 sections, répétitions, ordre, transposition et choix des pistes actives ; 1 024 mesures maximum |
| Ableton / autres DAW | MIDI type 1, 18 pistes nommées + piste tempo et marqueurs, 480 PPQ, swing et durées |
| Audio | WAV PCM stéréo 16/24 bits et MP3 320 kb/s, fréquence réelle du navigateur, capture en temps réel |
| Projet | Sauvegarde locale, import/export JSON, historique Annuler/Rétablir ; migration des anciens projets |

Les clips sont initialisés à partir de copies des patterns A–D. Les modifications de clips et de patterns sont ensuite indépendantes. L’export suit le même plan de notes que la lecture ; Mute/Solo et les pistes de section sont respectés. La durée des synthés à enveloppe ADSR inclut leur relâchement. Les percussions et les extraits audio gardent leur propre durée acoustique.

La fin d’un morceau attend désormais l’horloge audio au lieu de couper les dernières notes pendant l’anticipation du séquenceur. Les exports sont recadrés sur les trames PCM et comprennent 1,6 seconde de fin d’effets, sans premier pas supplémentaire de la boucle suivante. Les exports longs sont bornés à 180 Mo de PCM pour limiter la pression mémoire. Garder la page visible est nécessaire. Le MIDI contient les notes ; les sons des synthés, les effets et les échantillons ne sont pas incorporés dans le `.mid`.

Validation : tests de clips/sections, décodage MIDI indépendant, WAV 24 bits, recadrage PCM, régressions des instruments et tests navigateur dans GitHub Actions. Le test Chromium de composition édite les notes, utilise Annuler/Rétablir, mesure le signal du master et contrôle les fichiers réellement téléchargés sur deux formats d’écran. Les tests WebKit ne remplacent pas une écoute sur un iPhone physique.

## Fonctionnalités

- 🥁 Séquenceur pas-à-pas Web Audio, sans samples externes
- 🎚️ BPM éditable + Tap Tempo, **swing 50–75 %**, morphing et automation live
- 🎛️ Mixeur 18 pistes, chaos pad, claviers tactiles et oscilloscope temps réel
- 🎚️ **Égaliseur master 5 bandes** (80, 250, 1 000, 4 000, 10 000 Hz), ±12 dB, bypass, reset et mémorisation
- 🥁 **Trois nouvelles machines** : 909 Snare, 808 Hi-Hat et Sub Bass, séquenceurs 16 pas et paramètres de synthèse réglables
- ⚡ **PSY V8 : cinq instruments jouables** TD-3, Volca FM2, Roland T-8, Theremin et PO-35 Speak dans un nouveau rack, deux pistes supplémentaires
- 🎹 **PSY V12 : synthé S1 MK2 inspiré du Cwejman** — 3 VCO, ring modulation, noise, deux filtres LPF/MMF, EG1/EG2, LFO, 4 presets, clavier et 11ᵉ piste MIDI-like
- 🌿 **PSY V13 : Pittsburgh Taïga Analog Lab** — 3 oscillateurs avec wavefolding numérique six étapes, filtre multimode, dynamics/LPG, deux ADSR, LFO/S&H et Echos. Nouvel instrument jouable et 12ᵉ piste.
- 🎹 **Claviers V13** : piano à véritables touches blanches/noires, gliss tactile, pression relâchée proprement, octaves réglables, choix de l’instrument, notes MIDI + clavier PC, raccourci direct sur Android.
- 📱 **PSY V9** : interface mobile revue, activation sonore non bloquante, DÉMO PSY immédiate, TEST SON et accès direct FX / WAV / MP3
- 🎼 **PSY V10** : Song Mode et timeline 192 mesures, Kick & Bass Lab rolling K-B-B-B, Melody Lab tonal 64 pas, export complet WAV/MP3
- 🔧 **PSY V11** : stabilisation audio mobile (anti-surcharge, anti-craquements) et PO-35 vocal micro PCM avec réécoute d'échantillons complets
- ☄ **Biniou électronique / Cyber Breton** : piste BINI dédiée, anche synthétique, drone A, harmoniseurs ±1 octave, pitch bend MIDI, drive, tone, echo et espace/reverb
- ↶ **Undo/Redo** sur les éditions de performance principales
- ⇩ **Export / import JSON** du projet complet
- ● **Enregistrement du master** en WebM/Ogg selon le navigateur (mode stéréo)
- 🎛️ **Studio Pro** : mute, solo, pan et EQ 4 bandes ±9 dB par piste
- 💿 **Export WAV PCM stéréo 16/24 bits et MP3 320 kb/s** depuis le master traité, avec AudioWorklet + encodeur en Worker utilisable hors ligne
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

## V19 — GRANDMOTHER · Studio analogique semi-modulaire

Le synthétiseur **Moog Grandmother** a inspiré ce module **numérique indépendant, non officiel**, disponible gratuitement sur Android Chrome, iPhone/iPad Safari et navigateurs de bureau. Il complète le studio, qui possède désormais **18 pistes**.

- **Deux VCO monophoniques** : triangle, dent de scie, carré et impulsion, choix d'octave, accordage oscillateur 2, PWM simplifiée, mixage de bruit blanc et préamplification.
- **Filtre style ladder 24 dB/octave** : deux biquads 12 dB en cascade (approximation numérique, pas un modèle physique des transistors Moog), résonance, filtre passe-haut et enveloppe de filtre.
- **ADSR, LFO et glide** : enveloppe de volume, modulation vers pitch, cutoff ou les deux, portamento et synchronisation harmonique simulée.
- **Réverbération façon ressort** : double ligne de retard avec amortissement et faible feedback, volontairement limitée en CPU ; ce n'est pas une réverbération à ressort analogique réelle.
- **Cinq patches** : Deep Ladder Bass, Acid Modular Lead, Dark Vintage Drone, Cosmic Analog Keys, Rave Pulse 140.
- **ARP autonome à huit notes** : synchronisé au BPM de Lovestronautes, avec START/STOP explicites et arrêt à la fermeture. Le Grandmother physique offre un arpégiateur et un séquenceur 256 pas ; notre module inclut un **arpège fixe de huit notes et la piste 16 pas commune**, pas une émulation 256 pas.
- **Piste 18, mixeur et exports** : séquenceur A/B/C/D, volumes, EQ 4 bandes, pan, mute/solo, enregistrement et export WAV/MP3, clips BOUCLES et Melody Lab 64 pas.
- **Clavier LIVE tactile et MIDI** : sélection Grandmother, sustain tant qu'une touche est maintenue, note-off à la fin du toucher et relâchement des voix. Safari iOS ne prend pas nativement en charge Web MIDI.
- **Sauvegardes rétrocompatibles** : les anciens projets restent valables. La nouvelle piste commence silencieuse par défaut pour ne pas modifier les morceaux déjà enregistrés. Les paramètres sont enregistrés dans le JSON et le cache PWA.
- **Mode mobile** : un maximum d'une voix à la fois, un seul AudioContext partagé, pas de chargement de sample pour ce synthé, rack de réglages à colonnes adaptatives.

Pour jouer : **ACTIVER LE SON → GRANDMOTHER · OUVRIR → PATCH → TEST SYNTHÉ**. Choisir **GRANDMOTHER** dans le clavier LIVE pour jouer au doigt ou avec un contrôleur MIDI compatible, ou dessiner des notes sur la piste 18 du séquenceur.

**Limites :** le module ne reproduit ni les circuits analogiques originaux, ni les 41 prises patch CV, ni la réverbération mécanique, ni les trois mémoires 256 pas du Grandmother réel. Il ne communique pas avec le matériel Moog. Les tests automatisés Chromium/WebKit restent distincts d'un essai audio physique sur un vrai téléphone.

## V18 — Import audio 100 Mo, moteur anti-coupures et interface mobile

Cette version améliore la stabilité du **Field Kit** et de la **Lovestronautes Machine à 17 pistes**, sans nécessiter de serveur.

### Import AUDIO jusqu'à 100 Mo par fichier

- **100 Mio maximum (104 857 600 octets)** pour l'import audio Field Kit, soit environ 105 Mo en unités décimales.
- **WAV PCM/float classique :** lecture par tranches de fichiers depuis le navigateur (pas de chargement intégral des 100 Mo). Un extrait de **12 secondes maximum** est converti en sample mono local, jouable en séquenceur et exportable avec le studio. S'il reste du contenu après l'extrait, le fichier complet peut également être lu par streaming.
- **MP3/M4A/OGG et autres formats pris en charge par le navigateur :** petits fichiers de 4 Mio maximum et 12 secondes maximum décodés en sample ; sinon le fichier complet est lu avec `HTMLAudioElement` via `MediaElementAudioSourceNode` dans le mixeur Field Kit. **Pas de conversion intégrale d'un gros MP3 en PCM**, ce qui limite le risque d'épuisement mémoire sur iOS/Android.
- L'import est **local** via `Blob URL`. Il n'envoie pas le fichier audio à un serveur. On libère l'URL et le moteur de lecture quand le fichier est effacé ou remplacé.
- Nouveau bouton **▶ LIRE FICHIER LONG / ■ STOP FICHIER LONG**, plus un état d'import visible. Sélectionner une voie **SAMPLE / REC** pour entendre l'enregistrement.
- **Limites explicites :** lecture de gros fichiers compressés = streaming en temps réel, non garanti sample-accurate sur le premier pas ; les codecs et formats dépendent des capacités du navigateur. L'export WAV/MP3 en temps réel capture le bus Web Audio si ce streaming y est routé. Un sample long n'est pas sérialisé dans le JSON. Les WAV compressés/non standards utilisent le streaming si pris en charge.

### Stabilité audio / mode ECO

- Mode **STABILITÉ AUDIO · ÉCO ON** par défaut sur écrans tactiles. Il réduit la fréquence de l'oscilloscope et la charge visuelle ; on peut repasser en mode studio.
- Nouveau bouton **↻ RÉACTIVER AUDIO** pour relancer le Web Audio suspendu par le navigateur.
- Si l'application passe en arrière-plan en mode ECO, le séquenceur et les fichiers longs se mettent en pause plutôt que de déclencher un rattrapage massif et des craquements au retour.
- **Circuit breaker audio** : après quatre exceptions rapprochées du séquenceur, le transport s'arrête avec un message clair ; une note fautive ne déclenche plus de boucle d'erreurs sans fin.
- Les modifications aléatoires du séquenceur ne provoquent plus de sauvegardes JSON et de reconstruction des 17 pistes dans la boucle de scheduling audio : ces travaux sont différés.
- Le mode ECO conserve les 17 instruments, les presets, le clavier tactile, le mixeur EQ, les boucles et l'export.

### Ergonomie

- Boutons téléphone plus grands, textes et contrastes plus lisibles, panneaux Field Kit simplifiés avec **une voie par ligne sur petit smartphone**, onglets accessibles et raccourci **FIELD KIT** dans le dock bas.
- Zone d'import 100 Mo mise en évidence, contrôles de démarrage et stabilité visibles dans le cockpit, adaptation iOS/Android et respect des marges de sécurité.
- Les tests automatisés de synthèse, export, import limité en mémoire, Chromium et WebKit sont effectués en CI. **Ils ne garantissent pas l'absence totale de coupures sur des appareils physiques** ; tester avec écoute au casque sur un véritable iPhone et Android reste nécessaire.

## V17 — KOMA FIELD KIT / Interface mobile / EQ PRO

Version **V17 · Electroacoustic Lab**, utilisable sans compte, clé API ni serveur depuis Safari sur iOS ou Chrome sur Android. Les 16 anciennes pistes et leurs projets restent compatibles ; **FIELD KIT** devient la **17e piste**.

### FIELD KIT, instrument virtuel non officiel

Notre moteur Web Audio s'inspire du **KOMA Elektronik Field Kit**, une station électroacoustique connue notamment pour son mixeur quatre voies, la radio à commande CV, le suiveur d'enveloppe, le LFO et les interfaces de capteurs et de moteurs.

- **Quatre voies indépendantes** avec GAIN/PREAMP, LEVEL, tonalité passe-bas/passe-haut, départ auxiliaire et retour AUX/delay. Tous les signaux aboutissent au bus FIELD KIT du mixeur (mute, solo, EQ, volume et master export WAV/MP3).
- **Sources virtuelles** : oscillateur, bruit/contact, radio synthétique modulée, moteur synthétique, sample importé, micro direct avec autorisation. Le son de RADIO/MOTEUR est **simulé par synthèse**, sans capter de véritables fréquences radio ni piloter des moteurs.
- **CV numérique** : LFO, capteur virtuel, recherche radio et suiveur d'enveloppe. Le **suiveur d'enveloppe utilise réellement le niveau RMS du microphone activé** et fournit un indicateur de gate ; ces valeurs peuvent moduler les textures radio virtuelles.
- **Samples** : import de fichiers audio décodables localement (jusqu'à 15 Mo), conversion mono et limite 12 secondes, enregistrement micro de 3 secondes via le captureur PCM interne. Les pistes "SAMPLE" restent silencieuses si aucun fichier n'est chargé.
- **Confidentialité** : aucune donnée audio transmise à un serveur. Le microphone réclame une autorisation explicite ; le monitoring ne fonctionne que lorsque l'utilisateur active "MICRO LIVE" sur une voie MIC et s'arrête lorsque la page passe en arrière-plan. Utiliser un casque pour éviter le larsen. Les samples sont **en mémoire seulement** ; l'export JSON mémorise les réglages, pas le fichier audio lui-même.
- **Quatre patches** : FIELD RECORDING, ANTENNA / RADIO CV, CONTACT / INDUSTRIAL, ORGANIC DRONE.
- **Séquenceur et Boucles** : FIELD KIT s'ajoute aux patterns A/B/C/D, au piano roll 64 pas et à la sortie mixée. Voix audio bornées et nettoyées pour limiter les charges sur téléphone.

### Interface repensée sur téléphone et tablette

- Barre **SON / PLAY / SEQ / MIX / EQ / BOUCLES** toujours visible en bas des écrans iOS/Android, avec respect des marges de sécurité de l'écran.
- Onglets défilants lisibles et cibles tactiles d'au moins 44 px pour les actions clés, pas du séquenceur plus larges, pistes MIX accessibles par défilement horizontal et **EQ repliables** pour conserver la place.
- **Égalisation quatre bandes par piste** (LOW, MID, PRESENCE, HIGH), fréquences optimisées par instrument, presets Neutre/Punch/Clarté/Chaleur/Air/Sub Focus, recommandation AUTO STYLE, bypass, mémorisation de toutes les valeurs.
- Protection du niveau d'entrée de chaque canal : **réduction automatique de gain avant les boosts EQ** afin de limiter les saturations en mixage.
- **Master EQ cinq bandes** : six presets, BYPASS/FLAT, compensation automatique des boosts avant le traitement master et affichage de la marge de gain.
- Le clavier multi-touch, le séquenceur, les exports, la création de boucles, les autres instruments, l'import/export JSON et la PWA sont conservés.

### Usage rapide

1. Ouvrir le site puis **ACTIVER LE SON** (Safari sur iPhone/iPad ou Chrome sur Android).
2. Toucher **FIELD KIT · SAMPLER / MIXER / RADIO**, choisir un preset, puis **ÉCOUTER FIELD KIT**.
3. Dans **FIELD KIT**, choisir `SAMPLE` sur une voie puis **IMPORT AUDIO**, ou **REC MICRO 3 S**. Pour utiliser `MICRO DIRECT`, choisir cette source et activer **MICRO LIVE** avec un casque.
4. Dans **SEQ**, activer quelques pas FIELD KIT et lancer PLAY ; utiliser **BOUCLES** pour répéter ou exporter.
5. Dans **MIX**, ouvrir **EQ 4 BANDES** sur une piste, appuyer sur **AUTO STYLE** ; dans **EQ**, choisir un preset master avant l'export WAV/MP3.

**Limites :** aucune lecture de vraie radio AM/FM/SW, aucune interface CV / moteurs / capteurs matériels, pas de sauvegarde binaire du sample dans le JSON, et aucune garantie d'absence de coupures sur tous les modèles de téléphones sans essai physique. Il s'agit d'un instrument inspiré du Field Kit, **sans affiliation avec KOMA Elektronik ni émulation exacte des composants analogiques**.

## PSY V16 — Compatibilité iOS Safari et Android Chrome

**Objectif :** faire fonctionner le même studio Web Audio sur iPhone/iPad (Safari, y compris l'application web ajoutée à l'écran d'accueil) et sur téléphones/tablettes Android (Chrome/PWA), sans serveur ni clé API.

**Correctifs réels :**
- **Déverrouillage audio** au toucher : `AudioContext.resume()` est lancé dans le geste utilisateur, avec un **délai maximal de 4,5 secondes**. Si Safari reste suspendu (problème WebKit parfois observé en PWA), l'application signale le blocage au lieu de rester figée ; l'utilisateur peut réessayer après avoir rouvert la page ou relancé le navigateur.
- **Enregistrement master compatible** : choix automatique du format disponible. Chrome utilise généralement Opus/WebM (`.webm`), Safari iOS utilise AAC/MP4 (`.m4a`). L'extension du fichier reflète le conteneur réellement enregistré. Les erreurs et enregistrements vides sont signalés ; **EXPORT WAV** reste disponible.
- **Capture PCM WAV/MP3** : si Safari accepte le module AudioWorklet mais refuse la création de son nœud, le studio utilise son repli `ScriptProcessor` quand il est disponible.
- **Microphone** : nettoyage garanti après un échec de `createMediaStreamSource`, sans verrou d'enregistrement restant bloqué. Permissions accordées uniquement avec HTTPS et une action de l'utilisateur.
- **Clavier multitouch** : le choix de l'instrument est conservé pendant un éventuel déverrouillage audio asynchrone, notamment lors des changements de preset ou des touches rapides.
- **Téléchargements iOS** : les URL de fichiers WAV/MP3/MP4 restent accessibles plus longtemps pour laisser à Safari le temps de présenter l'enregistrement.
- **Accessibilité iOS** : l'utilisateur peut zoomer dans Safari ; les contrôles audio et les touches restent tactiles.
- **PWA v16** : le nouvel assistant de compatibilité audio est installé dans le cache hors ligne.
- **Tests de régression** : cas Safari MP4, Android WebM, déblocage audio, blocage WebKit, capture PCM et claviers. Les suites des synthétiseurs, des 16 pistes, des boucles et des exports restent exécutées dans GitHub Actions.

**Limites importantes :** Web MIDI n'est pas disponible dans Safari iOS, même si le clavier tactile fonctionne. L'enregistrement du master dépend de `MediaRecorder` et de ses codecs ; l'export WAV/MP3 utilise le moteur PCM indépendant. Sur certains iPhone/iPad, un bug système WebKit peut empêcher la reprise audio d'une PWA après suspension malgré nos correctifs. Les tests de CI Chromium et de logique Safari ne remplacent pas des écoutes physiques sur iPhone, iPad et Android.

## PSY V15 — QUATRE NOUVELLES MACHINES

Le studio comprend quatre nouveaux instruments **Web Audio indépendants, inspirés de matériels réels**, ajoutés en tant que pistes 13 à 16 avec presets, mixage séparé et intégration aux exportations des boucles et morceaux.

1. **JOMOX MBase 11 Kick Lab** : grosse caisse électronique avec attaque pulse/noise, pente de hauteur et decay, harmoniques, EQ et métalisation de l'attaque. Presets **Psy Punch**, **Deep Sub**, **Hard Techno** et **EBM**.
2. **ELTA Music SOLAR 50 Drone Lab** : cinq oscillateurs légèrement désaccordés par note pour créer des drones, nappes et textures filmiques. Le matériel original possède 10 groupes de cinq oscillateurs (50 oscillateurs analogiques). Cette version Web Audio est volontairement plus légère : deux notes simultanées maximum.
3. **JOMOX MOD FM** : moteur FM à quatre opérateurs, trois routages (**chain**, **parallel**, **split**), rapports de fréquences, profondeur FM, ADSR et filtre. L'original offre 26 algorithmes et huit voix : ce logiciel n'en reproduit qu'une petite partie.
4. **Meng Qi Wing Pinger** : percussions et résonances stéréo inspirées du ping de deux filtres quatre pôles, avec pitch, Q, modulation croisée, chaos et decay, approchés à partir de Biquad numériques.

**Intégration :** MACHINES contient quatre panneaux tactiles avec boutons TEST et presets. Le séquenceur comporte désormais **16 pistes**, les nouvelles pistes étant silencieuses par défaut afin de préserver les anciens morceaux. Tu peux les activer dans SEQ, les jouer depuis le clavier LIVE, et éditer les notes mélodiques dans MORCEAU. MIX gère séparément volume, mute, solo, panoramique et EQ. Les réglages sont conservés dans le projet JSON et les fichiers sont disponibles hors ligne par PWA.

**Stabilité :** les moteurs sont soumis à des limites de polyphonie et nettoient leurs nœuds. Les tests automatiques ne remplacent pas un essai audio sur Android. Ce sont des interprétations indépendantes non affiliées à Jomox, ELTA Music ou Meng Qi.

## PSY V14 — LOOP STUDIO : créer et exporter des boucles

L'onglet **BOUCLES** permet désormais de programmer des boucles musicales réelles à partir des 12 pistes du séquenceur, en partant de l'un des quatre patterns **A/B/C/D**. Choisis **1, 2, 4, 8, 16 ou 32 mesures**, touche **BOUCLER EN CONTINU** pour entendre la répétition parfaitement synchronisée au tempo et **STOP** pour l'arrêter.

- Les boucles sont **éditables** : les notes et percussions proviennent des 16 pas de chaque instrument du pattern. Une boucle de 8 mesures répète ce pattern pendant 8 mesures ; pour les variations de sections, utilise l'onglet MORCEAU.
- **Bibliothèque de boucles nommées** : sauvegarde jusqu'à 24 clips avec pattern, durée, tempo et snapshot de toutes les pistes. Recharge une boucle dans le pattern choisi, sans toucher aux trois autres patterns ; **UNDO** restaure le précédent contenu.
- **Export WAV 16 bits ou MP3** : les boutons utilisent la capture stéréo réelle du master existant et arrêtent automatiquement après le nombre de mesures sélectionné. Les exports 1 et 2 mesures sont désormais disponibles.
- **Sauvegarde rétrocompatible** : clips inclus dans les exports/imports JSON et dans l'enregistrement local. Un ancien projet sans boucles s'ouvre normalement.
- **PWA hors connexion** : scripts et styles LOOP STUDIO préchargés dans le cache v14.

**À noter :** la capture du master conserve les effets et leur queue, comme le reste du studio ; le fichier exporté inclut donc le temps d'extinction des effets après la fin de la boucle, et n'est pas garanti « seamless » à l'échantillon près. Pour une boucle parfaitement découpée, couper la queue d'effet dans un éditeur audio.

### Essai rapide

Dans **SEQ**, programme un pattern C/DROP (ou l'un des autres). Ouvre **BOUCLES**, choisis **C**, puis **4 mesures** → **BOUCLER EN CONTINU**. Pour sauvegarder : entre un nom puis **+ SAUVEGARDER CE PATTERN**. Pour un fichier, arrête PLAY puis appuie sur **EXPORT WAV** ou **EXPORT MP3**.

## PSY V13 — Pittsburgh Modular Taïga + claviers live

Cette version ajoute un **synthétiseur virtuel Taïga**, inspiré du Pittsburgh Modular Taiga (original de 2023), à l'application Lovestronautes. C'est une **interprétation indépendante construite en Web Audio** et non une émulation circuit-à-circuit officielle. La marque, les noms des produits et la sonorité du matériel original appartiennent à leurs titulaires.

### Taïga Analog Lab (12e piste)

- **Trois oscillateurs** indépendants, formes sinus, triangle, dent de scie et carré, contrôle de forme, de wavefold et de niveau par oscillateur. La courbe de wavefolding est une approximation numérique en **six passes**, pas le circuit propriétaire Pittsburgh.
- **Mixer et noise**, overdrive doux et **filtre multimode** passe-bas, passe-bande, passe-haut.
- **Dynamics Controller/LPG** simulant la fermeture simultanée du timbre et du volume, alternative VCA, deux enveloppes ADSR, modulation de coupure et pitch par LFO, **Sample & Hold** aléatoire par note.
- **Echos** : delay à feedback limité à 38 %, partagé entre les notes pour réduire les ressources sur Android.
- **4 presets** : Mountain Fold (lead psy), Acid West (basse résonante), Organic LPG (percussions/plucks), Forest Drone (textures modulaires).
- Monophonie avec extinction progressive des voix précédentes et nettoyage des nœuds Web Audio. Les patches et patterns sont sauvegardés dans le JSON du projet. Les anciens morceaux sont migrés sans modifier leurs anciennes pistes.
- **SEQ** : piste « TAÏGA · MODULAR » avec 16 pas dans les patterns A/B/C/D. **MIX** : volume, EQ, mute/solo, panoramique. **MORCEAU** : génération tonale et éditeur 64 pas. **FX/WAV/MP3** : piste dans le bus master capturé.

### Claviers tactiles corrigés

Le clavier historique lançait les notes au `pointerdown` alors que l'initialisation audio pouvait encore être suspendue. La V13 attend l'état **AUDIO ONLINE** et traite les taps rapides, le glissement du doigt et l'annulation des pointeurs.

- Nouveau **piano à touches blanches et noires distinctes**, plus faciles à atteindre sur Android, avec feedback visuel vert quand une note est enfoncée.
- Sélecteur direct **TAÏGA / S1 / VOLCA FM2 / TD-3 / THEREMIN / BINIOU**, octaves +/- et choix 1 ou 2 octaves.
- Multi-touch, déplacement du doigt entre les notes, relâchement lors de `pointercancel`, `lostpointercapture`, fermeture de page ou perte de focus — évite les notes bloquées.
- Clavier PC : touches `A W S E D F T G Y H U J K`. MIDI USB/Bluetooth (quand le navigateur le permet) : prise en charge des messages **note-on, note-off et vélocité**, branchement à chaud et CC existants. L'accès Web MIDI varie selon le navigateur et le système.
- Les mini-claviers **S1 MK2** et **Taïga** partagent la même gestion tactile du glissé ; une préécoute courte n'est plus coupée instantanément au relâchement.
- Préférences de clavier conservées localement, sans effacer les projets ou exiger un serveur. Cache PWA mis à jour en **v13**.

**Tester sur téléphone :** ouvrir la nouvelle URL, **ACTIVER LE SON**, toucher **NOUVEAU PITTSBURGH TAÏGA MODULAR**, choisir un preset et **TEST TAÏGA**, puis utiliser le bouton **CLAVIER LIVE**. Pour écouter uniquement le Taïga, vérifier la tranche **TAÏGA** dans MIX et activer ses pas dans SEQ.

**Limites connues :** ce synthé ne reproduit pas physiquement le filtre Pittsburgh, les composants analogiques ni les 60 patch points de l'instrument ; il propose plusieurs routages CV préconfigurés, mais pas encore une matrice de câbles arbitraires. Les tests automatisés et tests en navigateur ne prouvent pas à eux seuls la qualité sonore sur un téléphone Android précis.

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
