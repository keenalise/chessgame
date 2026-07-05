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

- HTML5
- CSS3
- JavaScript
- Firebase Authentication
- Lichess puzzle API
- Chess-API / engine-assisted analysis
- Responsive web design

## Project Structure

- `index.html` - sign-in and registration page
- `chessgame.html` - main chess gameplay interface
- `chessmaininterface.html` - puzzle and dashboard interface
- `chesslogin.js` - login, registration, and Firebase auth logic
- `firebase.js` - Firebase initialization and auth helpers
- `chessgame.js` - main chess engine, move logic, AI mode, and review system
- `maininterface.js` - board rendering and puzzle modal logic
- `chesslogin.css` - authentication page styles
- `chessgame.css` - game board and review styles
- `maininterface.css` - dashboard and puzzle interface styles

## Getting Started

1. Open the project in your browser or serve it through a local web server.
2. Start from `index.html` to sign in or register.
3. After authentication, open the main chess interface and begin playing.

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

