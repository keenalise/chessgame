# ♔ Keen Chess - Chess Game ♛

A modern, feature-rich chess game built with HTML5, CSS3, and JavaScript, featuring Firebase authentication and a beautiful user interface.

## 🚀 Features

### 🎮 Game Features
- **Full Chess Rules Implementation**: Complete chess gameplay with all standard rules
- **Castling Support**: Kingside and queenside castling with proper validation
- **En Passant**: Special pawn capture moves
- **Pawn Promotion**: Promote pawns to Queen, Rook, Bishop, or Knight
- **Check & Checkmate Detection**: Automatic game state detection
- **Move Validation**: Prevents illegal moves and ensures king safety
- **Move History**: Track all moves with standard chess notation
- **Undo/Redo**: Navigate through move history
- **Visual Indicators**: Highlighted valid moves, captures, and special moves

### 🔐 Authentication System
- **Firebase Integration**: Secure user authentication
- **Multiple Sign-in Methods**:
  - Email/Password registration and login
  - Google OAuth integration
  - Password reset functionality
- **User Session Management**: Persistent login state
- **Offline Mode Detection**: Graceful handling of connection issues

### 🎨 User Interface
- **Beautiful Design**: Modern gradient backgrounds with animated elements
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Interactive Chess Board**: Drag-and-drop piece movement
- **Real-time Status Updates**: Turn indicators, castling rights, and game status
- **Smooth Animations**: Hover effects and transitions
- **Accessibility**: Keyboard navigation and screen reader support

## 📁 Project Structure

```
chess/
├── chessgame.html          # Main chess game interface
├── chessgame.css          # Chess game styles (not provided)
├── chesslogin.html        # Authentication page
├── chesslogin.css         # Authentication page styles
├── chesslogin.js          # Authentication logic
├── firebase.js            # Firebase configuration and auth functions
└── README.md              # This file
```

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Authentication**: Firebase Auth
- **Styling**: Custom CSS with modern features (Grid, Flexbox, CSS Variables)
- **Icons**: Unicode chess pieces and emoji icons
- **Responsive Design**: Mobile-first approach

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for Firebase authentication)
- Web server (for local development)

### Installation

1. **Clone or Download** the project files to your local machine

2. **Set up Firebase** (if you want to use your own Firebase project):
   ```javascript
   // Update firebase.js with your Firebase config
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-auth-domain",
     projectId: "your-project-id",
     // ... other config
   };
   ```

3. **Serve the files** using a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   
   # Using Live Server (VS Code extension)
   # Right-click on chesslogin.html -> "Open with Live Server"
   ```

4. **Open in browser**:
   - Navigate to `http://localhost:8000/chesslogin.html`
   - Create an account or sign in
   - Start playing chess!

## 🎯 How to Play

### Authentication
1. Open `chesslogin.html` in your browser
2. Choose to sign in with Google or create an account with email
3. Complete the authentication process

### Playing Chess
1. After authentication, you'll be redirected to the chess game
2. **Select a piece** by clicking on it (highlighted valid moves will appear)
3. **Move pieces** by clicking on a highlighted destination square
4. **Castle** by double-clicking the king and selecting castling side
5. **Promote pawns** by moving them to the last rank and selecting the promotion piece
6. **Use controls**:
   - **New Game**: Start a fresh game
   - **Undo**: Take back the last move
   - **Redo**: Replay an undone move
   - **Clear History**: Remove all move history

### Special Moves
- **Castling**: Double-click the king when castling is available
- **En Passant**: Automatic when conditions are met
- **Pawn Promotion**: Choose from Queen, Rook, Bishop, or Knight

## 🎨 Customization

### Styling
The game uses CSS custom properties for easy theming:

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --light-square: #f0d9b5;
  --dark-square: #b58863;
}
```

### Game Settings
You can modify game behavior in `chessgame.html`:

```javascript
// Piece symbols can be customized
const pieceSymbols = {
  'white_king': '♔',
  'black_king': '♚',
  // ... customize other pieces
};
```

## 🔧 Features Breakdown

### Chess Engine
- **Move Validation**: Comprehensive rule checking for all pieces
- **Game State Management**: Track board state, turn, castling rights
- **Special Rules**: En passant, castling, pawn promotion
- **Check Detection**: Prevent moves that leave king in check
- **Checkmate Logic**: Determine when game is over

### User Interface
- **Responsive Grid**: 8x8 chess board with coordinate labels
- **Visual Feedback**: Hover effects, move highlighting, status updates
- **Modal Dialogs**: Pawn promotion and castling selection
- **Move History**: Scrollable list with chess notation

### Authentication System
- **Firebase Auth**: Secure user management
- **Form Validation**: Client-side input validation
- **Error Handling**: User-friendly error messages
- **Session Persistence**: Remember logged-in users

## 📱 Browser Compatibility

- **Chrome** 60+
- **Firefox** 55+
- **Safari** 12+
- **Edge** 79+
- **Mobile browsers** (iOS Safari, Chrome Mobile)

## 🤝 Contributing

Contributions are welcome! Here are some areas for improvement:

### Potential Features
- **Online Multiplayer**: Real-time games between users
- **AI Opponent**: Computer player with difficulty levels
- **Game Analysis**: Move suggestions and analysis
- **Tournament Mode**: Bracket-style competitions
- **Game Statistics**: Win/loss records, ELO rating
- **Board Themes**: Different visual themes
- **Sound Effects**: Move sounds and notifications
- **Game Import/Export**: PGN format support

### Bug Reports
If you find any issues:
1. Check the browser console for errors
2. Test in different browsers
3. Provide steps to reproduce the issue

## 📄 License

This project is open source. Feel free to use, modify, and distribute as needed.

## 🙋‍♂️ Support

For questions or issues:
- Check the browser developer console for error messages
- Ensure JavaScript is enabled
- Verify internet connection for Firebase features
- Try refreshing the page or clearing browser cache

## 🎯 Development Notes

### File Dependencies
```
chesslogin.html
├── chesslogin.css (styling)
├── chesslogin.js (auth logic)
└── firebase.js (Firebase config)

chessgame.html
├── chessgame.css (game styling)
└── Embedded JavaScript (game logic)
```

### Firebase Configuration
The project uses Firebase for authentication. The current configuration points to a demo project. For production use, create your own Firebase project and update the configuration in `firebase.js`.

### Browser Storage
- **Session Storage**: Temporary user session data
- **Local Storage**: Persistent user preferences
- **No Cookies**: Privacy-friendly approach

---

**Enjoy playing chess!** ♔♕♖♗♘♙ vs ♚♛♜♝♞♟
