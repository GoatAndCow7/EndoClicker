# EndoClicker

<p align="center">
  <img src="client/public/logo.png" width="140" alt="Logo EndoClicker" />
</p>

Un cookie-clicker pour le serveur Minecraft **EndoCraft**. On clique, on récolte des EndoCraft, on construit un empire industriel, on recrute le staff du serveur, on ouvre des caisses à la CS:GO et on renaît pour devenir toujours plus fort.

Jouable immédiatement en invité, ou avec un compte pour sauvegarder sa progression dans le cloud et figurer au classement.

---

## V2 — la grande refonte

La V2 refait l'économie de bout en bout, habille le jeu d'un thème jour/nuit complet et corrige une bonne moisson de bugs. Elle s'accompagne d'une décision assumée :

**Reset mondial.** Au premier démarrage de la V2, la progression de tous les joueurs est remise à zéro — les comptes, eux, sont conservés. Le wipe est automatique (le serveur compare une « version du monde » stockée en base), et les sauvegardes locales de la v1 sont ignorées : c'est une nouvelle partie. Pourquoi si radical ? Parce que la nouvelle économie n'a rien à voir avec l'ancienne : repartir tous à égalité était la seule façon juste de relancer la course. Le classement aussi repart blanc.

Ce que la V2 change :

- **Économie retunée** — courbe de générateurs repensée : payback progressif, fin de cycle fluide, fini le mur du milieu de partie. Le Bûcheron se rentabilise en 30 secondes, le Cœur de l'Ancien en 12,5 minutes, et rien au milieu ne donne envie d'aller miner ailleurs.
- **Renaissance V2** — un bonus permanent bien plus costaud, des seuils ×3 (500 B, 1,5 T, 4,5 T…) et les **Braises du Phénix** : un pécule de départ à chaque renaissance, pour ne plus recliquer 200 fois après le reset. Le seuil se farme **depuis la dernière renaissance** : impossible d'enchaîner les renaissances sur un gros total historique.
- **Caisses revues** — espérance de gain cash à ~63–67 % du prix, drops « banque » (pourcentage de votre solde, plafonné) et doublons remboursés en cash : fini la perte sèche quand la caisse vous ressort ce que vous avez déjà.
- **Pleins de correctifs** :
  - le jeu ne se fige plus pendant les tempêtes d'ombre ;
  - les renaissances enchaînées sont impossibles ;
  - deux onglets ouverts ne se marchent plus dessus ;
  - deux frénésies qui se chevauchent prennent le meilleur des deux ;
  - les quêtes journalières ont une récompense figée le matin ;
  - l'anti-triche cloud a été renforcé (fenêtre de migration bornée).
