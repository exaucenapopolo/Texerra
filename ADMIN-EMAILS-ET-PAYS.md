# Administration Texerra — amélioration des e-mails, profils et exports

## E-mails
- Les e-mails utilisent le logo horizontal PNG `public/logo-email.png` (compatible avec davantage de clients e-mail que le SVG).
- Le pied de page partagé contient le lien du tableau de bord (ou de l'espace commercial pour les commissions), le support WhatsApp, le support e-mail et les trois partenaires.
- Les e-mails permettent une réponse directe vers `support@texerra.site` (`replyTo`).
- Les messages d'administration sont envoyés via Resend et leur historique est conservé dans Firestore.
- Les modèles de commande et de dépôt incluent les détails exacts de l'opération; les dépôts en attente ou échoués demandent explicitement si un débit a eu lieu avant de conseiller une nouvelle tentative.

## Pays des utilisateurs
Le pays est détecté côté serveur depuis les en-têtes géographiques fournis par l'hébergeur (`x-vercel-ip-country` ou `cf-ipcountry`). Aucun accès GPS ni permission navigateur n'est demandé. Le résultat peut être absent en environnement local ou inexact en cas de VPN/proxy. Les anciens profils sans pays sont complétés à leur prochaine lecture du profil lorsque l'en-tête est disponible.

## Compte utilisateur des commerciaux
La fiche recherche le profil via l'UID Firebase enregistré, puis via Firebase Authentication et l'adresse e-mail. L'index composite `orders(userId, status)` est requis pour compter les commandes réussies.

## Exports
Les exports du tableau de bord administrateur proposent désormais Excel (format SpreadsheetML `.xls` ouvrable dans Excel), CSV ou PDF selon la vue. Le téléchargement complet propose Excel par défaut et conserve JSON comme choix explicite. Les exports complets sont plafonnés à 50 000 documents par collection et l'onglet Résumé signale si une limite a été atteinte.

## Configuration Resend
La variable serveur `RESEND_API_KEY` doit être présente dans les variables d'environnement du déploiement. Le domaine `texerra.site` et l'adresse `support@texerra.site` doivent être validés dans Resend pour que les envois sortants soient acceptés.

## Déploiement des index Firestore

Le dépôt contient désormais `firebase.json`, qui référence explicitement `firestore.indexes.json`. Depuis la racine du projet, après authentification avec Firebase CLI, déployer les index avec :

```bash
firebase deploy --only firestore:indexes --project texerra-d2506
```

Le projet Firebase doit être accessible au compte connecté. Les nouveaux index peuvent nécessiter quelques minutes de construction avant que les requêtes composées de la fiche commerciale fonctionnent.
