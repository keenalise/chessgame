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
        // When true the board is shown in a read-only (non-interactive) state
        let isReadOnlyMode = false;
        let pendingPromotion = null;
        let pendingPromotionMove = null;
        let halfmoveClock = 0; // Counts half-moves since last pawn move or capture
        let positionHistory = []; // Stores position hashes for repetition detection
        // variables for move right left
        let currentMoveIndex = -1; // -1 means we're at the current live position
        let gameStateHistory = []; // Store complete game states
        
        
        
       
       
        


        
        
        
        
          

       

        // Helper to convert board matrix into FEN notation
        function boardToFEN(b, turn) {
            let fen = "";
            for (let row = 0; row < 8; row++) {
                let emptyCount = 0;
                for (let col = 0; col < 8; col++) {
                    const piece = b[row][col];
                    if (!piece) {
                        emptyCount++;
                    } else {
                        if (emptyCount > 0) {
                            fen += emptyCount;
                            emptyCount = 0;
                        }
                        fen += pieceToFEN(piece);
                    }
                }
                if (emptyCount > 0) fen += emptyCount;
                if (row < 7) fen += "/";
            }
            fen += ` ${turn[0]} - - 0 1`; // basic placeholders
            return fen;
        }
        // Convert internal piece name to FEN character
        function pieceToFEN(piece) {
            const mapping = {
                white_pawn: "P", white_rook: "R", white_knight: "N", white_bishop: "B",
                white_queen: "Q", white_king: "K",
                black_pawn: "p", black_rook: "r", black_knight: "n", black_bishop: "b",
                black_queen: "q", black_king: "k"
            };
            return mapping[piece] || "?";
        }

        // Add a button to download review results
        function createDownloadButton() {
            const container = document.querySelector(".victory-buttons");
            let btn = document.getElementById("downloadReviewBtn");
            if (btn) return; // avoid duplicates
        
            btn = document.createElement("button");
            btn.id = "downloadReviewBtn";
            btn.className = "victory-btn victory-btn-secondary";
            btn.textContent = "Download Review";
            btn.onclick = downloadReviewFile;
            container.appendChild(btn);
        }
        
        // Download review as text file
        function downloadReviewFile() {
            let content = "KeenChess Game Review\n\n";
            gameReviewData.forEach(r => {
                content += `Move ${r.move}: Eval = ${r.evaluation}\nFEN: ${r.fen}\n\n`;
            });
        
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "game_review.txt";
            a.click();
            URL.revokeObjectURL(url);
        }
        






        

        // Update status display
        function updateStatus(msg) {
            const statusBar = document.getElementById("statusBar");
            if (statusBar) statusBar.textContent = msg;
        }

        // Initialize game + Stockfish on page load
        window.addEventListener("load", () => {
                    initGame();
                    // Render blank preview board squares (no pieces) and wire sidebar buttons
                    buildBlankPreview();
                    wireSidebarButtons();
                    // If redirected from static interface with a requested puzzle, open it
                    try {
                        const requested = localStorage.getItem('open_puzzle');
                        if (requested) {
                            // consume the flag
                            localStorage.removeItem('open_puzzle');
                            if (requested === 'eight') {
                                // small delay to ensure UI initialized
                                setTimeout(() => {
                                    try { showEightQueensPuzzle(); } catch (e) { console.warn('showEightQueensPuzzle not available', e); }
                                }, 80);
                            } else if (requested === 'knight') {
                                setTimeout(() => {
                                    try {
                                        if (typeof showKnightTour === 'function') showKnightTour();
                                        else alert('Knight Tour not implemented yet.');
                                    } catch (e) { console.warn('showKnightTour error', e); }
                                }, 80);
                            }
                        }
                    } catch (e) { console.warn('open_puzzle check failed', e); }
            
        });

        function buildBlankPreview() {
            const preview = document.getElementById('blankBoardPreview');
            if (!preview) return;
            preview.innerHTML = '';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const sq = document.createElement('div');
                    sq.className = 'preview-square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
                    preview.appendChild(sq);
                }
            }
        }

        function wireSidebarButtons() {
            const playBtn = document.getElementById('playBtn');
            const puzzlesBtn = document.getElementById('puzzlesBtn');
            const puzzlesList = document.getElementById('puzzlesList');
            const puzzles8Btn = document.getElementById('puzzles8Btn');

            if (playBtn) playBtn.addEventListener('click', () => {
                openGameBoard();
            });

            if (puzzlesBtn && puzzlesList) puzzlesBtn.addEventListener('click', () => {
                puzzlesList.classList.toggle('hidden');
            });

            if (puzzles8Btn) puzzles8Btn.addEventListener('click', () => {
                // open the 8-queens modal
                showEightQueensPuzzle();
            });
        }

        function openGameBoard() {
            // Hide preview and show main board container, then start new game
            const preview = document.getElementById('blankBoardPreview');
            const mainContainer = document.getElementById('mainBoardContainer');
            if (preview) preview.style.display = 'none';
            if (mainContainer) mainContainer.style.display = 'block';
            // Reset to a blank board or start a fresh game depending on UX choice
            // We'll start a fresh game position
            try { newGame(); } catch (e) { console.warn('newGame failed', e); }
        }

        // Show only the chess board in a read-only (non-interactive) view.
        // Call this when the user successfully logs in to present a view-only board.
        function showBoardReadOnly() {
            isReadOnlyMode = true;
            openGameBoard();

            const preview = document.getElementById('blankBoardPreview');
            const side = document.querySelector('.side-panel');
            const info = document.querySelector('.info-panel');
            const moves = document.querySelector('.move-history');
            const status = document.getElementById('statusBar');
            const stockfish = document.getElementById('stockfishStatus');
            const flip = document.querySelector('.flip-board-container');

            if (preview) preview.style.display = 'none';
            if (side) side.style.display = 'none';
            if (info) info.style.display = 'none';
            if (moves) moves.style.display = 'none';
            if (status) status.style.display = 'none';
            if (stockfish) stockfish.style.display = 'none';
            if (flip) flip.style.display = 'none';

            const chessboard = document.getElementById('chessboard');
            if (chessboard) {
                chessboard.classList.add('readonly');
                chessboard.style.pointerEvents = 'none';
            }

            const container = document.querySelector('.container');
            if (container) container.classList.add('readonly-mode');

            // Show exit button in topbar (if present)
            const exitBtn = document.getElementById('exitReadOnlyBtn');
            if (exitBtn) exitBtn.style.display = 'inline-block';
        }

        // Expose helper for login flow to call
        window.showBoardReadOnly = showBoardReadOnly;
        window.onUserLoggedIn = showBoardReadOnly;

        // Exit the read-only view and restore interactive UI
        function exitReadOnly() {
            isReadOnlyMode = false;
            const preview = document.getElementById('blankBoardPreview');
            const side = document.querySelector('.side-panel');
            const info = document.querySelector('.info-panel');
            const moves = document.querySelector('.move-history');
            const status = document.getElementById('statusBar');
            const stockfish = document.getElementById('stockfishStatus');
            const flip = document.querySelector('.flip-board-container');

            if (preview) preview.style.display = 'none';
            if (side) side.style.display = '';
            if (info) info.style.display = '';
            if (moves) moves.style.display = '';
            if (status) status.style.display = '';
            if (stockfish) stockfish.style.display = '';
            if (flip) flip.style.display = '';

            const chessboard = document.getElementById('chessboard');
            if (chessboard) {
                chessboard.classList.remove('readonly');
                chessboard.style.pointerEvents = 'auto';
            }

            const container = document.querySelector('.container');
            if (container) container.classList.remove('readonly-mode');

            const exitBtn = document.getElementById('exitReadOnlyBtn');
            if (exitBtn) exitBtn.style.display = 'none';

            updateStatus('Interactive view restored');
        }

        window.exitReadOnly = exitReadOnly;




        
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
        // function initGame() {
        //     setupBoard();
        //     setupPieces();
        //     updateCastlingDisplay();
        //     updateTurnDisplay();
            
        //     // Initialize navigation
        //     gameStateHistory = [];
        //     currentMoveIndex = -1;
        //     saveGameState();
        //     currentMoveIndex = 0; // Start at the first position
        //     updateNavigationButtons();
        // }

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
            if (isReadOnlyMode) {
                updateStatus('Read-only view — interactions disabled');
                return;
            }

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
            if (isReadOnlyMode) return;

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

        //  movePiece function 

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
                    enPassantCapturedPos,
                    halfmoveClockBefore: halfmoveClock, 
                    positionHistoryLengthBefore: positionHistory.length // 3 fold repitition 
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
                        // Store the move data for after promotion
                        pendingPromotionMove = {
                            piece,
                            startRow,
                            startCol,
                            row,
                            col,
                            isCapture: capturedPiece !== null || isEnPassant,
                            isEnPassant
                        };
                        
                        showPromotionDialog(row, col);
                        // Don't switch turns, add move notation, or check game state yet - wait for promotion
                    } else {
                        // Complete the move for non-promotion moves
                        completeMoveAfterPromotion(piece, startRow, startCol, row, col, capturedPiece !== null || isEnPassant, isEnPassant);
                    }
                }
            }
            
            // Clear selection
            selectedPiece = null;
            clearHighlights();
            drawPieces();
        }
        
        // function to complete move processing
        function completeMoveAfterPromotion(piece, startRow, startCol, endRow, endCol, isCapture, isEnPassant) {
            // Update halfmove clock BEFORE switching turns
            if (piece.endsWith('pawn') || isCapture || isEnPassant) {
                console.log("Resetting halfmove clock - pawn move or capture");
                halfmoveClock = 0;
                // Clear position history on irreversible moves (pawn moves or captures)
                positionHistory = [];
            } else {
                halfmoveClock++;
                console.log(`Halfmove clock incremented to: ${halfmoveClock}`);
            }
            
            // Switch turns
            currentTurn = currentTurn === 'white' ? 'black' : 'white';
            saveGameState();
            currentMoveIndex = gameStateHistory.length - 1; 
            updateTurnDisplay();
            updateCastlingDisplay();
            
            // Add current position to history AFTER the move is complete
            const currentPositionHash = generatePositionHash();
            positionHistory.push(currentPositionHash);
            console.log(`Added position to history. Total positions: ${positionHistory.length}`);
            
            // Save game state for navigation
            saveGameState();
            // Reset to live position when new move is made
            currentMoveIndex = -1;
            
            // Add move to history display
            const moveNotation = formatMoveNotation(piece, startRow, startCol, endRow, endCol, isCapture);
            const finalNotation = moveNotation + (isEnPassant ? " e.p." : "");
            
            const isCheck = isInCheck(currentTurn);
            const isCheckmateVal = isCheckmate(currentTurn);
            
            addMoveToHistory(finalNotation, isCapture, isCheck, isCheckmateVal);
            
            // Check game end conditions
            checkGameEndConditions();
            
            const displayMove = `${String.fromCharCode(97 + startCol)}${8-startRow} → ${String.fromCharCode(97 + endCol)}${8-endRow}`;
            updateStatus(`Last move: ${displayMove}${isEnPassant ? " (en passant)" : ""} - Halfmoves: ${halfmoveClock}`);
        }

        // game end conditions
        function checkGameEndConditions() {
            const isInCheckNow = isInCheck(currentTurn);
            const isCheckmateNow = isInCheckNow && isCheckmate(currentTurn);
            const isStalemateNow = !isInCheckNow && isStalemate(currentTurn);
            
            console.log(`Game state check - Check: ${isInCheckNow}, Checkmate: ${isCheckmateNow}, Stalemate: ${isStalemateNow}`);
            
            // Check for checkmate first (highest priority)
            if (isCheckmateNow) {
                const winner = currentTurn === 'white' ? 'Black' : 'White';
                console.log(`Checkmate detected! ${winner} wins`);
                // Pass the last move (the move that delivered mate) to the modal
                const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;
                showVictoryModal(winner, lastMove);
                return; // Exit early - game is over
            }
            
            // Check for stalemate
            if (isStalemateNow) {
                console.log(`Stalemate detected! Game is a draw`);
                showDrawModal('stalemate');
                return; // Exit early - game is over
            }
            
            // Only check draw conditions if the game hasn't ended by checkmate or stalemate
            const isFiftyMoveRuleNow = isFiftyMoveRule();
            const isThreefoldRepetitionNow = isThreefoldRepetition();
            
            if (isFiftyMoveRuleNow) {
                console.log(`50-move rule triggered! Game is a draw`);
                showDrawModal('fifty-move');
            } else if (isThreefoldRepetitionNow) {
                console.log(`Threefold repetition! Game is a draw`);
                showDrawModal('threefold');
            } else if (isInCheckNow) {
                console.log(`${currentTurn} king is in check`);
                highlightKingInCheck();
            }
        }
        

        // selectPromotion function 
        function selectPromotion(pieceType) {
            const modal = document.getElementById('promotionModal');
            const row = parseInt(modal.dataset.row);
            const col = parseInt(modal.dataset.col);

            const currentPiece = board[row][col];
            const pieceColor = currentPiece.split('_')[0];

            // Promote the pawn on the board
            const promotedPiece = `${pieceColor}_${pieceType}`;
            board[row][col] = promotedPiece;
            drawPieces();

            // Hide the modal
            modal.style.display = 'none';

            // If we have a pending promotion move, complete it now (switch turn, history, checkmate detection, etc.)
            if (pendingPromotionMove) {
                const { startRow, startCol, row: endRow, col: endCol, isCapture, isEnPassant } = pendingPromotionMove;
                completeMoveAfterPromotion(promotedPiece, startRow, startCol, endRow, endCol, isCapture, isEnPassant);
                pendingPromotionMove = null;
            }
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
        // function to check for 50-move rule
        function isFiftyMoveRule() {
            return halfmoveClock >= 100; // 100 half-moves = 50 full moves
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
    
        //function to perform castle    
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
                castlingRightsBefore: JSON.parse(JSON.stringify(castlingRights)),
                halfmoveClockBefore: halfmoveClock,
                positionHistoryLengthBefore: positionHistory.length
            };
            
            // Update halfmove clock (castling is not a pawn move or capture)
            halfmoveClock++;
            
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
            // Save game state for navigation
            saveGameState();
            // Stay at live position
            currentMoveIndex = gameStateHistory.length - 1;
            updateTurnDisplay();
            updateCastlingDisplay();
            
            // Add current position to history AFTER the move is complete
            const currentPositionHash = generatePositionHash();
            positionHistory.push(currentPositionHash);
            console.log(`Added position to history after castling. Total positions: ${positionHistory.length}`);
            
            // Save game state for navigation
            saveGameState();
            // Reset to live position when new move is made
            currentMoveIndex = -1;
            
            // Clear selection and redraw
            selectedPiece = null;
            clearHighlights();
            drawPieces();
            
            const castleNotation = side === 'kingside' ? "O-O" : "O-O-O";
            addMoveToHistory(castleNotation, false, false, false, true);
            updateStatus(`Castled ${side}: ${castleNotation}`);
            
            // Check game end conditions (including threefold repetition)
            checkGameEndConditions();
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
            // First check if the king is actually in check
            if (!isInCheck(color)) {
                return false;
            }
        
            // Try all possible moves for all pieces of this color
            for (let fromRow = 0; fromRow < 8; fromRow++) {
                for (let fromCol = 0; fromCol < 8; fromCol++) {
                    const piece = board[fromRow][fromCol];
                    if (piece && piece.startsWith(color)) {
                        // Try all possible destination squares
                        for (let toRow = 0; toRow < 8; toRow++) {
                            for (let toCol = 0; toCol < 8; toCol++) {
                                if (isValidMove(fromRow, fromCol, toRow, toCol, piece)) {
                                    // Make temporary move
                                    const capturedPiece = board[toRow][toCol];
                                    const movingPiece = board[fromRow][fromCol];
                                    
                                    // Handle en passant capture temporarily
                                    let tempEnPassantCapture = null;
                                    let tempEnPassantPos = null;
                                    if (piece.endsWith('pawn') && enPassantTarget && 
                                        toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
                                        const capturedPawnRow = toRow + (piece.startsWith('white') ? 1 : -1);
                                        tempEnPassantCapture = board[capturedPawnRow][toCol];
                                        tempEnPassantPos = { row: capturedPawnRow, col: toCol };
                                        board[capturedPawnRow][toCol] = null;
                                    }
                                    
                                    // Execute the move
                                    board[fromRow][fromCol] = null;
                                    board[toRow][toCol] = movingPiece;
                                    
                                    // Check if king is still in check after this move
                                    const stillInCheck = isInCheck(color);
                                    
                                    // Restore the board
                                    board[fromRow][fromCol] = movingPiece;
                                    board[toRow][toCol] = capturedPiece;
                                    if (tempEnPassantCapture) {
                                        board[tempEnPassantPos.row][tempEnPassantPos.col] = tempEnPassantCapture;
                                    }
                                    
                                    // If this move gets the king out of check, it's not checkmate
                                    if (!stillInCheck) {
                                        return false;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // No legal moves found that get the king out of check
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


        
        // undo function
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
                
                // Restore halfmove clock
                halfmoveClock = lastMove.halfmoveClockBefore || 0;
                
                // Restore position history
                if (lastMove.positionHistoryLengthBefore !== undefined) {
                    positionHistory = positionHistory.slice(0, lastMove.positionHistoryLengthBefore);
                }
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
                
                // Restore halfmove clock
                halfmoveClock = lastMove.halfmoveClockBefore || 0;
                
                // Restore position history
                if (lastMove.positionHistoryLengthBefore !== undefined) {
                    positionHistory = positionHistory.slice(0, lastMove.positionHistoryLengthBefore);
                }
                
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
                    const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;
                    showVictoryModal(winner, lastMove);
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
            halfmoveClock = 0;
            positionHistory = [];
            
            // Reset navigation
            gameStateHistory = [];
            currentMoveIndex = -1;
            
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
        
            // Add initial position to history
            const initialPosition = generatePositionHash();
            positionHistory.push(initialPosition);
            
            // Initialize navigation
            saveGameState();
            currentMoveIndex = 0;
            
            // Re-enable board interaction
            const chessboard = document.getElementById('chessboard');
            chessboard.style.pointerEvents = 'auto';
            chessboard.style.opacity = '1';
            
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

        //stalemate function 
        function isStalemate(color) {
            // If the king is in check, it's not stalemate
            if (isInCheck(color)) {
                return false;
            }
            
            // Check if there are any legal moves available
            for (let fromRow = 0; fromRow < 8; fromRow++) {
                for (let fromCol = 0; fromCol < 8; fromCol++) {
                    const piece = board[fromRow][fromCol];
                    if (piece && piece.startsWith(color)) {
                        // Try all possible destination squares
                        for (let toRow = 0; toRow < 8; toRow++) {
                            for (let toCol = 0; toCol < 8; toCol++) {
                                if (isValidMove(fromRow, fromCol, toRow, toCol, piece)) {
                                    // Make temporary move
                                    const capturedPiece = board[toRow][toCol];
                                    const movingPiece = board[fromRow][fromCol];
                                    
                                    // Handle en passant capture temporarily
                                    let tempEnPassantCapture = null;
                                    let tempEnPassantPos = null;
                                    if (piece.endsWith('pawn') && enPassantTarget && 
                                        toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
                                        const capturedPawnRow = toRow + (piece.startsWith('white') ? 1 : -1);
                                        tempEnPassantCapture = board[capturedPawnRow][toCol];
                                        tempEnPassantPos = { row: capturedPawnRow, col: toCol };
                                        board[capturedPawnRow][toCol] = null;
                                    }
                                    
                                    // Execute the move
                                    board[fromRow][fromCol] = null;
                                    board[toRow][toCol] = movingPiece;
                                    
                                    // Check if king would be in check after this move
                                    const wouldBeInCheck = isInCheck(color);
                                    
                                    // Restore the board
                                    board[fromRow][fromCol] = movingPiece;
                                    board[toRow][toCol] = capturedPiece;
                                    if (tempEnPassantCapture) {
                                        board[tempEnPassantPos.row][tempEnPassantPos.col] = tempEnPassantCapture;
                                    }
                                    
                                    // If this move doesn't put king in check, there's a legal move
                                    if (!wouldBeInCheck) {
                                        return false;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // No legal moves found and king is not in check = stalemate
            return true;
        }
        //function to check 50-move rule
        function isFiftyMoveRule() {
            const result = halfmoveClock >= 100;
            console.log(`Checking 50-move rule: halfmoveClock=${halfmoveClock}, result=${result}`);
            return result;
        }


        

        function showMessage(title, message) {
            alert(`${title}: ${message}`);
        }
        
        // 8 Queens Puzzle implementation
        let eightQueensInitialized = false;
        let eightBoard = null; // 8x8 array of 0/1
        let eightSolutions = [];
        let eightCurrentSolutionIndex = 0;
        let eightShowingSolution = false;

        function showEightQueensPuzzle() {
            const modal = document.getElementById('eightQueensModal');
            if (!eightQueensInitialized) initEightQueensPuzzle();
            modal.style.display = 'block';
        }

        function initEightQueensPuzzle() {
            eightQueensInitialized = true;
            eightBoard = Array(8).fill(null).map(() => Array(8).fill(0));
            eightSolutions = solveAllEightQueens();
            eightCurrentSolutionIndex = 0;

            const boardEl = document.getElementById('eightQueensBoard');
            boardEl.innerHTML = '';

            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const sq = document.createElement('div');
                    sq.className = `eq-square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                    sq.dataset.row = r;
                    sq.dataset.col = c;
                    sq.addEventListener('click', (e) => {
                        toggleQueen(r, c);
                    });
                    boardEl.appendChild(sq);
                }
            }

            document.getElementById('eightQueensSolutionsCount').textContent = eightSolutions.length;
            document.getElementById('eightQueensCurrent').textContent = eightSolutions.length > 0 ? '0' : '-';

            // wire buttons
            document.getElementById('eqSolveBtn').onclick = () => {
                if (eightSolutions.length === 0) {
                    alert('No solutions found');
                    return;
                }
                eightCurrentSolutionIndex = 0;
                showEightSolution(eightCurrentSolutionIndex);
            };
            document.getElementById('eqPrevBtn').onclick = () => {
                if (eightSolutions.length === 0) return;
                eightCurrentSolutionIndex = (eightCurrentSolutionIndex - 1 + eightSolutions.length) % eightSolutions.length;
                showEightSolution(eightCurrentSolutionIndex);
            };
            document.getElementById('eqNextBtn').onclick = () => {
                if (eightSolutions.length === 0) return;
                eightCurrentSolutionIndex = (eightCurrentSolutionIndex + 1) % eightSolutions.length;
                showEightSolution(eightCurrentSolutionIndex);
            };
            document.getElementById('eqClearBtn').onclick = () => {
                eightShowingSolution = false;
                clearEightBoard();
            };
            document.getElementById('eqCloseBtn').onclick = () => {
                closeEightQueensModal();
            };

            renderEightBoard();
        }

        function toggleQueen(r, c) {
            // If currently showing a solution, switch to manual mode
            eightShowingSolution = false;

            const currentlyPlaced = countQueens();
            const isPlacing = eightBoard[r][c] === 0; // true if we will place

            // Prevent placing more than 8 queens
            if (isPlacing && currentlyPlaced >= 8) {
                alert('You cannot place more than 8 queens.');
                return;
            }

            // toggle
            eightBoard[r][c] = eightBoard[r][c] ? 0 : 1;
            renderEightBoard();
        }

        function countQueens() {
            let n = 0;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (eightBoard[r][c]) n++;
                }
            }
            return n;
        }

        function clearEightBoard() {
            eightBoard = Array(8).fill(null).map(() => Array(8).fill(0));
            renderEightBoard();
        }

        function closeEightQueensModal() {
            document.getElementById('eightQueensModal').style.display = 'none';
        }

        function renderEightBoard() {
            const boardEl = document.getElementById('eightQueensBoard');
            const squares = boardEl.querySelectorAll('.eq-square');
            for (const sq of squares) {
                const r = parseInt(sq.dataset.row, 10);
                const c = parseInt(sq.dataset.col, 10);
                sq.classList.remove('conflict', 'same-row', 'same-col', 'same-diag');
                sq.innerHTML = '';
                if (eightBoard[r][c]) {
                    const q = document.createElement('div');
                    q.className = 'queen';
                    q.textContent = '♛';
                    sq.appendChild(q);
                }
            }

            // mark conflicts/attacks
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (eightBoard[r][c]) {
                        markAttacks(r, c);
                    }
                }
            }

            // Update placed / solution display
            const placed = countQueens();
            const currentEl = document.getElementById('eightQueensCurrent');
            if (currentEl) {
                if (eightShowingSolution) {
                    // leave as-is (showEightSolution sets text)
                } else {
                    currentEl.textContent = `${placed}/8`;
                }
            }
        }

        function markAttacks(r, c) {
            const boardEl = document.getElementById('eightQueensBoard');
            // same row
            for (let col = 0; col < 8; col++) {
                if (col === c) continue;
                if (eightBoard[r][col]) {
                    getEqSquare(r, col).classList.add('conflict');
                    getEqSquare(r, col).classList.add('same-row');
                    getEqSquare(r, c).classList.add('conflict');
                }
            }
            // same col
            for (let row = 0; row < 8; row++) {
                if (row === r) continue;
                if (eightBoard[row][c]) {
                    getEqSquare(row, c).classList.add('conflict');
                    getEqSquare(row, c).classList.add('same-col');
                    getEqSquare(r, c).classList.add('conflict');
                }
            }
            // diagonals
            for (let dr = -8; dr <= 8; dr++) {
                if (dr === 0) continue;
                const rr = r + dr;
                const cc = c + dr;
                if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
                    if (eightBoard[rr][cc]) {
                        getEqSquare(rr, cc).classList.add('conflict');
                        getEqSquare(rr, cc).classList.add('same-diag');
                        getEqSquare(r, c).classList.add('conflict');
                    }
                }
                const cc2 = c - dr;
                if (rr >= 0 && rr < 8 && cc2 >= 0 && cc2 < 8) {
                    if (eightBoard[rr][cc2]) {
                        getEqSquare(rr, cc2).classList.add('conflict');
                        getEqSquare(rr, cc2).classList.add('same-diag');
                        getEqSquare(r, c).classList.add('conflict');
                    }
                }
            }
        }

        function getEqSquare(r, c) {
            const boardEl = document.getElementById('eightQueensBoard');
            return boardEl.children[r * 8 + c];
        }

        function showEightSolution(index) {
            const sol = eightSolutions[index]; // sol is array of cols per row
            if (!sol) return;
            eightBoard = Array(8).fill(null).map(() => Array(8).fill(0));
            for (let row = 0; row < 8; row++) {
                eightBoard[row][sol[row]] = 1;
            }
            document.getElementById('eightQueensCurrent').textContent = `${index + 1}/${eightSolutions.length}`;
            renderEightBoard();
        }

        // Backtracking solver to produce all solutions. Returns array of solutions where each solution is an array of length 8: column index per row.
        function solveAllEightQueens() {
            const solutions = [];
            const cols = Array(8).fill(false);
            const diag1 = Array(15).fill(false); // r+c
            const diag2 = Array(15).fill(false); // r-c+7
            const current = Array(8).fill(-1);

            function place(row) {
                if (row === 8) {
                    solutions.push(current.slice());
                    return;
                }
                for (let c = 0; c < 8; c++) {
                    if (cols[c] || diag1[row + c] || diag2[row - c + 7]) continue;
                    cols[c] = diag1[row + c] = diag2[row - c + 7] = true;
                    current[row] = c;
                    place(row + 1);
                    cols[c] = diag1[row + c] = diag2[row - c + 7] = false;
                    current[row] = -1;
                }
            }
            place(0);
            return solutions;
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
        function showVictoryModal(winner, mateMove = null) {
            const modal = document.getElementById('victoryModal');
            const message = document.getElementById('victoryMessage');
            const moveCountEl = document.getElementById('moveCount');

            // Build mate move notation (if available)
            let mateNotation = '';
            if (mateMove) {
                try {
                    if (mateMove.type === 'castle') {
                        mateNotation = mateMove.side === 'kingside' ? 'O-O#' : 'O-O-O#';
                    } else {
                        const isCapture = mateMove.captured !== null && mateMove.captured !== undefined;
                        const from = mateMove.from || {};
                        const to = mateMove.to || {};
                        let notation = formatMoveNotation(mateMove.piece || '', from.row, from.col, to.row, to.col, isCapture);
                        if (mateMove.isEnPassant) notation += ' e.p.';
                        // If promotion info exists, show promoted piece (common property name: promotedTo)
                        if (mateMove.promotedTo) notation += '=' + mateMove.promotedTo.replace(/.*_/,'').toUpperCase();
                        mateNotation = notation + '#';
                    }
                } catch (e) {
                    console.warn('Failed to format mate move notation', e);
                    mateNotation = '';
                }
            }

            // Set victory message including the mate move when available
            if (mateNotation) {
                message.textContent = `${winner} wins by checkmate — ${mateNotation}`;
            } else {
                message.textContent = `${winner} wins by checkmate!`;
            }

            // Set move count
            moveCountEl.textContent = Math.ceil(moveHistory.length / 2);

            // Show modal
            modal.style.display = 'block';
            // Enable game review button
            if (typeof enableGameReview === 'function') enableGameReview();
        }
        //draw modal
        function showDrawModal(drawType = 'stalemate') {
            const modal = document.getElementById('victoryModal');
            const message = document.getElementById('victoryMessage');
            const moveCountEl = document.getElementById('moveCount');
            const title = document.querySelector('.victory-title');
            
            console.log(`Showing draw modal for: ${drawType}`);
            
            // Set draw message based on type
            title.textContent = 'Draw!';
            if (drawType === 'fifty-move') {
                message.textContent = 'Game ends in a draw by the 50-move rule!';
            } else if (drawType === 'threefold') {
                message.textContent = 'Game ends in a draw by threefold repetition!';
            } else {
                message.textContent = 'Game ends in a draw by stalemate!';
            }
            
            // Set move count
            moveCountEl.textContent = Math.ceil(moveHistory.length / 2);
            
            // Show modal
            modal.style.display = 'block';
        }
        
        function closeVictoryModal() {
            document.getElementById('victoryModal').style.display = 'none';
        }

        //50- moves testing
        function testFiftyMoveRule() {
            halfmoveClock = 98; // Set it close to trigger
            console.log("Set halfmove clock to 98 for testing");
            updateStatus(`Testing 50-move rule - Halfmoves: ${halfmoveClock}`);
        }
        // debug function to see what's happening
        function debugFiftyMoveRule() {
            console.log(`Halfmove clock: ${halfmoveClock}`);
            console.log(`Moves until 50-move rule: ${50 - Math.floor(halfmoveClock / 2)}`);
        }
        //function to generate a position hash
        function generatePositionHash() {
            // Create a string representation of the current position
            let positionString = '';
            
            // Add board state
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    positionString += board[row][col] || 'empty';
                    positionString += '|';
                }
            }
            
            // Add current turn
            positionString += `turn:${currentTurn}|`;
            
            // Add castling rights
            positionString += `castle:${castlingRights.white.kingside ? 'K' : ''}${castlingRights.white.queenside ? 'Q' : ''}${castlingRights.black.kingside ? 'k' : ''}${castlingRights.black.queenside ? 'q' : ''}|`;
            
            // Add en passant target
            if (enPassantTarget) {
                positionString += `ep:${enPassantTarget.row}-${enPassantTarget.col}|`;
            } else {
                positionString += 'ep:none|';
            }
            
            return positionString;
        }
        //function to check for threefold repetition 
        function isThreefoldRepetition() {
            const currentPosition = generatePositionHash();
            let count = 0;
            
            // Count how many times this position has occurred
            for (const position of positionHistory) {
                if (position === currentPosition) {
                    count++;
                }
            }
            
            console.log(`Position repetition check: current count = ${count + 1}`);
            return count >= 2; // Current position + 2 previous = 3 total
        }


        // save current game stat
        function saveGameState() {
            const gameState = {
                board: board.map(row => [...row]), // Deep copy
                currentTurn: currentTurn,
                castlingRights: JSON.parse(JSON.stringify(castlingRights)),
                enPassantTarget: enPassantTarget ? { ...enPassantTarget } : null,
                halfmoveClock: halfmoveClock,
                positionHistory: [...positionHistory],
                capturedPieces: {
                    white: [...capturedPieces.white],
                    black: [...capturedPieces.black]
                }
            };
            gameStateHistory.push(gameState);
            updateNavigationButtons();
        }


        // function dor navigation 
        function navigateMove(direction) {
            const totalMoves = gameStateHistory.length;
            if (totalMoves === 0) return;
            
            // Calculate new position
            let newIndex = currentMoveIndex + direction;
            
            // Clamp the index
            if (newIndex < 0) newIndex = 0;
            if (newIndex >= totalMoves) newIndex = totalMoves - 1;
            
            if (newIndex === currentMoveIndex) return; // No change
            
            currentMoveIndex = newIndex;
            
            // Show the position at this index
            restoreGameState(gameStateHistory[currentMoveIndex]);
            
            updateNavigationButtons();
            drawPieces();
            clearHighlights();
            
            // Disable piece interaction when not in live mode
            const isLive = currentMoveIndex === totalMoves - 1;
            const chessboard = document.getElementById('chessboard');
            if (isLive) {
                chessboard.style.pointerEvents = 'auto';
                chessboard.style.opacity = '1';
            } else {
                chessboard.style.pointerEvents = 'none';
                chessboard.style.opacity = '0.7';
            }
            
            console.log(`Navigated to move ${currentMoveIndex + 1}/${totalMoves}`);
        }


        // Function to restore a game state
        function restoreGameState(gameState) {
            board = gameState.board.map(row => [...row]); // Deep copy
            currentTurn = gameState.currentTurn;
            castlingRights = JSON.parse(JSON.stringify(gameState.castlingRights));
            enPassantTarget = gameState.enPassantTarget ? { ...gameState.enPassantTarget } : null;
            halfmoveClock = gameState.halfmoveClock;
            positionHistory = [...gameState.positionHistory];
            capturedPieces = {
                white: [...gameState.capturedPieces.white],
                black: [...gameState.capturedPieces.black]
            };
            
            updateTurnDisplay();
            updateCastlingDisplay();
        }


        // Function to update navigation button states
        function updateNavigationButtons() {
            const prevBtn = document.getElementById('prevMoveBtn');
            const nextBtn = document.getElementById('nextMoveBtn');
            const totalMoves = gameStateHistory.length;
            
            if (!prevBtn || !nextBtn) return; // Elements not found
            
            // Previous button: disabled if we're at the first move
            prevBtn.disabled = currentMoveIndex <= 0;
            
            // Next button: disabled if we're at the last move
            nextBtn.disabled = currentMoveIndex >= totalMoves - 1;
            
            // Update move counter
            const currentMoveDisplay = document.getElementById('currentMoveDisplay');
            if (currentMoveDisplay) {
                if (currentMoveIndex === totalMoves - 1 && totalMoves > 0) {
                    currentMoveDisplay.textContent = 'Live';
                } else {
                    currentMoveDisplay.textContent = 'NAlize';
                }
            }
        }


        // Function to go back to live position
        function goToLivePosition() {
            const totalMoves = gameStateHistory.length;
            if (totalMoves > 0 && currentMoveIndex !== totalMoves - 1) {
                currentMoveIndex = totalMoves - 1;
                restoreGameState(gameStateHistory[currentMoveIndex]);
                updateNavigationButtons();
                drawPieces();
                clearHighlights();
                
                // Re-enable piece interaction
                const chessboard = document.getElementById('chessboard');
                chessboard.style.pointerEvents = 'auto';
                chessboard.style.opacity = '1';
            }
        }

        
        function initGame() {
            setupBoard();
            setupPieces();
            updateCastlingDisplay();
                       updateTurnDisplay();
            
            // Initialize navigation
            currentMoveIndex = -1;
            saveGameState();
            currentMoveIndex = 0;
            updateNavigationButtons();
            
            
        }
        
        

        
        // Analyze the current position
        async function analyzeCurrentPosition() {
            const fen = generateFENFromHistory(currentReviewMove);
            const statusEl = document.getElementById('analysisStatus');
            statusEl.textContent = 'Analyzing...';
            statusEl.classList.add('analyzing');

            const data = await analyzePositionWithAPI(fen, reviewAnalysisDepth);
            if (!data) {
                statusEl.textContent = 'API error';
                statusEl.classList.remove('analyzing');
                return;
            }

            // Update UI with API results
            document.getElementById('evaluationScore').textContent = data.evaluation;
            document.getElementById('bestMove').textContent = data.bestMove || '-';
            document.getElementById('pvMoves').textContent = data.pv ? data.pv.join(' ') : '-';
            document.getElementById('analysisDepth').textContent = `Depth: ${data.depth || '-'}`;
            document.getElementById('analysisNodes').textContent = `Nodes: ${data.nodes || '-'}`;

            // Update evaluation bar
            const evalFill = document.getElementById('evalFill');
            let score = parseFloat(data.evaluation);
            if (!isNaN(score)) {
                const clampedScore = Math.max(-5, Math.min(5, score));
                const percentage = ((clampedScore + 5) / 10) * 100;
                evalFill.style.width = `${percentage}%`;
                if (score > 1) {
                    evalFill.style.background = 'linear-gradient(90deg, #95a5a6, #27ae60)';
                } else if (score < -1) {
                    evalFill.style.background = 'linear-gradient(90deg, #e74c3c, #95a5a6)';
                } else {
                    evalFill.style.background = '#95a5a6';
                }
            } else {
                evalFill.style.width = '50%';
                evalFill.style.background = '#95a5a6';
            }

            statusEl.textContent = 'Complete';
            statusEl.classList.remove('analyzing');
        }
        
        // Generate FEN string from current board position
        function generateFEN() {
            let fen = '';
            
            // Board position
            for (let row = 0; row < 8; row++) {
                let emptyCount = 0;
                for (let col = 0; col < 8; col++) {
                    const piece = board[row][col];
                    if (piece) {
                        if (emptyCount > 0) {
                            fen += emptyCount;
                            emptyCount = 0;
                        }
                        
                        const [color, type] = piece.split('_');
                        let pieceChar = type[0].toUpperCase();
                        if (type === 'knight') pieceChar = 'N';
                        if (color === 'black') pieceChar = pieceChar.toLowerCase();
                        
                        fen += pieceChar;
                    } else {
                        emptyCount++;
                    }
                }
                if (emptyCount > 0) fen += emptyCount;
                if (row < 7) fen += '/';
            }
            
            // Active color
            fen += ` ${currentTurn === 'white' ? 'w' : 'b'}`;
            
            // Castling availability
            let castling = '';
            if (castlingRights.white.kingside) castling += 'K';
            if (castlingRights.white.queenside) castling += 'Q';
            if (castlingRights.black.kingside) castling += 'k';
            if (castlingRights.black.queenside) castling += 'q';
            fen += ` ${castling || '-'}`;
            
            // En passant target square
            let epTarget = '-';
            if (enPassantTarget) {
                epTarget = String.fromCharCode(97 + enPassantTarget.col) + (8 - enPassantTarget.row);
            }
            fen += ` ${epTarget}`;
            
            // Halfmove clock and fullmove number
            const fullmove = Math.ceil((moveHistory.length + 1) / 2);
            fen += ` ${halfmoveClock} ${fullmove}`;
            
            return fen;
        }
        
        
        async function analyzePositionWithAPI(fen, depth = 12) {
            try {
                const response = await fetch('https://chess-api.com/v1', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fen,
                        depth,
                        maxThinkingTime: 50
                    })
                });
                const data = await response.json();
                return data; // { evaluation, bestMove, pv, depth, nodes }
            } catch (error) {
                console.error('Chess API error:', error);
                return null;
            }
        }

        // ---------------- Stockfish helper API (non-module) ------------------------------------
        function startStockfish() {
            if (window._stockfishWorker) return window._stockfishWorker;
            try {
                if (typeof Stockfish === 'function') {
                    window._stockfishWorker = Stockfish();
                } else if (typeof stockfish === 'function') {
                    window._stockfishWorker = stockfish();
                } else if (typeof Worker !== 'undefined') {
                    try {
                        // Try local fallback worker inside stockfish folder
                        window._stockfishWorker = new Worker('./stockfish/stockfish.js');
                    } catch (e) {
                        console.warn('No Stockfish worker available locally:', e);
                        window._stockfishWorker = null;
                    }
                } else {
                    window._stockfishWorker = null;
                }
            } catch (e) {
                console.warn('startStockfish error', e);
                window._stockfishWorker = null;
            }
            return window._stockfishWorker;
        }

        function waitForMessage(worker, substring, timeout = 3000) {
            return new Promise((resolve) => {
                if (!worker) return resolve(false);
                let timer = null;
                const onmsg = (e) => {
                    const d = (e && e.data) ? e.data.toString() : '' + e;
                    if (d.indexOf(substring) !== -1) {
                        if (timer) clearTimeout(timer);
                        worker.removeEventListener('message', onmsg);
                        resolve(true);
                    }
                };
                worker.addEventListener('message', onmsg);
                timer = setTimeout(() => {
                    try { worker.removeEventListener('message', onmsg); } catch (e) {}
                    resolve(false);
                }, timeout);
            });
        }

        function parseUCIInfo(lines) {
            const result = { id: {}, options: {} };
            lines.forEach(line => {
                if (!line) return;
                const parts = line.trim().split(/\s+/);
                if (parts[0] === 'id') {
                    const key = parts[1];
                    const value = parts.slice(2).join(' ');
                    result.id[key] = value;
                } else if (parts[0] === 'option') {
                    const rest = line.replace(/^option\s+/, '');
                    const match = rest.match(/name\s+(.*?)\s+(type\s+.*)/);
                    if (match) {
                        const name = match[1];
                        const props = match[2];
                        result.options[name] = props;
                    }
                }
            });
            return result;
        }

        /**
         * Query the Stockfish engine for UCI id/options.
         * Returns: { uciOk, ready, parsed, raw }
         */
        async function getStockfishFeatures(timeout = 3000) {
            const worker = startStockfish();
            if (!worker) return { error: 'no-worker' };

            const lines = [];
            const collector = (e) => {
                const d = (e && e.data) ? e.data.toString() : '' + e;
                lines.push(d);
            };
            worker.addEventListener('message', collector);

            // Send UCI handshake and wait for uciok
            try {
                worker.postMessage('uci');
            } catch (e) { console.warn('postMessage uci failed', e); }
            const uciOk = await waitForMessage(worker, 'uciok', timeout);

            // Ensure engine ready
            try { worker.postMessage('isready'); } catch (e) {}
            const ready = await waitForMessage(worker, 'readyok', timeout);

            worker.removeEventListener('message', collector);
            const parsed = parseUCIInfo(lines);
            return { uciOk, ready, parsed, raw: lines };
        }

        // Expose globally for the page
        window.getStockfishFeatures = getStockfishFeatures;
        window.startStockfish = startStockfish;

        // ---------------------------------------------------------------------------------------
























