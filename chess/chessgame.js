
        // Game state
        let board = Array(8).fill(null).map(() => Array(8).fill(null));
        let selectedPiece = null;
        let currentTurn = 'white';
        let moveHistory = [];
        let redoHistory = [];
        let enPassantTarget = null;
        let capturedPieces = { white: [], black: [] };
        // Board flip functionality
        let isAutoFlip = true;
        let isBoardFlipped = false;


        
        // Castling tracking
        let castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };

        // Piece symbols
        const pieceSymbols = {
            'white_pawn': '♙', 'white_rook': '♖', 'white_knight': '♘', 'white_bishop': '♗',
            'white_queen': '♕', 'white_king': '♔',
            'black_pawn': '♟', 'black_rook': '♜', 'black_knight': '♞', 'black_bishop': '♝',
            'black_queen': '♛', 'black_king': '♚'
        };

        // Initialize game
        function initGame() {
            setupBoard();
            setupPieces();
            updateCastlingDisplay();
            updateTurnDisplay();
        }

        function setupBoard() {
            const chessboard = document.getElementById('chessboard');
            chessboard.innerHTML = '';
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const square = document.createElement('div');
                    square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                    square.dataset.row = row;
                    square.dataset.col = col;
                    
                    // Add coordinates
                    if (row === 7) {
                        const fileCoord = document.createElement('div');
                        fileCoord.className = 'coordinates file-coord';
                        fileCoord.textContent = String.fromCharCode(97 + col);
                        square.appendChild(fileCoord);
                    }
                    if (col === 0) {
                        const rankCoord = document.createElement('div');
                        rankCoord.className = 'coordinates rank-coord';
                        rankCoord.textContent = 8 - row;
                        square.appendChild(rankCoord);
                    }
                    
                    square.addEventListener('click', handleClick);
                    square.addEventListener('dblclick', handleDoubleClick);
                    square.addEventListener('mouseenter', handleHover);
                    
                    chessboard.appendChild(square);
                }
            }
        }

        function setupPieces() {
            // Clear board
            board = Array(8).fill(null).map(() => Array(8).fill(null));
            
            // Setup pawns
            for (let col = 0; col < 8; col++) {
                board[1][col] = 'black_pawn';
                board[6][col] = 'white_pawn';
            }
            
            // Setup other pieces
            const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
            for (let col = 0; col < 8; col++) {
                board[0][col] = `black_${pieceOrder[col]}`;
                board[7][col] = `white_${pieceOrder[col]}`;
            }
            
            drawPieces();
        }

        function drawPieces() {
            const squares = document.querySelectorAll('.square');
            squares.forEach(square => {
                const row = parseInt(square.dataset.row);
                const col = parseInt(square.dataset.col);
                const piece = board[row][col];
                
                // Remove existing piece
                const existingPiece = square.querySelector('.piece');
                if (existingPiece) {
                    existingPiece.remove();
                }
                
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.split('_')[0]}`;
                    pieceElement.textContent = pieceSymbols[piece];
                    square.appendChild(pieceElement);
                }
            });
        }

        function handleClick(event) {
            const square = event.currentTarget;
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            
            if (selectedPiece) {
                movePiece(row, col);
            } else {
                selectPiece(row, col);
            }
        }

        function handleDoubleClick(event) {
            const square = event.currentTarget;
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = board[row][col];
            
            if (piece === `${currentTurn}_king`) {
                showCastlingDialog(row, col);
            }
        }

        function handleHover(event) {
            const square = event.currentTarget;
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = board[row][col];
            
            if (piece) {
                const pieceName = piece.replace('_', ' ').split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                updateStatus(`Hovering: ${pieceName} at ${String.fromCharCode(97 + col)}${8 - row}`);
            } else {
                updateStatus(`Square: ${String.fromCharCode(97 + col)}${8 - row}`);
            }
        }

        function selectPiece(row, col) {
            const piece = board[row][col];
            if (piece && piece.startsWith(currentTurn)) {
                selectedPiece = { row, col };
                clearHighlights();
                highlightSquare(row, col, 'selected');
                showValidMoves(row, col);
                
                const pieceName = piece.replace('_', ' ').split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                
                if (piece.endsWith('king')) {
                    updateStatus(`Selected: ${pieceName} (Double-click to castle)`);
                } else {
                    updateStatus(`Selected: ${pieceName}`);
                }
            }
        }

        function movePiece(row, col) {
            const startRow = selectedPiece.row;
            const startCol = selectedPiece.col;
            const piece = board[startRow][startCol];
            
            // Check if this is a castling move
            if (piece.endsWith('king') && Math.abs(startCol - col) === 2 && startRow === row) {
                const side = col > startCol ? 'kingside' : 'queenside';
                if (canCastle(currentTurn, side)) {
                    performCastle(currentTurn, side);
                    return;
                }
            }
            
            if (isValidMove(startRow, startCol, row, col, piece)) {
                // Check for en passant capture
                const isEnPassant = piece.endsWith('pawn') && 
                                  enPassantTarget && 
                                  row === enPassantTarget.row && 
                                  col === enPassantTarget.col;
                
                let enPassantCapturedPiece = null;
                let enPassantCapturedPos = null;
                
                if (isEnPassant) {
                    const capturedPawnRow = row + (piece.startsWith('white') ? 1 : -1);
                    enPassantCapturedPiece = board[capturedPawnRow][col];
                    enPassantCapturedPos = { row: capturedPawnRow, col };
                    board[capturedPawnRow][col] = null;
                }
                
                // Store move for undo functionality
                const capturedPiece = board[row][col];
                const move = {
                    type: 'normal',
                    from: { row: startRow, col: startCol },
                    to: { row, col },
                    piece,
                    captured: capturedPiece,
                    turn: currentTurn,
                    castlingRightsBefore: JSON.parse(JSON.stringify(castlingRights)),
                    enPassantTargetBefore: enPassantTarget,
                    isEnPassant,
                    enPassantCapturedPiece,
                    enPassantCapturedPos
                };
                
                // Make the move
                board[startRow][startCol] = null;
                board[row][col] = piece;
                
                // Check if move leaves king in check
                if (isInCheck(currentTurn)) {
                    // Undo move
                    board[startRow][startCol] = piece;
                    board[row][col] = capturedPiece;
                    if (isEnPassant) {
                        board[enPassantCapturedPos.row][enPassantCapturedPos.col] = enPassantCapturedPiece;
                    }
                    
                } else {
                    // Valid move - update castling rights
                    updateCastlingRightsAfterMove(piece, startRow, startCol, row, col);
                    
                    // Update en passant target
                    enPassantTarget = null;
                    if (piece.endsWith('pawn') && Math.abs(startRow - row) === 2) {
                        enPassantTarget = { row: (startRow + row) / 2, col };
                    }
                    
                    // Add to move history
                    moveHistory.push(move);
                    redoHistory = [];
                    
                    // Handle captured pieces
                    if (capturedPiece) {
                        capturedPieces[currentTurn].push(capturedPiece);
                    }
                    if (isEnPassant && enPassantCapturedPiece) {
                        capturedPieces[currentTurn].push(enPassantCapturedPiece);
                    }
                    
                    // Check for pawn promotion
                    if (piece.endsWith('pawn') && (row === 0 || row === 7)) {
                        showPromotionDialog(row, col);
                    }
                    
                    // Switch turns
                    currentTurn = currentTurn === 'white' ? 'black' : 'white';
                    updateTurnDisplay();
                    updateCastlingDisplay();
                    
                    // Check game end conditions
                    if (isCheckmate(currentTurn)) {
                        const winner = currentTurn === 'white' ? 'Black' : 'White';
                        showVictoryModal(winner);
                    } else if (isInCheck(currentTurn)) {
                        // Just highlight the king in check, no message
                        highlightKingInCheck();
                    }
                    
                    
                    // Add move to history display
                    const isCapture = capturedPiece !== null || isEnPassant;
                    const moveNotation = formatMoveNotation(piece, startRow, startCol, row, col, isCapture);
                    const finalNotation = moveNotation + (isEnPassant ? " e.p." : "");
                    
                    const isCheck = isInCheck(currentTurn);
                    const isCheckmateVal = isCheckmate(currentTurn);
                    
                    addMoveToHistory(finalNotation, isCapture, isCheck, isCheckmateVal);
                    
                    const displayMove = `${String.fromCharCode(97 + startCol)}${8-startRow} → ${String.fromCharCode(97 + col)}${8-row}`;
                    updateStatus(`Last move: ${displayMove}${isEnPassant ? " (en passant)" : ""}`);
                }
            }
            
            // Clear selection
            selectedPiece = null;
            clearHighlights();
            drawPieces();
        }

        function isValidMove(startRow, startCol, endRow, endCol, piece) {
            if (!piece) return false;

            const destinationPiece = board[endRow][endCol];
            if (destinationPiece && destinationPiece.startsWith(currentTurn)) {
                return false;
            }

            // Special handling for king castling moves
            if (piece.endsWith('king') && Math.abs(startCol - endCol) === 2 && startRow === endRow) {
                const side = endCol > startCol ? 'kingside' : 'queenside';
                return canCastle(currentTurn, side);
            }

            if (piece.endsWith('pawn')) {
                const direction = piece.startsWith('white') ? -1 : 1;
                
                // Forward moves
                if (startCol === endCol && !destinationPiece) {
                    if (endRow === startRow + direction) {
                        return true;
                    }
                    // Two-square initial move
                    if ((startRow === 6 && piece.startsWith('white')) || (startRow === 1 && piece.startsWith('black'))) {
                        if (endRow === startRow + 2 * direction && !board[startRow + direction][endCol]) {
                            return true;
                        }
                    }
                }
                // Diagonal captures
                else if (Math.abs(startCol - endCol) === 1 && endRow === startRow + direction) {
                    // Normal capture
                    if (destinationPiece && !destinationPiece.startsWith(currentTurn)) {
                        return true;
                    }
                    // En passant capture
                    else if (enPassantTarget && endRow === enPassantTarget.row && endCol === enPassantTarget.col) {
                        return true;
                    }
                }
            }
            else if (piece.endsWith('king')) {
                if (Math.abs(startRow - endRow) <= 1 && Math.abs(startCol - endCol) <= 1) {
                    return true;
                }
            }
            else if (piece.endsWith('rook')) {
                if (startRow === endRow || startCol === endCol) {
                    return isPathClear(startRow, startCol, endRow, endCol);
                }
            }
            else if (piece.endsWith('knight')) {
                const rowDiff = Math.abs(startRow - endRow);
                const colDiff = Math.abs(startCol - endCol);
                if ((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) {
                    return true;
                }
            }
            else if (piece.endsWith('bishop')) {
                if (Math.abs(startRow - endRow) === Math.abs(startCol - endCol)) {
                    return isPathClear(startRow, startCol, endRow, endCol);
                }
            }
            else if (piece.endsWith('queen')) {
                if (startRow === endRow || startCol === endCol || Math.abs(startRow - endRow) === Math.abs(startCol - endCol)) {
                    return isPathClear(startRow, startCol, endRow, endCol);
                }
            }
            return false;
        }

        function isPathClear(startRow, startCol, endRow, endCol) {
            const stepRow = startRow === endRow ? 0 : (endRow > startRow ? 1 : -1);
            const stepCol = startCol === endCol ? 0 : (endCol > startCol ? 1 : -1);
            
            let currentRow = startRow + stepRow;
            let currentCol = startCol + stepCol;
            
            while (currentRow !== endRow || currentCol !== endCol) {
                if (board[currentRow][currentCol] !== null) {
                    return false;
                }
                currentRow += stepRow;
                currentCol += stepCol;
            }
            return true;
        }

        function showValidMoves(startRow, startCol) {
            const piece = board[startRow][startCol];
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (isValidMove(startRow, startCol, row, col, piece)) {
                        // Check if this move would leave king in check
                        const originalPiece = board[row][col];
                        const movingPiece = board[startRow][startCol];
                        
                        // Make temporary move
                        board[row][col] = movingPiece;
                        board[startRow][startCol] = null;
                        
                        // Handle en passant capture temporarily
                        let tempEnPassantCapture = null;
                        let tempEnPassantPos = null;
                        if (piece.endsWith('pawn') && enPassantTarget && 
                            row === enPassantTarget.row && col === enPassantTarget.col) {
                            const capturedPawnRow = row + (piece.startsWith('white') ? 1 : -1);
                            tempEnPassantCapture = board[capturedPawnRow][col];
                            tempEnPassantPos = { row: capturedPawnRow, col };
                            board[capturedPawnRow][col] = null;
                        }
                        
                        // Check if king would still be in check after this move
                        const wouldBeInCheck = isInCheck(currentTurn);
                        
                        // Restore board
                        board[startRow][startCol] = movingPiece;
                        board[row][col] = originalPiece;
                        if (tempEnPassantCapture) {
                            board[tempEnPassantPos.row][tempEnPassantPos.col] = tempEnPassantCapture;
                        }
                        
                        // Only show move if it doesn't leave king in check
                        if (!wouldBeInCheck) {
                            const square = getSquareElement(row, col);
                            if (board[row][col] !== null) {
                                square.classList.add('capture');
                            } else {
                                square.classList.add('valid-move');
                            }
                        }
                    }
                }
            }
            
            // Show castling moves for king (only if not in check)
            if (piece.endsWith('king') && !isInCheck(currentTurn)) {
                showCastlingMoves(startRow, startCol);
            }
            // Show en passant moves for pawns
            if (piece.endsWith('pawn')) {
                showEnPassantMovesFiltered(startRow, startCol);
            }
        }
        //enpassant
        function showEnPassantMovesFiltered(startRow, startCol) {
            if (!enPassantTarget) return;
            
            const piece = board[startRow][startCol];
            if (!piece.endsWith('pawn')) return;
            
            const direction = piece.startsWith('white') ? -1 : 1;
            const targetRow = enPassantTarget.row;
            const targetCol = enPassantTarget.col;
            
            // Check if this pawn can capture en passant
            if (targetRow === startRow + direction && Math.abs(targetCol - startCol) === 1) {
                // Test if en passant move would leave king in check
                const capturedPawnRow = targetRow + (piece.startsWith('white') ? 1 : -1);
                const capturedPiece = board[capturedPawnRow][targetCol];
                
                // Make temporary en passant move
                board[startRow][startCol] = null;
                board[targetRow][targetCol] = piece;
                board[capturedPawnRow][targetCol] = null;
                
                const wouldBeInCheck = isInCheck(currentTurn);
                
                // Restore board
                board[startRow][startCol] = piece;
                board[targetRow][targetCol] = null;
                board[capturedPawnRow][targetCol] = capturedPiece;
                
                // Only show en passant if it doesn't leave king in check
                if (!wouldBeInCheck) {
                    const square = getSquareElement(targetRow, targetCol);
                    square.classList.add('en-passant');
                }
            }
        }

        function showCastlingMoves(kingRow, kingCol) {
            const color = currentTurn;
            
            // Check kingside castling
            if (canCastle(color, 'kingside')) {
                const targetCol = 6; // King goes to g-file
                const square = getSquareElement(kingRow, targetCol);
                square.classList.add('castle');
            }
            
            // Check queenside castling
            if (canCastle(color, 'queenside')) {
                const targetCol = 2; // King goes to c-file
                const square = getSquareElement(kingRow, targetCol);
                square.classList.add('castle');
            }
        }

        function showEnPassantMoves(startRow, startCol) {
            if (!enPassantTarget) return;
            
            const piece = board[startRow][startCol];
            if (!piece.endsWith('pawn')) return;
            
            const direction = piece.startsWith('white') ? -1 : 1;
            const targetRow = enPassantTarget.row;
            const targetCol = enPassantTarget.col;
            
            // Check if this pawn can capture en passant
            if (targetRow === startRow + direction && Math.abs(targetCol - startCol) === 1) {
                const square = getSquareElement(targetRow, targetCol);
                square.classList.add('en-passant');
            }
        }

        function canCastle(color, side) {
            // Check if we still have castling rights
            if (!castlingRights[color][side]) {
                return false;
            }
            
            // Check if king is in check
            if (isInCheck(color)) {
                return false;
            }
            
            const kingRow = color === 'white' ? 7 : 0;
            const kingCol = 4;
            
            if (side === 'kingside') {
                // Check if squares between king and rook are empty
                for (let col = 5; col <= 6; col++) {
                    if (board[kingRow][col] !== null) {
                        return false;
                    }
                }
                
                // Check if king would pass through or end in check
                for (let col = 5; col <= 6; col++) {
                    if (wouldBeInCheckAfterMove(kingRow, kingCol, kingRow, col, color)) {
                        return false;
                    }
                }
            } else { // queenside
                // Check if squares between king and rook are empty
                for (let col = 1; col <= 3; col++) {
                    if (board[kingRow][col] !== null) {
                        return false;
                    }
                }
                
                // Check if king would pass through or end in check
                for (let col = 2; col <= 3; col++) {
                    if (wouldBeInCheckAfterMove(kingRow, kingCol, kingRow, col, color)) {
                        return false;
                    }
                }
            }
            
            return true;
        }

        function wouldBeInCheckAfterMove(fromRow, fromCol, toRow, toCol, color) {
            // Make temporary move
            const originalPiece = board[toRow][toCol];
            const movingPiece = board[fromRow][fromCol];
            
            board[toRow][toCol] = movingPiece;
            board[fromRow][fromCol] = null;
            
            const inCheck = isInCheck(color);
            
            // Restore board
            board[fromRow][fromCol] = movingPiece;
            board[toRow][toCol] = originalPiece;
            
            return inCheck;
        }

        function performCastle(color, side) {
            const kingRow = color === 'white' ? 7 : 0;
            const kingCol = 4;
            
            let newKingCol, rookCol, newRookCol;
            if (side === 'kingside') {
                newKingCol = 6;
                rookCol = 7;
                newRookCol = 5;
            } else { // queenside
                newKingCol = 2;
                rookCol = 0;
                newRookCol = 3;
            }
            
            // Store move for undo functionality
            const move = {
                type: 'castle',
                color,
                side,
                kingFrom: { row: kingRow, col: kingCol },
                kingTo: { row: kingRow, col: newKingCol },
                rookFrom: { row: kingRow, col: rookCol },
                rookTo: { row: kingRow, col: newRookCol },
                turn: currentTurn,
                castlingRightsBefore: JSON.parse(JSON.stringify(castlingRights))
            };
            
            // Move pieces
            const kingPiece = board[kingRow][kingCol];
            const rookPiece = board[kingRow][rookCol];
            
            board[kingRow][kingCol] = null;
            board[kingRow][rookCol] = null;
            board[kingRow][newKingCol] = kingPiece;
            board[kingRow][newRookCol] = rookPiece;
            
            // Update castling rights
            castlingRights[color].kingside = false;
            castlingRights[color].queenside = false;
            
            // Add to move history
            moveHistory.push(move);
            redoHistory = [];
            
            // Switch turns
            currentTurn = currentTurn === 'white' ? 'black' : 'white';
            updateTurnDisplay();
            updateCastlingDisplay();
            
            // Clear selection and redraw
            selectedPiece = null;
            clearHighlights();
            drawPieces();
            
            const castleNotation = side === 'kingside' ? "O-O" : "O-O-O";
            addMoveToHistory(castleNotation, false, false, false, true);
            updateStatus(`Castled ${side}: ${castleNotation}`);
            
            // Check for check after castling
            if (isInCheck(currentTurn)) {
                highlightKingInCheck();
            }
        }

        function updateCastlingRightsAfterMove(piece, fromRow, fromCol, toRow, toCol) {
            // King moves - lose all castling rights for that color
            if (piece.endsWith('king')) {
                const color = piece.split('_')[0];
                castlingRights[color].kingside = false;
                castlingRights[color].queenside = false;
            }
            
            // Rook moves - lose castling rights for that side
            else if (piece.endsWith('rook')) {
                const color = piece.split('_')[0];
                if (color === 'white') {
                    if (fromRow === 7 && fromCol === 0) { // a1 rook (queenside)
                        castlingRights[color].queenside = false;
                    } else if (fromRow === 7 && fromCol === 7) { // h1 rook (kingside)
                        castlingRights[color].kingside = false;
                    }
                } else { // black
                    if (fromRow === 0 && fromCol === 0) { // a8 rook (queenside)
                        castlingRights[color].queenside = false;
                    } else if (fromRow === 0 && fromCol === 7) { // h8 rook (kingside)
                        castlingRights[color].kingside = false;
                    }
                }
            }
            
            // Rook captured - opponent loses castling rights for that side
            const capturedSquare = [toRow, toCol];
            if (capturedSquare[0] === 0 && capturedSquare[1] === 0) { // a8
                castlingRights.black.queenside = false;
            } else if (capturedSquare[0] === 0 && capturedSquare[1] === 7) { // h8
                castlingRights.black.kingside = false;
            } else if (capturedSquare[0] === 7 && capturedSquare[1] === 0) { // a1
                castlingRights.white.queenside = false;
            } else if (capturedSquare[0] === 7 && capturedSquare[1] === 7) { // h1
                castlingRights.white.kingside = false;
            }
        }

        function isInCheck(color) {
            const kingPos = findKing(color);
            if (!kingPos) return false;

            const opponentColor = color === 'white' ? 'black' : 'white';
            const kingRow = kingPos.row;
            const kingCol = kingPos.col;

            // Check for pawn attacks
            const pawnDirection = color === 'white' ? -1 : 1;
            for (const colOffset of [-1, 1]) {
                const checkCol = kingCol + colOffset;
                const checkRow = kingRow + pawnDirection;
                if (checkRow >= 0 && checkRow < 8 && checkCol >= 0 && checkCol < 8) {
                    const piece = board[checkRow][checkCol];
                    if (piece === `${opponentColor}_pawn`) {
                        return true;
                    }
                }
            }

            // Check for knight attacks
            const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            for (const [rowOffset, colOffset] of knightMoves) {
                const checkRow = kingRow + rowOffset;
                const checkCol = kingCol + colOffset;
                if (checkRow >= 0 && checkRow < 8 && checkCol >= 0 && checkCol < 8) {
                    const piece = board[checkRow][checkCol];
                    if (piece === `${opponentColor}_knight`) {
                        return true;
                    }
                }
            }

            // Check for sliding pieces
            const directions = {
                straight: [[0, 1], [0, -1], [1, 0], [-1, 0]],
                diagonal: [[1, 1], [1, -1], [-1, 1], [-1, -1]]
            };

            for (const [directionType, dirs] of Object.entries(directions)) {
                for (const [rowDir, colDir] of dirs) {
                    let checkRow = kingRow + rowDir;
                    let checkCol = kingCol + colDir;
                    let distance = 1;
                    
                    while (checkRow >= 0 && checkRow < 8 && checkCol >= 0 && checkCol < 8) {
                        const piece = board[checkRow][checkCol];
                        if (piece) {
                            if (piece.startsWith(opponentColor)) {
                                if (directionType === 'straight' && (piece.endsWith('rook') || piece.endsWith('queen'))) {
                                    return true;
                                } else if (directionType === 'diagonal' && (piece.endsWith('bishop') || piece.endsWith('queen'))) {
                                    return true;
                                } else if (distance === 1 && piece.endsWith('king')) {
                                    return true;
                                }
                            }
                            break;
                        }
                        checkRow += rowDir;
                        checkCol += colDir;
                        distance++;
                    }
                }
            }

            return false;
        }

        function findKing(color) {
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (board[row][col] === `${color}_king`) {
                        return { row, col };
                    }
                }
            }
            return null;
        }

        function isCheckmate(color) {
            if (!isInCheck(color)) {
                return false;
            }

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = board[row][col];
                    if (piece && piece.startsWith(color)) {
                        for (let r = 0; r < 8; r++) {
                            for (let c = 0; c < 8; c++) {
                                if (isValidMove(row, col, r, c, piece)) {
                                    const originalPiece = board[r][c];
                                    board[r][c] = piece;
                                    board[row][col] = null;
                                    if (!isInCheck(color)) {
                                        board[row][col] = piece;
                                        board[r][c] = originalPiece;
                                        return false;
                                    }
                                    board[row][col] = piece;
                                    board[r][c] = originalPiece;
                                }
                            }
                        }
                    }
                }
            }

            return true;
        }

        function highlightKingInCheck() {
            const kingPos = findKing(currentTurn);
            if (kingPos) {
                const square = getSquareElement(kingPos.row, kingPos.col);
                square.classList.add('check');
            }
        }

        function formatMoveNotation(piece, fromRow, fromCol, toRow, toCol, isCapture) {
            const pieceSymbols = {
                king: 'K', queen: 'Q', rook: 'R',
                bishop: 'B', knight: 'N', pawn: ''
            };
            
            const pieceType = piece.split('_')[1];
            const pieceSymbol = pieceSymbols[pieceType];
            
            const fromSquare = `${String.fromCharCode(97 + fromCol)}${8 - fromRow}`;
            const toSquare = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
            
            const captureSymbol = isCapture ? "x" : "";
            
            if (pieceType === 'pawn') {
                if (isCapture) {
                    return `${String.fromCharCode(97 + fromCol)}${captureSymbol}${toSquare}`;
                } else {
                    return toSquare;
                }
            } else {
                return `${pieceSymbol}${captureSymbol}${toSquare}`;
            }
        }

        function addMoveToHistory(moveNotation, isCapture = false, isCheck = false, isCheckmate = false, isCastle = false) {
            const movesList = document.getElementById('movesList');
            const moveNumber = movesList.children.length + 1;
            
            let displayText;
            if (isCastle) {
                displayText = `${moveNumber}. ${moveNotation}`;
            } else {
                const captureSymbol = isCapture ? "x" : "";
                const checkSymbol = isCheckmate ? "#" : (isCheck ? "+" : "");
                displayText = `${moveNumber}. ${moveNotation}${captureSymbol}${checkSymbol}`;
            }
            
            const moveElement = document.createElement('div');
            moveElement.textContent = displayText;
            movesList.appendChild(moveElement);
            movesList.scrollTop = movesList.scrollHeight;
        }

        function clearMoveHistory() {
            document.getElementById('movesList').innerHTML = '';
        }

        function showCastlingDialog(kingRow, kingCol) {
            const color = currentTurn;
            const availableCastles = [];
            
            if (canCastle(color, 'kingside')) {
                availableCastles.push('kingside');
            }
            if (canCastle(color, 'queenside')) {
                availableCastles.push('queenside');
            }
            
            if (availableCastles.length === 0) {
                
                return;
            }
            
            // Show castling modal
            const modal = document.getElementById('castlingModal');
            const kingsideBtn = document.getElementById('kingsideCastle');
            const queensideBtn = document.getElementById('queensideCastle');
            
            kingsideBtn.style.display = availableCastles.includes('kingside') ? 'inline-block' : 'none';
            queensideBtn.style.display = availableCastles.includes('queenside') ? 'inline-block' : 'none';
            
            modal.style.display = 'block';
        }

        function selectCastle(side) {
            performCastle(currentTurn, side);
            closeCastlingModal();
        }

        function closeCastlingModal() {
            document.getElementById('castlingModal').style.display = 'none';
        }

        function showPromotionDialog(row, col) {
            document.getElementById('promotionModal').style.display = 'block';
            document.getElementById('promotionModal').dataset.row = row;
            document.getElementById('promotionModal').dataset.col = col;
        }

        function selectPromotion(pieceType) {
            const modal = document.getElementById('promotionModal');
            const row = parseInt(modal.dataset.row);
            const col = parseInt(modal.dataset.col);
            
            const currentPiece = board[row][col];
            const pieceColor = currentPiece.split('_')[0];
            
            board[row][col] = `${pieceColor}_${pieceType}`;
            drawPieces();
            
            modal.style.display = 'none';
        }
        

        function undoMove() {
            if (moveHistory.length === 0) {
                
                return;
            }
            
            const lastMove = moveHistory.pop();
            redoHistory.push(lastMove);
            
            if (lastMove.type === 'castle') {
                // Undo castle move
                const kingFrom = lastMove.kingFrom;
                const kingTo = lastMove.kingTo;
                const rookFrom = lastMove.rookFrom;
                const rookTo = lastMove.rookTo;
                
                // Move pieces back
                const kingPiece = board[kingTo.row][kingTo.col];
                const rookPiece = board[rookTo.row][rookTo.col];
                
                board[kingTo.row][kingTo.col] = null;
                board[rookTo.row][rookTo.col] = null;
                board[kingFrom.row][kingFrom.col] = kingPiece;
                board[rookFrom.row][rookFrom.col] = rookPiece;
                
                // Restore castling rights
                castlingRights = JSON.parse(JSON.stringify(lastMove.castlingRightsBefore));
            } else {
                // Undo normal move
                const fromRow = lastMove.from.row;
                const fromCol = lastMove.from.col;
                const toRow = lastMove.to.row;
                const toCol = lastMove.to.col;
                
                board[fromRow][fromCol] = lastMove.piece;
                board[toRow][toCol] = lastMove.captured;
                
                // Handle en passant undo
                if (lastMove.isEnPassant) {
                    const enPassantPos = lastMove.enPassantCapturedPos;
                    const enPassantPiece = lastMove.enPassantCapturedPiece;
                    board[enPassantPos.row][enPassantPos.col] = enPassantPiece;
                    
                    // Remove en passant captured piece from collection
                    if (enPassantPiece) {
                        const index = capturedPieces[lastMove.turn].indexOf(enPassantPiece);
                        if (index > -1) {
                            capturedPieces[lastMove.turn].splice(index, 1);
                        }
                    }
                }
                
                // Restore castling rights
                castlingRights = JSON.parse(JSON.stringify(lastMove.castlingRightsBefore));
                
                // Restore en passant target
                enPassantTarget = lastMove.enPassantTargetBefore;
                
                // Remove captured piece from collection
                if (lastMove.captured) {
                    const index = capturedPieces[lastMove.turn].indexOf(lastMove.captured);
                    if (index > -1) {
                        capturedPieces[lastMove.turn].splice(index, 1);
                    }
                }
            }
            
            // Restore turn
            currentTurn = lastMove.turn;
            updateTurnDisplay();
            updateCastlingDisplay();
            
            clearHighlights();
            drawPieces();
            
            // Remove last move from history display
            const movesList = document.getElementById('movesList');
            if (movesList.lastChild) {
                movesList.removeChild(movesList.lastChild);
            }
            
            updateStatus("Move undone");
        }

        function redoMove() {
            if (redoHistory.length === 0) {
                
                return;
            }
            
            const moveToRedo = redoHistory.pop();
            
            if (moveToRedo.type === 'castle') {
                // Redo castling
                const kingFrom = moveToRedo.kingFrom;
                const kingTo = moveToRedo.kingTo;
                const rookFrom = moveToRedo.rookFrom;
                const rookTo = moveToRedo.rookTo;
                
                // Move pieces
                const kingPiece = board[kingFrom.row][kingFrom.col];
                const rookPiece = board[rookFrom.row][rookFrom.col];
                
                board[kingFrom.row][kingFrom.col] = null;
                board[rookFrom.row][rookFrom.col] = null;
                board[kingTo.row][kingTo.col] = kingPiece;
                board[rookTo.row][rookTo.col] = rookPiece;
                
                // Update castling rights
                const color = moveToRedo.color;
                castlingRights[color].kingside = false;
                castlingRights[color].queenside = false;
                
                // Add castle notation to history
                const castleNotation = moveToRedo.side === 'kingside' ? "O-O" : "O-O-O";
                addMoveToHistory(castleNotation, false, false, false, true);
            } else {
                // Redo normal move
                const fromRow = moveToRedo.from.row;
                const fromCol = moveToRedo.from.col;
                const toRow = moveToRedo.to.row;
                const toCol = moveToRedo.to.col;
                const piece = moveToRedo.piece;
                const capturedPiece = moveToRedo.captured;
                
                // Make the move
                board[fromRow][fromCol] = null;
                board[toRow][toCol] = piece;
                
                // Handle en passant capture during redo
                if (moveToRedo.isEnPassant) {
                    const enPassantPos = moveToRedo.enPassantCapturedPos;
                    // Remove the captured pawn (that was restored during undo)
                    board[enPassantPos.row][enPassantPos.col] = null;
                    // Add the captured piece to the captured pieces list
                    if (moveToRedo.enPassantCapturedPiece) {
                        capturedPieces[moveToRedo.turn].push(moveToRedo.enPassantCapturedPiece);
                    }
                }
                
                // Update castling rights based on the move
                updateCastlingRightsAfterMove(piece, fromRow, fromCol, toRow, toCol);
                
                // Set en passant target if this was a pawn double move
                if (piece.endsWith('pawn') && Math.abs(fromRow - toRow) === 2) {
                    const enPassantRow = (fromRow + toRow) / 2;
                    enPassantTarget = { row: enPassantRow, col: toCol };
                } else {
                    enPassantTarget = null;
                }
                
                // Handle regular captured pieces
                if (capturedPiece) {
                    capturedPieces[moveToRedo.turn].push(capturedPiece);
                }
                
                // Check for pawn promotion (simplified - assumes queen promotion)
                if (piece.endsWith('pawn') && (toRow === 0 || toRow === 7)) {
                    const pieceColor = piece.split('_')[0];
                    board[toRow][toCol] = `${pieceColor}_queen`;
                }
                
                // Add move to history display
                const isCapture = capturedPiece !== null || moveToRedo.isEnPassant;
                const moveNotation = formatMoveNotation(piece, fromRow, fromCol, toRow, toCol, isCapture);
                
                let finalNotation = moveNotation;
                if (moveToRedo.isEnPassant) {
                    finalNotation += " e.p.";
                }
                
                // Check if this puts opponent in check/checkmate after switching turns
                const nextTurn = moveToRedo.turn === 'white' ? 'black' : 'white';
                const tempTurn = currentTurn;
                currentTurn = nextTurn;
                const isCheck = isInCheck(currentTurn);
                const isCheckmateVal = isCheckmate(currentTurn);
                currentTurn = tempTurn;
                
                addMoveToHistory(finalNotation, isCapture, isCheck, isCheckmateVal);
            }
            
            // Add move back to move history
            moveHistory.push(moveToRedo);
            
            // Switch turns
            currentTurn = currentTurn === 'white' ? 'black' : 'white';
            updateTurnDisplay();
            updateCastlingDisplay();
            
            clearHighlights();
            drawPieces();
            
            // Check for check after redo
            if (isInCheck(currentTurn)) {
                if (isCheckmate(currentTurn)) {
                    const winner = currentTurn === 'white' ? 'Black' : 'White';
                    showVictoryModal(winner);
                } else {
                    highlightKingInCheck();
                }
            }
            
            updateStatus("Move redone");
        }

        function newGame() {
            // Reset game state
            board = Array(8).fill(null).map(() => Array(8).fill(null));
            selectedPiece = null;
            currentTurn = 'white';
            moveHistory = [];
            redoHistory = [];
            enPassantTarget = null;
            capturedPieces = { white: [], black: [] };
            
            // Reset castling rights
            castlingRights = {
                white: { kingside: true, queenside: true },
                black: { kingside: true, queenside: true }
            };
            
            setupPieces();
            updateTurnDisplay();
            updateCastlingDisplay();
            clearHighlights();
            clearMoveHistory();
            updateStatus("New game started!");
        }

        // Helper functions
        function getSquareElement(row, col) {
            const squares = document.querySelectorAll('.square');
            return squares[row * 8 + col];
        }

        function highlightSquare(row, col, className) {
            const square = getSquareElement(row, col);
            square.classList.add(className);
        }

        function clearHighlights() {
            const squares = document.querySelectorAll('.square');
            squares.forEach(square => {
                square.classList.remove('selected', 'valid-move', 'capture', 'castle', 'en-passant', 'check');
            });
        }

        function updateTurnDisplay() {
            const turnIndicator = document.getElementById('turnIndicator');
            turnIndicator.textContent = `${currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)}'s Turn`;
            turnIndicator.className = `turn-indicator ${currentTurn}`;
        }

        function updateCastlingDisplay() {
            const rights = [];
            if (castlingRights.white.kingside) rights.push('K');
            if (castlingRights.white.queenside) rights.push('Q');
            if (castlingRights.black.kingside) rights.push('k');
            if (castlingRights.black.queenside) rights.push('q');
            
            const rightsText = rights.length > 0 ? `Castling: ${rights.join(' ')}` : "Castling: None";
            document.getElementById('castlingInfo').textContent = rightsText;
        }

        function updateStatus(message) {
            document.getElementById('statusBar').textContent = message;
        }

        function showMessage(title, message) {
            alert(`${title}: ${message}`);
        }
        // flip boardss
        function toggleFlipMode() {
            isAutoFlip = !isAutoFlip;
            const flipBtn = document.getElementById('flipBoardBtn');
            const flipText = document.getElementById('flipBoardText');
            
            if (isAutoFlip) {
                flipBtn.className = 'flip-board-btn auto-mode';
                flipText.textContent = 'Auto Flip: ON';
                // Auto flip based on current turn
                flipBoard(currentTurn === 'black');
            } else {
                flipBtn.className = 'flip-board-btn manual-mode';
                flipText.textContent = 'Manual Flip';
                // Allow manual flipping
                flipBoard(!isBoardFlipped);
            }
        }
        function flipBoard(shouldFlip) {
            const chessboard = document.getElementById('chessboard');
            const flipBtn = document.getElementById('flipBoardBtn');
            
            if (shouldFlip !== isBoardFlipped) {
                isBoardFlipped = shouldFlip;
                
                // Add flip animation class
                flipBtn.classList.add('flipping');
                setTimeout(() => flipBtn.classList.remove('flipping'), 600);
                
                // Apply flip transformation
                if (isBoardFlipped) {
                    chessboard.style.transform = 'rotate(180deg)';
                    // Counter-rotate pieces to keep them upright
                    document.querySelectorAll('.piece').forEach(piece => {
                        piece.style.transform = 'rotate(180deg)';
                    });
                    // Counter-rotate coordinates
                    document.querySelectorAll('.coordinates').forEach(coord => {
                        coord.style.transform = 'rotate(180deg)';
                    });
                } else {
                    chessboard.style.transform = 'none';
                    document.querySelectorAll('.piece').forEach(piece => {
                        piece.style.transform = 'none';
                    });
                    document.querySelectorAll('.coordinates').forEach(coord => {
                        coord.style.transform = 'none';
                    });
                }
            }
        }
        // turn table function
        function updateTurnDisplay() {
            const turnIndicator = document.getElementById('turnIndicator');
            turnIndicator.textContent = `${currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)}'s Turn`;
            turnIndicator.className = `turn-indicator ${currentTurn}`;
            
            // Auto flip if enabled
            if (isAutoFlip) {
                flipBoard(currentTurn === 'black');
            }
        }
        // Also update the drawPieces function to apply rotation to new pieces
        function drawPieces() {
            const squares = document.querySelectorAll('.square');
            squares.forEach(square => {
                const row = parseInt(square.dataset.row);
                const col = parseInt(square.dataset.col);
                const piece = board[row][col];
                
                // Remove existing piece
                const existingPiece = square.querySelector('.piece');
                if (existingPiece) {
                    existingPiece.remove();
                }
                
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.split('_')[0]}`;
                    pieceElement.textContent = pieceSymbols[piece];
                    
                    // Apply rotation if board is flipped
                    if (isBoardFlipped) {
                        pieceElement.style.transform = 'rotate(180deg)';
                    }
                    
                    square.appendChild(pieceElement);
                }
            });
        }
        function showVictoryModal(winner) {
            const modal = document.getElementById('victoryModal');
            const message = document.getElementById('victoryMessage');
            const moveCountEl = document.getElementById('moveCount');
            
            // Set victory message
            message.textContent = `${winner} wins by checkmate!`;
            
            // Set move count
            moveCountEl.textContent = Math.ceil(moveHistory.length / 2);
            
            // Show modal
            modal.style.display = 'block';
        }
        
        function closeVictoryModal() {
            document.getElementById('victoryModal').style.display = 'none';
        }
        

        
        

        // Initialize game when page loads
        window.addEventListener('load', initGame);
    