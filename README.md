# EndoClicker

<p align="center">
  <img src="client/public/logo.png" width="140" alt="Logo EndoClicker" />
</p>

Un cookie-clicker pour le serveur Minecraft **EndoCraft**. On clique, on récolte des EndoCraft, on construit un empire industriel, on recrute le staff du serveur, on ouvre des caisses à la CS:GO et on renaît pour devenir toujours plus fort.

Jouable immédiatement en invité, ou avec un compte pour sauvegarder sa progression dans le cloud et figurer au classement.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
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
- **91 améliorations** : paliers de pioches (bois jusqu'à la Griffe du Wither), boosts par générateur (Confirmés, Experts, Vétérans, Légendaires), upgrades globales
- **Renaissance** : au-delà de 500 B récoltés à vie, repartez de zéro contre +15 % de production permanente par cycle, avec un seuil qui grimpe à chaque renaissance
- **Pommes dorées variées** : dorée (frénésie ou bonus de banque), d'orage (pluie garantie), d'ombre (tempête de clics), de cristal (2 minutes de production), maudite (5 secondes de doute puis un jackpot)
- **Pluies de pommes** : événement où des pommes tombent de l'écran, à attraper avant le sol
- **Quêtes quotidiennes** : 3 missions par jour, reset à minuit, bonus si les trois sont finies
- **Cases à ouvrir** : 3 caisses avec animation de tirage façon CS:GO, drops exclusifs introuvables ailleurs (upgrades surpuissantes, skins, tags de prestige)
- **Cosmétiques** : skins de pièce avec palette d'effets assortie et pouvoir unique
- **55 succès**, dont quelques secrets
- **Gains hors-ligne** : la production continue pendant votre absence (8 h de plafond, améliorable)
- **Fond jour/nuit** selon l'heure réelle, musique d'ambiance et effets sonores avec volumes réglables

### Le staff recrutable

L'onglet Équipe permet de recruter les vrais membres du serveur (têtes Minecraft incluses), chacun avec son bonus… ou son malus :

| Membre | Rôle | Effet |
|---|---|---|
| GoatAndCow | Créateur | Production ×1,25 et clics ×1,25 |
| Emmanuel2403 | Développeur | 2 clics automatiques par seconde |
| Kuani | Gérant | Production ×1,20 |
| Lulu62111 | Admin | Clics ×2 |
| MathZMath | Gérant | Gains hors-ligne plus efficaces |
| ZoxXio | Modo | Générateurs moins chers |
| LetsGo2Myhome | Modo | Pommes plus fréquentes |
| Fl0ryoz | Modo | Plafond hors-ligne étendu |
| Azale_e | Modo | Production ×1,10 |
| KendiiX | Modélisateur | Production ×0,90 (oui, c'est un malus) |

Chaque membre possède aussi sa propre amélioration d'équipe.

### Les comptes et le social

- **Invité** : sauvegarde locale automatique toutes les 5 secondes
- **Compte** : sauvegarde cloud multi-appareils, fusion automatique de la progression locale à la connexion
- **Classement** global avec badge de renaissances et tags de prestige
- **Profils publics** : stats détaillées, succès, équipe, butin de cases
- **Panel d'administration** pour le compte admin : édition complète des joueurs, effets en direct (frénésie, pommes), statut en ligne, anti-triche désactivable par joueur
- **Événements temps réel** (SSE) : les actions admin s'appliquent instantanément chez le joueur connecté

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
| `JWT_SECRET` | à définir | Secret de signature des tokens |
| `DATA_DIR` | `/app/data` | Emplacement de la base SQLite |
| `ADMIN_PSEUDO` | `GoatAndCow` | Pseudo du compte administrateur (réservé) |
| `ADMIN_PASSWORD` | aléatoire | Mot de passe initial du compte admin s'il n'existe pas encore |

Le pseudo administrateur ne peut pas être pris à l'inscription. Au premier démarrage, s'il n'existe pas, il est créé automatiquement (mot de passe depuis `ADMIN_PASSWORD`, sinon généré et affiché dans les logs).

## Déploiement Docker / Dokploy

Le projet tient dans une seule image :

```bash
docker compose up -d
```

Sur Dokploy :

1. Créez une application de type Docker Compose pointant sur ce dépôt
2. Définissez `JWT_SECRET` dans l'onglet Environment
3. Montez un volume persistant sur `/app/data` (base SQLite)
4. Exposez le port 3000

Le volume contient comptes, progressions et classement : ne le supprimez pas. Une sauvegarde se limite à copier le fichier `endoclicker.db`.

## API

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/auth/register` | POST | non | Inscription |
| `/api/auth/login` | POST | non | Connexion |
| `/api/state` | GET | oui | Progression cloud |
| `/api/state` | PUT | oui | Sauvegarde (contrôle anti-triche) |
| `/api/leaderboard` | GET | non | Top 20 |
| `/api/profile/:pseudo` | GET | non | Profil public |
| `/api/events` | GET (SSE) | oui | Flux temps réel |
| `/api/admin/*` | divers | admin | Gestion des joueurs |

## Structure du projet

```
client/          Front React
  public/        Images, textures, musique
  src/
    game/        Logique de jeu (store, constantes, effets, audio)
    components/  Interface
    auth/        Gestion des comptes
    api/         Client HTTP
server/          API Express + SQLite
  src/
    admin.js     Routes d'administration
    events.js    Flux SSE
    state.js     Sauvegarde et anti-triche
Dockerfile       Image de production
```

## Ajouter du contenu

- **Un skin** : voir [COSMETICS.md](COSMETICS.md)
- **Un générateur ou une amélioration** : une entrée dans `client/src/game/constants.js`
- **Un membre du staff** : une entrée dans `STAFF`, la tête va dans `client/public/heads/`

Les textures d'items Minecraft proviennent du pack Pixel Perfection CE, ce qui permet d'en ajouter facilement.

## Crédits

- Textures d'items : [Pixel Perfection CE](https://github.com/Athemis/PixelPerfectionCE) par XSSheep et contributeurs, licence CC BY-SA 4.0 (détails dans [CREDITS.md](CREDITS.md))
- Têtes de joueurs : [mc-heads.net](https://mc-heads.net)
- EndoClicker est un projet fan-made pour le serveur EndoCraft, sans affiliation avec Mojang Studios ou Microsoft

## Licence

Distribué sous licence MIT — voir [LICENSE](LICENSE).
