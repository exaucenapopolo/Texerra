# Texerra — améliorations du tableau de bord et du support

Ce document décrit les changements apportés au dépôt et les paramètres nécessaires au déploiement.

## 1. Configuration Resend

Les envois d'e-mails administratifs, les reçus de codes SMS et les félicitations commerciales utilisent le serveur Resend.

Dans les variables d'environnement du projet Vercel, définir :

- `RESEND_API_KEY` : clé API privée créée dans Resend.

Le domaine `texerra.site` et l'adresse expéditrice `support@texerra.site` doivent être vérifiés dans Resend avant l'envoi en production. La clé API ne doit jamais être placée dans le code frontend ni commitée dans GitHub.

La configuration Firebase Admin existante reste requise, notamment `FIREBASE_SERVICE_ACCOUNT_JSON`.

## 2. Index Firestore

Le fichier `firestore.indexes.json` contient les index nécessaires aux historiques paginés et aux attributions commerciales. Après vérification du projet Firebase ciblé, déployer les index avec :

```bash
firebase deploy --only firestore:indexes
```

Ne lancez cette commande que depuis le projet Firebase Texerra déjà configuré dans votre environnement Firebase CLI.

## 3. Envoi des messages

- Les e-mails envoyés depuis les fiches utilisateurs et les fiches commerciales passent réellement par Resend.
- Les modèles peuvent être modifiés avant envoi.
- Chaque envoi réussi est enregistré dans l'historique du destinataire et dans le journal global des contacts.
- Une ouverture de WhatsApp est enregistrée comme `opened` et non comme un message envoyé : l'application ne prétend donc pas qu'un message WhatsApp a été transmis.
- Les messages personnalisés envoyés depuis l'administration sont du HTML e-mail compatible avec les principaux clients de messagerie. Le texte saisi est échappé avant insertion dans le HTML.

## 4. Confirmation de code SMS et notifications

L'e-mail de code est envoyé seulement lorsque l'API détecte que le fournisseur a effectivement retourné un code SMS. Il contient le code, le service choisi, le pays et son drapeau, le numéro et la référence de commande.

La réception du code crée aussi une notification persistante dans le centre de notifications du tableau de bord utilisateur. Cette version implémente les notifications **dans l'application** ; elle ne configure pas les notifications push du système Android/iOS ou du navigateur.

La détection du code dépend du mécanisme de consultation de la commande par l'application. En l'absence de tâche planifiée/cron active, si l'utilisateur quitte l'application avant qu'un code soit détecté, l'e-mail ne partira pas en arrière-plan tant qu'une prochaine consultation de cette commande n'aura pas lieu.

## 5. Lectures Firestore et limites de données

- La liste des utilisateurs est paginée et utilise des agrégations `count()` pour les compteurs au lieu de télécharger les commandes de tous les utilisateurs.
- Les profils historiques sans compteurs sont initialisés progressivement quand ils apparaissent dans une page. Cette initialisation utilise des agrégations et non des téléchargements complets de commandes.
- Les détails d'un utilisateur (authentification, dernières commandes, codes, attribution et historique de contact) ne sont chargés qu'à l'ouverture de sa fiche.
- Les clients attribués sont lus par pages de 20.
- Le classement des meilleurs utilisateurs est calculé uniquement lorsqu'il est demandé : il est plafonné à 10 000 commandes pour une période datée et 50 000 pour l'historique. L'API signale si le plafond est atteint.
- L'export administrateur complet est une action explicite. Pour éviter des réponses trop volumineuses, chaque collection est plafonnée à 50 000 documents. Le fichier JSON contient `coverage.totalAvailable`, `coverage.exported` et `coverage.truncated` pour indiquer clairement si une collection a dépassé la limite.

Les filtres « ayant déjà commandé », « solde > 0 » et « jamais commandé » s'appliquent à la page d'utilisateurs actuellement chargée afin d'éviter une lecture intégrale de la base à chaque filtre.

## 6. Vérifications réalisées

Le contrôle de syntaxe TypeScript/TSX a été exécuté sur les 166 fichiers du dépôt sans diagnostic de syntaxe. `firestore.indexes.json` a également été validé comme JSON.

Le build Vite, le contrôle TypeScript complet et les appels réels à Firebase/Resend n'ont pas pu être validés dans cet environnement : les dépendances Node du projet n'étaient pas installées et aucun secret de production n'est fourni dans l'archive. Après extraction, lancer `npm install`, puis `npm run typecheck` et `npm run build`, et corriger toute erreur de dépendance/configuration propre à l'environnement avant la mise en production.