- **Nouveau design** — thème jour/nuit complet et une interface repensée, voir [Nouveautés visuelles](#nouveautés-visuelles).

Les détails d'équilibrage sont dans la section [Équilibrage](#équilibrage).

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Équilibrage](#équilibrage)
- [Nouveautés visuelles](#nouveautés-visuelles)
- [Technologies](#technologies)
- [Installation](#installation)
- [Configuration](#configuration)
- [Déploiement Docker / Dokploy](#déploiement-docker--dokploy)
- [API](#api)
- [Structure du projet](#structure-du-projet)
- [Ajouter du contenu](#ajouter-du-contenu)
- [Crédits](#crédits)
- [Licence](#licence)

## Fonctionnalités

### Le jeu

- **16 générateurs** de production, du Bûcheron (15 EndoCraft) au Cœur de l'Ancien (300 quadrillions), chacun avec sa texture
- **98 améliorations** : paliers de pioches (bois jusqu'à la Griffe du Wither), paliers par générateur (Confirmés, Experts, Vétérans, Légendaires), overclocks d'auto-clicker, upgrades hors-ligne et globales — dont 6 exclusives qui ne sortent que des caisses
- **Renaissance** : à partir de 500 B farmés depuis votre dernière renaissance, repartez de zéro contre un bonus de production permanent croissant, un seuil qui grimpe ×3 à chaque cycle et les Braises du Phénix pour redémarrer sur les roues (détail dans [Équilibrage](#renaissance))
- **Pommes dorées variées** : dorée (frénésie ou bonus de banque), d'orage (pluie garantie), d'ombre (tempête de clics), de cristal (3 minutes de production versées cash), maudite (5 secondes de doute puis un jackpot)
- **Pluies de pommes** : événement où des pommes tombent de l'écran, à attraper avant le sol
- **Quêtes quotidiennes** : 3 missions par jour, générées de façon déterministe (pas de reroll en rafraîchissant), récompense figée au réveil, reset à minuit, bonus journée parfaite
- **Cases à ouvrir** : 3 caisses avec animation de tirage façon CS:GO, drops exclusifs introuvables ailleurs (upgrades surpuissantes, skins, tags de prestige) et doublons remboursés en cash
- **Cosmétiques** : skins de pièce avec palette d'effets assortie et pouvoir unique
- **55 succès**, dont quelques secrets
- **Gains hors-ligne** : la production continue pendant votre absence (10 h de plafond, 18 h max avec le staff, 60 % d'efficacité de base, améliorable)
- **Thème jour/nuit complet** selon l'heure réelle (nuit de 20 h à 7 h), forçable depuis l'en-tête, musique d'ambiance et effets sonores avec volumes réglables

### Le staff recrutable

L'onglet Équipe permet de recruter les vrais membres du serveur (têtes Minecraft incluses), chacun avec son bonus… ou son malus :

| Membre | Rôle | Effet |
|---|---|---|
| GoatAndCow | Créateur | Production ×1,30 et clics ×1,30 |
| Emmanuel2403 | Développeur | 2 clics automatiques par seconde |
| Kuani | Gérant | Production ×1,25 |
| Lulu62111 | Admin | Clics ×2 |
| MathZMath | Gérant | Gains hors-ligne plus efficaces |
| ZoxXio | Modo | Générateurs moins chers |
| LetsGo2Myhome | Modo | Pommes plus fréquentes |
| Fl0ryoz | Modo | Plafond hors-ligne étendu |
| Azale_e | Modo | Production ×1,15 |
| KendiiX | Modélisateur | Production ×0,90 (oui, c'est un malus) |

Chaque membre possède aussi sa propre amélioration d'équipe.

### Les comptes et le social

- **Invité** : sauvegarde locale automatique toutes les 5 secondes
- **Compte** : sauvegarde cloud multi-appareils (sync toutes les 60 s), fusion automatique de la progression locale à la connexion
- **Classement** global avec badge de renaissances et tags de prestige
- **Profils publics** : stats détaillées, succès, équipe, butin de cases
- **Panel d'administration** pour le compte admin : édition complète des joueurs, effets en direct (frénésie, pommes), statut en ligne, anti-triche désactivable par joueur
- **Événements temps réel** (SSE) : les actions admin s'appliquent instantanément chez le joueur connecté

## Équilibrage

Tout vit dans `client/src/game/constants.js` — modifiez là, et tout le jeu suit.

### Générateurs et clic

- Chaque exemplaire d'un générateur coûte **×1,15** de plus que le précédent.
- Les paliers à 10 / 25 / 50 / 100 exemplaires multiplient la production de ce générateur par ×2, ×2, ×3 puis ×5 — jusqu'à **×60** cumulés par générateur.
- Le premier achat de chaque générateur est rentabilisé en 30 s (Bûcheron), la courbe grimpe en milieu de partie puis retombe à 12,5 min sur le Cœur de l'Ancien : la fin de cycle reste fluide au lieu de devenir un mur.
- Trois multiplicateurs globaux ×2 attendus en toute fin de course — c'est la couronne du run, et ils se rachètent à chaque Renaissance.
- La puissance de clic, ce sont les pioches **plus 5 % de la production**. Les multiplicateurs d'équipe et de caisses ne boostent que les pioches : le clic reste une vitrine, pas LA stratégie.

### Renaissance

Le seuil se farme **depuis la dernière renaissance** (le total à vie ne suffit plus). Bonus permanent : **B(n) = (1 + 0,25 × n) × 1,15ⁿ**, seuil ×3 à chaque cycle, Braises du Phénix versées en solde de départ — elles ne comptent dans aucun seuil.

| Renaissance | Seuil à farmer | Bonus permanent | Braises du Phénix |
|---|---|---|---|
| 1re | 500 B | ×1,44 | 500 M |
| 2e | 1,5 T | ×1,98 | 1 Md |
| 3e | 4,5 T | ×2,66 | 1,5 Md |
| 5e | 40,5 T | ×4,53 | 2,5 Md |
| 10e | 9,8 Qa | ×14,2 | 5 Md |

On **garde** : succès, cosmétiques, tags, exclusives de caisses, stats à vie.
On **perd** : solde (remplacé par les braises), générateurs, améliorations (hors exclusives) et équipe.

### Caisses

Trois caisses : **bois** (1 M), **Nether** (50 M) et **de l'End** (1 Md).

- **EV cash ≈ 63–67 % du prix** ; EV globale ≈ 91–94 % pour un joueur qui ne possède pas encore toutes les exclusives. La maison gagne, mais elle ne vous plume plus.
- Drops cash de ×0,5 à ×4, frénésies, pluies de pommes et tags de prestige.
- Drops « banque » : +5 à +8 % de votre solde, **plafonnés à 3× le prix de la caisse** — une grosse banque ne rend pas les cases gratuites.
- **Doublons remboursés en cash** : 15 % du prix (commun), 20 % (rare, épique), 25 % (légendaire). Tirer ce qu'on a déjà n'est plus une perte sèche.
- Le skin **EndoCrystal** (production ×1,5 tant qu'il est équipé) ne sort que de la caisse de l'End, en drop légendaire (~2,4 % par ouverture).

## Nouveautés visuelles

- **Thème jour/nuit complet** : deux palettes complètes (chaude le jour, froide la nuit) sur toute l'interface — panneaux, boutons, scrollbar. Bascule automatique de 20 h à 7 h, ou forçage jour/nuit depuis l'en-tête.
- **Design system repensé** : couleurs, typo et composants unifiés, le jeu a enfin une tête de jeu.
- **Animations retravaillées** : rouleau de caisse qui ralentit sur le jackpot, célébration de la Renaissance, halo de la pièce qui respire.
- **Accessibilité de base** : focus visible au clavier sur tous les boutons et onglets, respect de `prefers-reduced-motion` pour couper la décoration.

## Technologies

| Couche | Choix |
|---|---|
| Front | React 18, Vite, Tailwind CSS, Zustand |
| Back | Node.js, Express, better-sqlite3, JWT |
| Temps réel | Server-Sent Events |
| Déploiement | Docker (image unique) |

## Installation

Prérequis : Node.js 20 ou plus récent.

```bash
# Installer les dépendances
npm run install:all

# Lancer en développement (API sur :3000, front sur :5173)
npm run dev
```

Ouvrez http://localhost:5173

Pour un test de production en local :

```bash
npm run build
npm start          # Express sert le front et l'API sur :3000
```

## Configuration

Variables d'environnement du serveur :

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port d'écoute |
| `JWT_SECRET` | à définir | Secret de signature des tokens (**obligatoire en production : le serveur refuse de démarrer sans lui**) |
| `DATA_DIR` | `/app/data` | Emplacement de la base SQLite (en local : `server/data`) |
| `ADMIN_PSEUDO` | `GoatAndCow` | Pseudo du compte administrateur (réservé) |
| `ADMIN_PASSWORD` | aléatoire | Mot de passe initial du compte admin s'il n'existe pas encore |
| `TRUST_PROXY` | `1` | Nombre de reverse-proxies devant le serveur (Dokploy = 1). Indispensable pour que les bannissements IP visent la vraie IP du joueur |

Le pseudo administrateur ne peut pas être pris à l'inscription. Au premier démarrage, s'il n'existe pas, il est créé automatiquement (mot de passe depuis `ADMIN_PASSWORD`, sinon généré et affiché dans les logs). Sans `JWT_SECRET`, le serveur démarre avec un secret de dev et vous le dira bruyamment dans les logs — en production, définissez-le (`openssl rand -hex 32` fait très bien l'affaire).

## Déploiement Docker / Dokploy

Le projet tient dans une seule image :

```bash
docker compose up -d
```

Le compose mappe le port public **8090 → 3000** (3000 étant souvent pris par le dashboard Dokploy sur le serveur) et pose le volume `endoclicker_data` sur `/app/data`.

Sur Dokploy :

1. Créez une application de type Docker Compose pointant sur ce dépôt
2. Définissez `JWT_SECRET` dans l'onglet Environment (et `ADMIN_PASSWORD` si vous voulez choisir le mot de passe admin)
3. Accès direct : `http://IP-DU-SERVEUR:8090` — ou, avec un domaine Dokploy, ciblez le port interne 3000

Le volume contient comptes, progressions et classement : ne le supprimez pas. Au premier démarrage de la V2, le reset mondial s'applique tout seul (la ligne `♻️ V2 : reset mondial appliqué…` passe dans les logs, une seule fois). Une sauvegarde se limite à copier le fichier `endoclicker.db`.

## API

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/auth/register` | POST | non | Inscription |
| `/api/auth/login` | POST | non | Connexion |
| `/api/state` | GET | oui | Progression cloud |
| `/api/state` | PUT | oui | Sauvegarde (contrôle anti-triche) |
| `/api/leaderboard` | GET | non | Top 20 (score = total à vie, conservé après une Renaissance) |
| `/api/profile/:pseudo` | GET | non | Profil public |
| `/api/events` | GET (SSE) | oui | Flux temps réel (token en query string : EventSource n'envoie pas d'en-têtes) |
| `/api/admin/*` | divers | admin | Gestion des joueurs |

## Anti-triche

Le jeu tourne dans le navigateur : le localStorage et le store sont
modifiables par n'importe qui (script injecté, devtools). Impossible à
empêcher — la protection est donc entièrement côté serveur, à la
sauvegarde. Le principe : **un état poussé doit être payable et
produisible**, recalculé depuis les tables du jeu (copie locale dans
`server/src/game/` : le serveur est autonome dans l'image, et le test
`test-economy.mjs` vérifie byte à byte que la copie colle aux
constantes du client — après un rééquilibrage, recopier
`constants.js` et `format.js`, le test refuse toute dérive).

- **Identité cycle / à vie** : chaque gain crédite le total du cycle ET
  le total à vie, la Renaissance remet le cycle à zéro et fige l'ancre.
  Le client garantit donc toujours `cycle == à-vie − ancre` : un état
  avec 1e308 « à vie » et 1e67 au cycle est forgé par construction.
- **Inventaire ≤ gains** : le coût cumulé des générateurs (série
  géométrique ×1,15), améliorations, recrutements et cosmétiques ne
  peut pas dépasser le total à vie (+ braises des renaissances, marge
  20 %). « Tout se give » avec un total à vie ridicule meurt ici.
- **Gains plausibles** : total du cycle et total à vie bornés par la
  production théorique de l'état × le temps réel (âge du compte, +7 j
  de farm invité possible avant inscription) × 6 (frénésies, pommes,
  caisses pour un joueur parfait 24/7), + la part des clics.
- **Renaissances cohérentes** : le coût des seuils (500 B × 3ⁿ,
  comparé en logarithmes) doit tenir dans le total à vie ET dans
  l'ancre de la dernière renaissance. La courbe de coûts plafonne
  l'économie : un « Plein rebirth » à 600 renaissances ne peut pas
  exister, même en gonflant tous les chiffres.
- **Succès cohérents** : les compteurs à vie sont monotones — un
  succès possédé dont le compteur est sous le requis (10 000 clics,
  10 h de jeu, 30 caisses…) est une liste forgée.
- **Taux déclaré plafonné** par la capacité réelle de l'état (frénésie
  ×7 + marge) : le plafond de la fenêtre anti-triche ne peut plus être
  gonflé par une fausse déclaration.
- **Compteurs bornés** : clics ≤ 200/s de temps de jeu (les
  autoclickers externes sont la base du genre : 150/s courant passe
  sans souci — l'in-game d'Emmanuel2403 est crédité dans le taux de
  production et ne compte pas dans le compteur), succès et staff
  ≤ catalogue, aucune valeur infinie. Les gains par clics sont
  budgétés dans la fenêtre anti-triche (clics × puissance, frénésie
  ×7 comprise) : un build clicueur sync sans friction, seul le
  compteur gonflé à la main tombe.

Deux remparts supplémentaires : une **CSP stricte** (aucun script
inline ou externe — un userscript naïf ou du XSS n'exécute rien) et
le **secret JWT obligatoire en production** (le serveur refuse de
démarrer sans `JWT_SECRET` : impossible de forger des tokens avec le
secret de dev public du dépôt). Une extension navigateur en MAIN
world passe outre la CSP, mais elle se heurte à la validation serveur
— et son « fetch hook » qui masque les 422 ne change rien côté
serveur : les avertissements tombent quand même.

Le **score du classement est le total à vie** : renaître ne fait plus
chuter au rang (l'ancien score de cycle retombait à zéro à chaque
Renaissance).

### Sanctions automatiques

Une sauvegarde impossible vaut un **avertissement** ; deux dans
l'heure = sanction : la **progression du compte est effacée** et
l'**IP est bloquée 24 h** : plus aucun accès — ni l'API, ni le site
lui-même (page et assets compris), remplacés par un écran « Accès
suspendu ». Le tricheur
connecté voit le reset s'appliquer instantanément (SSE) ; au retour
du ban, son appareil récupère l'état remis à zéro même si son
localStorage local affiche des milliards (la révision serveur gagne).
La fenêtre d'une heure protège un accident isolé ; un tricheur, lui,
retente en boucle : il est puni en quelques minutes. Les fenêtres de
gain classiques (plafond par intervalle) ne comptent PAS
d'avertissement : un très gros achat honnête peut les faire sauter
temporairement, ça se débloque seul.

Le panneau admin liste les bannissements actifs (pseudo, IP, motif,
heure de levée) avec un bouton **Lever** en cas de faux positif.

En pratique :

- Sauvegarde refusée → `422`, le client rejouera sa sync plus tard
  (aucune perte pour un joueur honnête, les marges sont larges).
- Un état déjà en base qui devient impossible (sync d'avant le
  renforcement) **disparaît du classement** et son profil ressort
  non classé.
- Le panneau admin affiche « état économiquement impossible » sur la
  fiche du joueur (bouton Réinitialiser à côté).
- Offrir de l'inventaire via l'admin lève l'anti-triche pour ce joueur
  (sinon sa prochaine sync serait refusée) — réactivable d'un clic.

Les marges et les formules sont testées dans `server/test-economy.mjs`
(`node test-economy.mjs` depuis `server/`) : à relancer après tout
rééquilibrage des tables.

## Structure du projet

```
client/            Front React
  public/          Images, textures, musique
  src/
    game/          Logique de jeu (store, constantes, effets, audio)
    components/    Interface
    auth/          Gestion des comptes
    api/           Client HTTP
server/            API Express + SQLite
  src/
    index.js       Bootstrap Express + front statique
    auth.js        Inscription / connexion
    db.js          Base SQLite, compte admin, reset mondial (version du monde)
    economy.js     Invariantes économiques (miroir des formules du jeu)
    game/          Copie locale des tables du jeu (vérifiée par le test)
    state.js       Sauvegarde cloud + anti-triche
    leaderboard.js Classement et profils publics
    events.js      Flux SSE
    admin.js       Routes d'administration
  test-economy.mjs Tests des invariantes anti-triche
Dockerfile         Image de production
```

## Ajouter du contenu

- **Un skin** : voir [COSMETICS.md](COSMETICS.md)
- **Un générateur ou une amélioration** : une entrée dans `client/src/game/constants.js`
- **Une caisse ou un drop** : la table `CASES` dans le même fichier
- **Un membre du staff** : une entrée dans `STAFF`, la tête va dans `client/public/heads/`

Les textures d'items Minecraft proviennent du pack Pixel Perfection CE, ce qui permet d'en ajouter facilement.

## Crédits

- Textures d'items : [Pixel Perfection CE](https://github.com/Athemis/PixelPerfectionCE) par XSSheep et contributeurs, licence CC BY-SA 4.0 (détails dans [CREDITS.md](CREDITS.md))
- Têtes de joueurs : [mc-heads.net](https://mc-heads.net)
- EndoClicker est un projet fan-made pour le serveur EndoCraft, sans affiliation avec Mojang Studios ou Microsoft

## Licence

Distribué sous licence MIT — voir [LICENSE](LICENSE).
