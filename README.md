# Bot Discord — Impôts (Sangre Negra RP)

Bot Discord (discord.js v14, commandes `/slash`) pour gérer le système d'impôts d'une organisation RP (GTA 5 / Prime RP) : déclaration, calcul automatique, codes promo de réduction, et outils admin. Toutes les réponses sont **privées** (visibles seulement par la personne qui tape la commande). Stockage local dans un fichier JSON (`data/db.json`), aucune base de données externe à installer.

## Installation

1. Crée une application sur le [Discord Developer Portal](https://discord.com/developers/applications) → onglet **Bot** → **Reset Token** pour récupérer ton token.
2. Récupère aussi, sur la page **General Information** de l'application, l'**Application ID** (= `DISCORD_CLIENT_ID`).
3. Invite le bot sur ton serveur via **OAuth2 → URL Generator** : coche `bot` + `applications.commands`, puis la permission `Send Messages`.
4. Récupère l'ID de ton serveur Discord (`DISCORD_GUILD_ID`) : active le mode développeur (Réglages Discord → Avancés), puis clic droit sur le serveur → "Copier l'ID du serveur".
5. Dans ce dossier :
   ```bash
   npm install
   ```
6. Copie `.env.example` vers `.env` et remplis les 3 valeurs :
   ```
   DISCORD_TOKEN=le_token_de_ton_bot
   DISCORD_CLIENT_ID=l_application_id
   DISCORD_GUILD_ID=l_id_de_ton_serveur
   ```
7. Déploie les commandes slash sur ton serveur (à refaire chaque fois qu'une commande change) :
   ```bash
   npm run deploy
   ```
8. Lance le bot :
   ```bash
   npm start
   ```

Aucune permission privilégiée ("Message Content Intent") n'est nécessaire : les commandes slash fonctionnent sans elle.

## Commandes

Toutes les réponses sont éphémères (privées, visibles seulement par la personne qui exécute la commande).

### Pour tout le monde

| Commande | Description |
|---|---|
| `/cimpots configurer revenu:<nombre> statut:<seul\|couple> [partenaire:<nom>]` | Configure ton revenu hebdomadaire et ton statut. Calcule et affiche le montant d'impôt à payer par semaine. |
| `/cimpots profil` | Affiche ton profil fiscal actuel (revenu, statut, réduction, montant dû, total déclaré). |
| `/cimpots code code:<CODE>` | Utilise un code promo pour obtenir une réduction sur tes impôts. |
| `/dimpots` | Déclare le paiement de tes impôts de la semaine (le montant s'ajoute à ton total déclaré). |
| `/himpot` | Affiche le numéro configuré par un admin pour transférer le paiement. |
| `/aideimpots` | Liste toutes les commandes (avec la section admin si tu es admin). |

### Admin uniquement (masquées aux autres membres par défaut)

| Commande | Description |
|---|---|
| `/padmin creer pourcentage:<1-100> duree:<jours\|jamais>` | Crée un code promo à usage unique. |
| `/padmin liste` | Liste les codes promo actifs (non utilisés, non expirés). |
| `/padmin revoquer code:<CODE>` | Invalide un code promo avant qu'il soit utilisé. |
| `/aimpots reset membre:<@membre>` | Réinitialise complètement le profil fiscal d'un membre. |
| `/aimpots ajouter membre:<@membre> montant:<nombre>` | Ajoute manuellement un montant au total déclaré (ex : pénalité). |
| `/aimpots retirer membre:<@membre> montant:<nombre>` | Retire manuellement un montant (ex : paiement jamais reçu). |
| `/aimpots telephone numero:<numero>` | Configure le numéro affiché par `/himpot`. |
| `/aimpots voir membre:<@membre>` | Affiche le détail complet du profil fiscal d'un membre. |
| `/aimpots liste` | Vue d'ensemble de tous les membres configurés et de ce qu'ils doivent. |

`/padmin` et `/aimpots` sont masquées aux membres non-admins par défaut (permission Discord "Administrateur"), avec une double vérification dans le code au cas où un admin du serveur modifierait les permissions des commandes.

## Calcul de l'impôt — à personnaliser

Le calcul est **progressif par tranches**, configurable dans `config.json` sans toucher au code :

```json
{
  "impots": {
    "tranches": [
      { "jusquA": 100, "taux": 0 },
      { "jusquA": 300, "taux": 10 },
      { "jusquA": 600, "taux": 20 },
      { "jusquA": 1000, "taux": 30 },
      { "jusquA": null, "taux": 40 }
    ],
    "reductionCouplePourcent": 10
  }
}
```

- Chaque tranche de revenu est taxée au taux indiqué (comme un vrai barème progressif). `jusquA: null` = tranche finale sans plafond.
- `reductionCouplePourcent` : réduction appliquée en plus si le statut est `couple`.
- Les codes promo appliquent une réduction supplémentaire par-dessus.

**Ce sont des valeurs d'exemple** — ajuste les tranches, les taux et la réduction couple selon ce que tu veux pour l'organisation.

## Notes / choix faits

- Commandes slash (`/`) plutôt que préfixe texte, avec autocomplétion native Discord pour les sous-commandes et options.
- Toutes les réponses sont éphémères (privées), y compris pour les commandes admin.
- `/dimpots` enregistre une déclaration au montant hebdomadaire calculé actuel (pas de saisie manuelle du montant) et l'ajoute au total déclaré du membre — c'est ce total qui "s'accumule".
- Un code promo généré par `/padmin creer` est à usage unique : une fois utilisé, il devient invalide pour tout le monde.
- Le numéro affiché par `/himpot` est une simple information configurée par un admin — le bot n'effectue aucun transfert d'argent lui-même.
- Toutes les données sont stockées par serveur (`guildId`) dans `data/db.json` ; ce fichier est ignoré par git (`.gitignore`).

Si certains comportements ne correspondent pas à ce que tu avais en tête, dis-le-moi et j'ajuste.
