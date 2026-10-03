# Next Chat

A real-time chat app with a web client, two mobile clients and a small presence server.

| Part | Folder | Stack |
|---|---|---|
| Web app (PWA) | [`web/`](web/) | Next.js 14, Firebase Auth, Supabase, web push |
| Presence backend | [`backend/`](backend/) | Node.js, Express, Socket.io (online/last-seen status) |
| Mobile app | [`mobile-flutter/`](mobile-flutter/) | Flutter, Firebase, Supabase |
| Mobile app (alternative) | [`mobile-expo/`](mobile-expo/) | Expo / React Native, Firebase, Supabase |

All clients share the same Firebase project and Supabase database.

## Run locally

```bash
# Web (copy env.example to .env.local and fill it in first)
cd web && npm install && npm run dev

# Backend
cd backend && npm install && node server.js

# Flutter app
cd mobile-flutter && flutter pub get && flutter run

# Expo app (copy env.example to .env first)
cd mobile-expo && npm install && npx expo start
```

Some local files are never committed, so copy them over by hand:

- `web/.env.local`
- `mobile-expo/.env`
- Firebase `google-services.json` and `GoogleService-Info.plist` for the mobile apps

## Deployment

The web app is deployed on Vercel from this repo, with **Root Directory** set to `web`.

## History

- **`web/`**: the original contents of this repo, moved into `web/`. To see a file's full history, use `git log --follow`.
- **`backend/`**: merged in from the old `next-chat-backend` repo with all its commits. Its runtime `database.json` was removed from the history.
- **`mobile-flutter/`**: was committed as `mobile/` on Oct 21, 2025, removed the next day, and kept being developed locally. This folder holds the latest local code.
- **`mobile-expo/`**: committed here for the first time.
