# Thelovestronautes Machine — Sauvegarde, import et export audio

## Projet musical

**SAUVER LE PROJET** crée un fichier JSON contenant les patterns, clips, arrangement, mixage et paramètres des synthés. Les enregistrements micro, échantillons audio ou boucles importés ne sont pas inclus comme données binaires ; conserve les sources séparément.

**OUVRIR UN PROJET** valide le JSON et demande maintenant confirmation avant de remplacer la composition. Une copie en mémoire de l'état précédent est préparée ; en cas d'erreur pendant l'application des réglages, le code tente de restaurer cet état, sans promettre la récupération dans tous les cas. En cas de stockage local indisponible, l'interface conseille d'exporter un JSON.

## Export audio

- WAV PCM stéréo 16 ou 24 bits (fréquence d'échantillonnage réelle du navigateur).
- MP3 exporté via Worker ; le traitement reste soumis aux ressources de l'appareil.
- Contrôle des buffers PCM gauche/droite, de la longueur et de la présence d'un signal audio avant encodage. Un export silencieux déclenche un message d'erreur au lieu d'être affiché comme réussi.
- Après création d'un WAV/MP3, un lien **Télécharger manuellement** est disponible pendant environ cinq minutes en plus du téléchargement automatique. Cette solution aide notamment lorsque le navigateur bloque une action automatique après traitement asynchrone.

## Limites

- Un fichier non silencieux n'est pas nécessairement un bon mix : vérifier l'audio à l'écoute, les niveaux, la durée et la fin des effets.
- Si la page devient invisible, si l'AudioContext se suspend ou si la mémoire est insuffisante, l'export peut échouer.
- Une confirmation de téléchargement ou un test réel sur Safari/iPhone/Android ne sont pas revendiqués.
- Aucun service cloud n'est ajouté ; les moteurs Web Audio, les synthétiseurs et les fichiers préexistants ne sont pas remplacés.

**Statut :** code enregistré sur GitHub le 22 novembre 2026 ; fonctionnement réel et installation physique non certifiés.

## Récupération en cas de fermeture ou de suspension — 22 novembre 2026

La sauvegarde du projet sur cet appareil conserve maintenant, **si le navigateur le permet**, une copie de l'état précédent, tournée au maximum toutes les deux minutes pendant les modifications. Lorsqu'une sauvegarde primaire est illisible au démarrage, le code tente de retrouver une copie précédente valide et signale cet état dans l'interface.

Dans **Composition Pro**, déplie **Récupération après interruption** pour choisir **Restaurer la copie précédente** ou **Exporter la copie JSON**. La restauration exige une confirmation, ne fonctionne pas pendant la lecture ou un export audio, et essaye de préserver l'état courant en cas d'erreur. Les commandes Annuler/Rétablir de la session restent distinctes du secours local.

Quand Safari masque l'onglet ou quitte la page, les écritures différées en attente sont poussées dans le stockage local sans sérialisation continue pendant chaque événement audio. Un onglet fermé brutalement peut néanmoins interrompre l'enregistrement ; le stockage peut aussi être purgé par iOS. Les prises audio et échantillons importés restent **hors du JSON**. Exporte des fichiers de projet et des WAV indépendants pour assurer une vraie sauvegarde durable.

**État :** code committé, sans essai physique iPhone/Android ni preuve que les données survivent à une purge Safari.
