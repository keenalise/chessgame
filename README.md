# KeenChess

KeenChess is a browser-based chess application built with a polished dark UI, full game logic, puzzle modes, authentication, and engine-assisted play. It combines a modern interface with interactive chess features, including standard gameplay, board review, tactical puzzles, and a VS Computer mode.

## Features

- Full chess gameplay with legal move handling, castling, promotion, en passant, undo, redo, and move history
- VS Computer mode with engine-assisted play
- Game review mode with move-by-move analysis and performance feedback
- 8 Queens puzzle with solution browsing
- Knight Tour puzzle with interactive board solving
- Lichess Daily Puzzle integration
- Random Lichess puzzle mode
- Firebase-powered authentication with email/password and Google sign-in
- Responsive, animated, dark-themed interface
- Modular board rendering and reusable UI components

## Tech Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- CSS Modules
- Firebase Authentication (email/password + Google)
- Lichess puzzle / cloud-eval / opening-explorer APIs (public, no key required)
- Stockfish (WASM, bundled in `public/stockfish/`) for local engine analysis

## Project Structure

- `app/page.tsx` - sign-in, registration, and password-reset page
- `app/dashboard/page.tsx` - puzzle and dashboard interface
- `app/play/page.tsx` - main chess gameplay interface
- `lib/firebase.ts` - Firebase initialization and auth helpers
- `lib/chessEngine.ts`, `lib/chessTypes.ts` - core chess logic and types
- `lib/stockfishEngine.ts`, `lib/engineApi.ts` - engine wrappers and cloud eval
- `hooks/` - `useAuth`, `useChessGame`, `useGameReview`, `useLichessPuzzle`
- `components/` - board rendering, puzzles, and reusable UI

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file and fill in your Firebase config:

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and set each `NEXT_PUBLIC_FIREBASE_*` value from your
   Firebase project (Firebase Console → Project settings → General → Your apps
   → Web app → "SDK setup and configuration" → Config). Without these values,
   authentication will not work and sign-in shows a configuration error.

3. In the Firebase Console, enable the sign-in methods you want under
   **Authentication → Sign-in method** (Email/Password and Google), and make
   sure your dev domain (`localhost`) is listed under **Authentication →
   Settings → Authorized domains**.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Then open http://localhost:3000 to sign in or register.

## Main Modes

### Standard Game
Play a full chess match with supported chess rules and move history.

### VS Computer
Enable computer play to challenge the engine and test your strategy.

### Review Mode
Analyze completed games with move classifications, accuracy indicators, and board replay controls.

### Puzzle Mode
Solve interactive puzzles such as:

- 8 Queens
- Knight Tour
- Daily Puzzle
- Random Puzzle

## Authentication

KeenChess includes Firebase authentication with:

- Email and password sign-in
- Google sign-in
- Account registration
- Password reset

## Design Notes

The interface uses a luxury dark theme with warm gold accents, animated background effects, and a premium chess-board presentation to make the experience feel more immersive.

## Status

This project is actively designed as a feature-rich chess platform for gameplay, puzzles, and analysis.

