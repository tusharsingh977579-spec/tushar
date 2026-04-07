# Chrono Heist Prototype

This repository currently contains a **playable prototype** of the game (not the final 100% worldwide multiplayer release yet).

If you want to **download and run the full project locally right now**, use the steps below.

## Quick install (copy/paste)

From a terminal:

```bash
git clone <YOUR_REPO_URL>
cd tushar
npm install
npm run dev
```

Then open: `http://localhost:3000`

If you already downloaded ZIP, replace the first two commands with `cd` into the extracted folder, then run `npm install` and `npm run dev`.

## 1) Download the project

### Option A: Download ZIP from GitHub
1. Open the repository page in your browser.
2. Click **Code** → **Download ZIP**.
3. Extract the ZIP to a folder on your computer.

### Option B: Clone with Git
```bash
git clone <YOUR_REPO_URL>
cd tushar
```

## 2) Install requirements

- Install **Node.js 20+** (LTS recommended).
- Then install dependencies:

```bash
npm install
```

## 3) Start the game in development mode

```bash
npm run dev
```

Open the URL shown in terminal (usually `http://localhost:3000`).

## 4) Download a production build (offline files)

Build the game:

```bash
npm run build
```

This creates a `dist/` folder. That folder is the downloadable web build.

To test the production build locally:

```bash
npm run preview
```

## 5) Share/download it on other devices

You can upload the `dist/` folder to any static host:
- Netlify
- Vercel
- GitHub Pages
- Firebase Hosting

Then anyone worldwide can open and play from the deployed URL.

---

## Important clarification

- Right now this repo is a **prototype** version of Chrono Heist.
- If you want a true “full game” (accounts, matchmaking, global multiplayer servers, anti-cheat, progression, live ops), those systems still need to be implemented.

A practical next step is to build an authoritative multiplayer backend, then deploy region-based servers and connect this client to them.
