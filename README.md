# Beck ChatKit Frontend

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![NextJS](https://img.shields.io/badge/Built_with-NextJS-blue)
![OpenAI API](https://img.shields.io/badge/Powered_by-OpenAI_API-orange)

This app renders the ChatKit UI for the self-hosted Beck agent backend in
`../agent-backend`. ChatKit talks directly to that backend through the custom
ChatKit API protocol instead of creating OpenAI-hosted workflow sessions.

## What You Get

- Next.js app with `<openai-chatkit>` web component and theming controls
- Custom ChatKit API configuration in [`components/ChatKitPanel.tsx`](components/ChatKitPanel.tsx)
- Config file for theme, placeholder text, and greeting message

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

```bash
cp .env.example .env.local
```

### 3. Configure ChatKit endpoints

- `NEXT_PUBLIC_CHATKIT_API_URL` points to the self-hosted ChatKit endpoint, for example `http://localhost:8000/chatkit`.
- `NEXT_PUBLIC_CHATKIT_DOMAIN_KEY` is `local-dev` locally. Use the domain key from the OpenAI domain allowlist in production.

### 4. Run the app

```bash
npm run dev
```

Start `../agent-backend` first, then visit `http://localhost:3000` and start chatting.

### 5. Deploy your app

```bash
npm run build
```

Before deploying your app, verify the domain by adding it to the OpenAI domain allowlist.

## Customization Tips

- Adjust greeting text, ChatKit theme, and placeholder copy in [`lib/config.ts`](lib/config.ts).
- Update the event handlers inside [`components/ChatKitPanel.tsx`](components/ChatKitPanel.tsx) to integrate with your product analytics or storage.
