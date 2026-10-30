# Composer avec Lovestronautes Machine V23

Ouvre l’application dans Chrome sur Android ou Safari sur iOS, puis touche **COMPOSER UN MORCEAU**. Le bouton de lecture active le son dans le même geste. Le réglage BPM de Composition Pro est celui du transport principal.

## Écrire une phrase

1. Choisis un clip ou crée un **CLIP VIDE**. Règle sa longueur sur 1, 2, 4 ou 8 mesures.
2. Choisis une piste, puis une mesure. Dans le piano roll, touche la hauteur et le pas voulus. Une seconde hauteur sur le même pas remplace la note. Pour un accord, répartis les notes entre plusieurs instruments.
3. Sélectionne une note pour régler sa vélocité, sa durée en doubles croches, sa probabilité et son avance/retard de quelques millisecondes. La durée est la porte du synthé ; son ADSR peut prolonger le son. Les percussions et les échantillons gardent leurs durées acoustiques.
4. Change de mesure pour écrire la suite. **COPIER MESURE / COLLER MESURE** copie les 18 pistes. Agrandir un clip répète la phrase existante avec des copies éditables indépendantes.
5. Choisis une tonalité et une gamme, puis **ACCORDER À LA GAMME** pour corriger la piste sélectionnée. Le changement de gamme seul ne réécrit pas les notes. **NUANCER LE GROOVE** varie légèrement les vélocités et le placement, en conservant kick et basse sur la grille.

Les boutons **ANNULER / RÉTABLIR** restaurent aussi les clips et l’arrangement. L’édition du contenu s’effectue à l’arrêt. Le clavier live, les paramètres des synthés et les effets restent disponibles dans les autres onglets.

## Construire le morceau

**AJOUTER CE CLIP** crée une section dans l’arrangement. Donne-lui un nom, choisis le nombre de répétitions et une éventuelle transposition. Les flèches changent l’ordre, le bouton de copie duplique la section. Déplie le choix des pistes pour enlever des instruments uniquement dans cette section.

Exemple : un clip de 4 mesures répété 4 fois forme une intro de 16 mesures. Duplique la section, ajoute basse et lead pour le développement ; utilise ensuite un clip plus aéré pour le break. Une section référence son clip : modifier ce clip met à jour toutes les sections qui l’utilisent. Duplique le clip pour créer une variation indépendante.

**ÉCOUTER LE CLIP** boucle le clip sélectionné. **LIRE LE MORCEAU** suit l’arrangement et s’arrête après sa dernière mesure. Le suivi de lecture affiche la mesure, le temps et le nom de la section. Le mode ÉCO réduit la charge sur téléphone ; garde l’application au premier plan.

## Exporter et continuer dans Ableton Live

- **MIDI · 18 PISTES** crée un `.mid` avec les notes de toutes les pistes entendues, les vélocités, durées, le swing, les décalages, le tempo et les marqueurs de sections. Importe ce fichier dans Live et choisis tes instruments. Les sons, prises audio et effets de la machine ne sont pas dans le MIDI. Les six pistes de percussion utilisent le canal GM 10 ; les douze pistes mélodiques utilisent des canaux distincts.
- **WAV STÉRÉO 24 BITS** enregistre les synthés et le master avec les réglages de mixage actuels. La fréquence est celle de l’AudioContext du navigateur, sans faux rééchantillonnage. L’onglet FX permet aussi de choisir 16 bits. Le WAV est un mix stéréo, pas des stems séparés.
- **MP3 320 KB/S** convient au partage. Le WAV convient mieux à la poursuite du mixage.
- **SOURCE** permet d’exporter le morceau entier ou un seul passage du clip. La capture audio se fait en temps réel avec 1,6 seconde de fin d’effets ; garde la page visible jusqu’au téléchargement. Une fin d’effet particulièrement longue peut dépasser cette queue. **ANNULER L’EXPORT AUDIO** interrompt proprement la capture.

Les paramètres Mute/Solo du mixeur, les pistes choisies dans chaque section et l’activation propre aux synthés influencent le résultat. La piste Biniou requiert son activation habituelle. Une probabilité inférieure à 100 % utilise une décision reproductible par mesure : le plan MIDI et la lecture d’un même passage concordent. Le MIDI peut piloter des instruments externes différents de ceux de la machine.

## Conserver le travail

**SAUVER LE PROJET** télécharge un JSON contenant les notes, clips, sections, paramètres des synthés et mixage. **OUVRIR UN PROJET** recharge ce JSON, y compris les anciens projets A–D. Le navigateur garde aussi une sauvegarde locale ; exporte ton JSON avant de vider les données du site ou de changer d’appareil. Les enregistrements micro, extraits et gros fichiers audio importés doivent être conservés séparément puis réimportés.

Le format des clips est limité à 16 clips, 8 mesures par clip et 32 sections / 1 024 mesures au total. Les exports longs sont limités à 180 Mo de PCM avant encodage ; exporte des parties plus courtes si le navigateur manque de mémoire. Une marge de niveau et une écoute critique restent nécessaires pour finaliser un mix ; le limiteur ne constitue pas un mastering automatique.
