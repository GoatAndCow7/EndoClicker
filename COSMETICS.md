# Guide — Ajouter un cosmétique (skin de pièce)

Tout ce qu'il faut faire pour qu'un nouveau skin soit **parfaitement cohérent** :
effets cliqués, halo, onde de choc, chiffres flottants… tout se teinte automatiquement.

## 1. L'image

- Emplacement : `client/public/cosmetics/<id>.png` (id en minuscules, ex. `endonether.png`)
- **Carrée, 512×512 px, PNG** — fond noir ou très sombre (il se fond dans le décor du jeu,
  comme le logo original et EndoSage)
- Poids visé : **< 600 Ko**. Si l'image de départ est trop lourde, la redimensionner :

```powershell
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('CHEMIN\source.png')
$bmp = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src, 0, 0, 512, 512)
$bmp.Save('CHEMIN\cible.png', [System.Drawing.Imaging.ImageFormat]::Png)
```

## 2. L'entrée dans `client/src/game/constants.js` → `COIN_SKINS`

C'est LA seule ligne de code à ajouter. Modèle complet :

```js
{
  id: 'endonether',                        // unique, = nom du fichier sans .png
  name: 'EndoNether',                      // nom affiché
  icon: '/cosmetics/endonether.png',       // chemin de l'image
  cost: 5e9,                               // prix en EndoCraft (V2 : 5-20 Md la peau)
  desc: 'Une phrase courte qui a du caractère.',
  perk: {                                  // ── POUVOIR UNIQUE (optionnel) ──
    id: 'frenzyDuration',                  // identifiant géré dans store.js
    label: 'Description du pouvoir affichée sur la carte.',
  },
  fx: {
    // ── Palette d'effets : OBLIGATOIRE pour la cohérence ──
    colors: ['#...', '#...', '#...', '#...', '#...'], // 5 teintes pour les particules (de foncé à clair)
    float: '#hex',                         // couleur des "+X" flottants
    glow: 'rgba(r, g, b, 0.55-0.6)',       // halo lumineux des "+X"
    halo: 'rgba(r, g, b, 0.25-0.32)',      // halo PULSANT derrière la pièce
    ripple: 'rgba(r, g, b, 0.8-0.9)',      // bordure de l'onde de choc au clic
  },
},
```

Cas particulier — **skin exclusif caisse** (comme EndoCrystal) : pas de `cost`,
mais `caseOnly: true` et une entrée `{ type: 'skin', skinId: '…' }` dans la table
`CASES` (caisse de l'End en l'occurrence). Il s'obtient uniquement au tirage,
jamais à la boutique.

### Pouvoirs existants (`perk.id` à implémenter dans `store.js`)

| perk.id | Effet | Skin |
|---|---|---|
| `appleDuration` | Pommes dorées visibles +50 % (18 s) | EndoSage — 5 Md |
| `frenzyDuration` | Frénésies +25 % de durée (37,5 s) | EndoBlaze — 10 Md |
| `luckyBonus` | Pomme chanceuse : 12 % de la banque (au lieu de 10 %) | EndoRoi — 20 Md |
| `productionBoost` | Production ×1,5 tant que la pièce est équipée | EndoCrystal — exclusif caisse |

Pour un NOUVEAU pouvoir : ajouter la logique via `equippedPerk(state)` dans
`store.js` (voir `clickApple` et `tick`), puis référencer l'id ici. Ajuster le
prix selon la puissance du pouvoir !

**Comment choisir la palette** : piquez 5 couleurs directement de l'image du skin
(pipette/ColorPick), de la plus sombre à la plus claire. `float` = la teinte la
plus lisible sur fond sombre (assez claire). Exemple EndoSage : particules
vertes `#7ed957 → #c9f2c0`, `float: '#c9f7c1'`, halo et ripple en verts translucides.

## Ce qui est AUTOMATIQUE (ne rien faire)

| Élément | Pourquoi c'est auto |
|---|---|
| Achat / équipement / retour au skin classique | Le store gère n'importe quel skin de la liste |
| Exclusif caisse non achetable | Le panneau vérifie `caseOnly` avant d'afficher le bouton d'achat |
| Skin caisse équipable seulement si possédé | `equipCoin` vérifie `cosmetics[]` — seul `default` est toujours libre (fix EndoCrystal : plus question de l'équiper sans l'avoir tiré) |
| Particules au clic | `fx.burst` lit `theme.colors` |
| Chiffres flottants "+X" | `fx.float` lit `theme.float` + `theme.glow` |
| Onde de choc (rond) | ClickArea lit `fx.theme.ripple` |
| Halo pulsant derrière la pièce | ClickArea lit `skin.fx.halo` (repli orange par défaut) |
| Application du thème | `useEffect` de ClickArea appelle `fx.setTheme(skin.fx)` ; le skin de base n'a pas de `fx`, et `setTheme` fusionne avec le thème orange par défaut de `fx.js` — un `fx` incomplet reste donc jouable |
| Sauvegarde locale + cloud | `cosmetics[]` et `equippedCoin` déjà persistés |
| Éditeur admin (aucun conflit) | Le serveur préserve ces champs |
| Panneau Cosmétiques | La grille boucle sur `COIN_SKINS` |
| Renaissance | Les cosmétiques survivent au reset, seul le solde repart à zéro |
| Succès « Chic ! » | Se déclenche dès le 1er achat quel qu'il soit |

## Volontairement PAS thémé (identité globale du jeu)

Compteur EndoCraft et son glow orange, boutons, onglets, toasts, succès,
confettis : c'est l'interface du jeu, commune à tous les skins. Ne pas teinter
(à discuter si un jour on veut un mode « thème complet »).

## Récap rapide (~5 min)

1. Image optimisée → `client/public/cosmetics/<id>.png`
2. Entrée + palette `fx` → `COIN_SKINS` dans `constants.js`
3. `npm run build` → commit → push → Redeploy Dokploy ✅
