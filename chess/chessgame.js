
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
        let pendingPromotion = null;
        let pendingPromotionMove = null;
        let halfmoveClock = 0; // Counts half-moves since last pawn move or capture
        let positionHistory = []; // Stores position hashes for repetition detection
        // variables for move right left
        let currentMoveIndex = -1; // -1 means we're at the current live position
        let gameStateHistory = []; // Store complete game states
        //stockfish
        let stockfish = null;
        let isAnalyzing = false;
        let isGameReviewMode = false;
        let gameReviewData = [];
        let currentReviewMove = 0;
        let reviewAnalysisDepth = 12; // Reduced for faster analysis
        let stockfishReady = false;
        let stockfishInitAttempts = 0;


        
        function initStockfish() {
            try {
                stockfish = new Worker("https://unpkg.com/stockfish.js/stockfish.js");
                stockfishReady = false;

                stockfish.onmessage = function (event) {
                    const message = event.data ? event.data.toString() : event;
                    console.log("Stockfish:", message);

                    if (message.includes("uciok")) {
                        stockfishReady = true;
                        updateStatus("Stockfish engine ready.");
                    }

                    if (isAnalyzing && message.startsWith("info depth")) {
                        // Here you can parse depth/score for display
                    }

                    if (isAnalyzing && message.startsWith("bestmove")) {
                        isAnalyzing = false;
                        console.log("Best move:", message);
                    }
                };

                stockfish.postMessage("uci");

            } catch (error) {
                console.error("Stockfish init error:", error);
                updateStatus("Failed to initialize Stockfish engine.");
            }
        }

        function startGameReview() {
            if (!stockfish || !stockfishReady) {
                alert("Chess engine is not available. Please refresh the page and wait for it to load.");
                return;
            }

            isGameReviewMode = true;
            currentReviewMove = 0;
            updateStatus("Starting game review with Stockfish...");

            reviewNextMove();
        }

        // Stockfish Review Handler
        function reviewNextMove() {
            if (currentReviewMove >= moveHistory.length) {
                updateStatus("Game review finished.");
                isGameReviewMode = false;
                // After analysis, enable download
                createDownloadButton();
                return;
            }
        
            const fen = generateFENFromHistory(currentReviewMove);
            stockfish.onmessage = function (event) {
                const message = event.data ? event.data.toString() : event;
                if (message.startsWith("info depth")) {
                    // Parse evaluation (cp = centipawn, mate = checkmate)
                    if (message.includes("score")) {
                        const evalMatch = message.match(/score (\w+) (-?\d+)/);
                        if (evalMatch) {
                            const type = evalMatch[1];
                            const value = evalMatch[2];
                            gameReviewData.push({
                                move: currentReviewMove + 1,
                                fen,
                                evaluation: type === "cp" ? (value / 100) : `Mate in ${value}`
                            });
                        }
                    }
                }
                if (message.startsWith("bestmove")) {
                    currentReviewMove++;
                    reviewNextMove(); // go to next move
                }
            };
        
            stockfish.postMessage("position fen " + fen);
            stockfish.postMessage("go depth " + reviewAnalysisDepth);
        }
        


        // Dummy helper for FEN (you should already have this function in your code)
        function generateFENFromHistory(index) {
            // Start with fresh board and replay moves up to index
            let tempBoard = Array(8).fill(null).map(() => Array(8).fill(null));
            setupPiecesOnBoard(tempBoard); // helper to place initial pieces
        
            for (let i = 0; i <= index; i++) {
                const move = moveHistory[i];
                if (!move) continue;
        
                // Apply moves like in your movePiece function (simplified for review)
                const piece = move.piece;
                tempBoard[move.from.row][move.from.col] = null;
                tempBoard[move.to.row][move.to.col] = piece;
            }
        
            // Convert board to FEN
            return boardToFEN(tempBoard, currentTurn);
        }

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
            initStockfish();
        });




        
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
            
            // Initialize navigation
            gameStateHistory = [];
            currentMoveIndex = -1;
            saveGameState();
            currentMoveIndex = 0; // Start at the first position
            updateNavigationButtons();
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
                showVictoryModal(winner);
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
             // Enable game review button
             enableGameReview();
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

        // Initialize Stockfish engine
        function initGame() {
            setupBoard();
            setupPieces();
            updateCastlingDisplay();
            updateTurnDisplay();
            
            // Initialize navigation
            gameStateHistory = [];
            currentMoveIndex = -1;
            saveGameState();
            currentMoveIndex = 0;
            updateNavigationButtons();
            
            // Initialize Stockfish with proper delay and retry mechanism
            console.log('Starting Stockfish initialization...');
            setTimeout(() => {
                initStockfishWithRetry();
            }, 1500);
        }
        
        
        
        // Show error message if Stockfish fails to load
        function showStockfishError() {
            console.warn('Stockfish failed to load - review feature will be limited');
            // You can add a visual indicator here if needed
        }
        
        // Handle messages from Stockfish
        function handleStockfishMessage(event) {
            const message = event.data || event;
            console.log('Stockfish:', message);
            
            try {
                if (message === 'uciok') {
                    console.log('✅ UCI protocol initialized');
                } else if (message === 'readyok') {
                    stockfishReady = true;
                    console.log('✅ Stockfish engine is ready!');
                    
                    // Configure engine settings for better performance
                    stockfish.postMessage('setoption name Hash value 64');
                    stockfish.postMessage('setoption name Threads value 1');
                    stockfish.postMessage('setoption name Ponder value false');
                    
                } else if (message.includes('bestmove')) {
                    isAnalyzing = false;
                    if (isGameReviewMode) {
                        processAnalysisResult(message);
                    }
                } else if (message.includes('info depth') && message.includes('score')) {
                    if (isGameReviewMode) {
                        parseAnalysisInfo(message);
                    }
                }
            } catch (error) {
                console.error('Error handling Stockfish message:', error);
            }
        }
        
        // Parse analysis information from Stockfish
        function parseAnalysisInfo(message) {
            if (!message.includes('pv')) return;
            
            const parts = message.split(' ');
            let depth = 0;
            let score = null;
            let pv = [];
            let nodes = 0;
            
            for (let i = 0; i < parts.length; i++) {
                if (parts[i] === 'depth') {
                    depth = parseInt(parts[i + 1]);
                } else if (parts[i] === 'score') {
                    if (parts[i + 1] === 'cp') {
                        score = parseInt(parts[i + 2]) / 100;
                    } else if (parts[i + 1] === 'mate') {
                        score = `M${parts[i + 2]}`;
                    }
                } else if (parts[i] === 'nodes') {
                    nodes = parseInt(parts[i + 1]);
                } else if (parts[i] === 'pv') {
                    pv = parts.slice(i + 1, i + 8); // Take first 7 moves
                    break;
                }
            }
            
            // Only update display for deeper analysis
            if (depth >= Math.min(8, reviewAnalysisDepth)) {
                updateReviewAnalysis(depth, score, pv, nodes);
            }
        }
        
        // Start game review with Stockfish
        
        
        // Create the review interface
        function createReviewInterface() {
            const moveHistoryContainer = document.querySelector('.move-history');
            
            if (!moveHistoryContainer.dataset.originalContent) {
                moveHistoryContainer.dataset.originalContent = moveHistoryContainer.innerHTML;
            }
            
            moveHistoryContainer.innerHTML = `
                <div class="review-header">
                    <h3>🔍 Game Review</h3>
                    <button class="btn btn-clear" onclick="exitGameReview()" style="margin-left: 10px; padding: 5px 10px; font-size: 12px;">Exit</button>
                </div>
                
                <div class="review-controls">
                    <div class="review-navigation">
                        <button id="reviewPrevBtn" class="nav-btn" onclick="reviewPreviousMove()" title="Previous Move">❮</button>
                        <div class="move-counter">
                            <span id="reviewMoveDisplay">Move 1</span>
                        </div>
                        <button id="reviewNextBtn" class="nav-btn" onclick="reviewNextMove()" title="Next Move">❯</button>
                    </div>
                    
                    <div class="analysis-controls">
                        <label style="font-size: 12px;">Depth:</label>
                        <select id="depthSelect" onchange="changeAnalysisDepth()" style="font-size: 12px; margin-left: 5px;">
                            <option value="8">Fast (8)</option>
                            <option value="12" selected>Medium (12)</option>
                            <option value="16">Deep (16)</option>
                        </select>
                    </div>
                </div>
                
                <div class="analysis-panel">
                    <div class="analysis-header">
                        <h4>Engine Analysis</h4>
                        <div id="analysisStatus" class="analysis-status">Ready</div>
                    </div>
                    
                    <div class="evaluation-section">
                        <div class="eval-display">
                            <span class="eval-label">Evaluation:</span>
                            <span id="evaluationScore" class="eval-score">0.00</span>
                        </div>
                        
                        <div class="eval-bar-container">
                            <div id="evalBar" class="eval-bar">
                                <div id="evalFill" class="eval-fill"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="best-move-section">
                        <div class="best-move-display">
                            <span class="bm-label">Best Move:</span>
                            <span id="bestMove" class="best-move">-</span>
                        </div>
                    </div>
                    
                    <div class="pv-section">
                        <div class="pv-label">Principal Variation:</div>
                        <div id="pvMoves" class="pv-moves">-</div>
                    </div>
                    
                    <div class="analysis-info">
                        <span id="analysisDepth" class="info-text">Depth: -</span>
                        <span id="analysisNodes" class="info-text">Nodes: -</span>
                    </div>
                </div>
            `;
            
            addReviewStyles();
        }
        
        // Add CSS styles for the review interface
        function addReviewStyles() {
            if (document.getElementById('reviewStyles')) return;
            
            const style = document.createElement('style');
            style.id = 'reviewStyles';
            style.textContent = `
                .review-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #3498db;
                }
                
                .review-header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                }
                
                .review-controls {
                    margin-bottom: 12px;
                }
                
                .analysis-controls {
                    margin-top: 8px;
                    text-align: center;
                }
                
                .analysis-controls select {
                    background: #34495e;
                    color: #ecf0f1;
                    border: 1px solid #3498db;
                    border-radius: 4px;
                    padding: 4px 8px;
                }
                
                .analysis-panel {
                    background: rgba(52, 73, 94, 0.3);
                    border-radius: 10px;
                    padding: 12px;
                    margin-bottom: 10px;
                }
                
                .analysis-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .analysis-header h4 {
                    margin: 0;
                    color: #3498db;
                    font-size: 1rem;
                }
                
                .analysis-status {
                    font-size: 0.8rem;
                    color: #f39c12;
                    font-weight: bold;
                }
                
                .evaluation-section {
                    margin: 10px 0;
                }
                
                .eval-display {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                
                .eval-label {
                    font-size: 0.9rem;
                    color: #ecf0f1;
                }
                
                .eval-score {
                    font-size: 1.1rem;
                    font-weight: bold;
                    color: #3498db;
                    font-family: 'Courier New', monospace;
                }
                
                .eval-bar-container {
                    height: 20px;
                    background: #2c3e50;
                    border-radius: 10px;
                    overflow: hidden;
                    border: 2px solid #34495e;
                }
                
                .eval-bar {
                    height: 100%;
                    position: relative;
                }
                
                .eval-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #e74c3c, #f39c12, #27ae60);
                    transition: all 0.5s ease;
                    width: 50%;
                }
                
                .best-move-section {
                    margin: 10px 0;
                    padding: 8px;
                    background: rgba(236, 240, 241, 0.05);
                    border-radius: 6px;
                }
                
                .best-move-display {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .bm-label {
                    font-size: 0.9rem;
                    color: #ecf0f1;
                }
                
                .best-move {
                    font-size: 1rem;
                    font-weight: bold;
                    color: #27ae60;
                    font-family: 'Courier New', monospace;
                }
                
                .pv-section {
                    margin: 10px 0;
                    padding: 8px;
                    background: rgba(236, 240, 241, 0.05);
                    border-radius: 6px;
                }
                
                .pv-label {
                    font-size: 0.85rem;
                    color: #ecf0f1;
                    margin-bottom: 5px;
                }
                
                .pv-moves {
                    font-family: 'Courier New', monospace;
                    color: #3498db;
                    font-size: 0.85rem;
                    line-height: 1.3;
                }
                
                .analysis-info {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 1px solid rgba(236, 240, 241, 0.1);
                }
                
                .info-text {
                    font-size: 0.75rem;
                    color: #95a5a6;
                }
                
                .analyzing {
                    animation: pulse 1.5s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `;
            
            document.head.appendChild(style);
        }
        
        // Start analyzing the game from the beginning
        function analyzeGameFromStart() {
            currentReviewMove = 0;
            gameReviewData = [];
            
            // Go to starting position
            const initialState = gameStateHistory[0];
            restoreGameState(initialState);
            drawPieces();
            clearHighlights();
            
            updateReviewDisplay();
            analyzeCurrentPosition();
        }
        
        // Analyze the current position
        function analyzeCurrentPosition() {
            if (!stockfish || !stockfishReady) {
                document.getElementById('analysisStatus').textContent = 'Engine not ready';
                return;
            }
            
            const statusEl = document.getElementById('analysisStatus');
            statusEl.textContent = 'Analyzing...';
            statusEl.classList.add('analyzing');
            
            isAnalyzing = true;
            
            try {
                const fen = generateFEN();
                console.log('Analyzing position:', fen);
                
                // Clear previous analysis
                stockfish.postMessage('stop');
                
                // Set new position
                stockfish.postMessage(`position fen ${fen}`);
                
                // Start analysis
                stockfish.postMessage(`go depth ${reviewAnalysisDepth}`);
                
            } catch (error) {
                console.error('Error starting analysis:', error);
                statusEl.textContent = 'Analysis error';
                statusEl.classList.remove('analyzing');
            }
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
        
        // Process the analysis result from Stockfish
        function processAnalysisResult(message) {
            const parts = message.split(' ');
            const bestMoveIndex = parts.indexOf('bestmove');
            
            if (bestMoveIndex !== -1 && bestMoveIndex + 1 < parts.length) {
                const bestMove = parts[bestMoveIndex + 1];
                
                document.getElementById('bestMove').textContent = bestMove;
                
                const statusEl = document.getElementById('analysisStatus');
                statusEl.textContent = 'Complete';
                statusEl.classList.remove('analyzing');
                
                console.log('Analysis complete, best move:', bestMove);
            }
        }
        
        // Update the review display with analysis results
        function updateReviewAnalysis(depth, score, pv, nodes) {
            const evaluationScore = document.getElementById('evaluationScore');
            const evalFill = document.getElementById('evalFill');
            const pvMoves = document.getElementById('pvMoves');
            const analysisDepth = document.getElementById('analysisDepth');
            const analysisNodes = document.getElementById('analysisNodes');
            
            // Update evaluation
            if (typeof score === 'number') {
                const displayScore = score.toFixed(2);
                evaluationScore.textContent = (score >= 0 ? '+' : '') + displayScore;
                
                // Update evaluation bar
                const clampedScore = Math.max(-5, Math.min(5, score));
                const percentage = ((clampedScore + 5) / 10) * 100;
                evalFill.style.width = `${percentage}%`;
                
                // Color based on advantage
                if (score > 1) {
                    evalFill.style.background = 'linear-gradient(90deg, #95a5a6, #27ae60)';
                } else if (score < -1) {
                    evalFill.style.background = 'linear-gradient(90deg, #e74c3c, #95a5a6)';
                } else {
                    evalFill.style.background = '#95a5a6';
                }
            } else if (typeof score === 'string') {
                evaluationScore.textContent = score;
                evalFill.style.width = score.includes('-') ? '0%' : '100%';
            }
            
            // Update principal variation
            if (pv && pv.length > 0) {
                pvMoves.textContent = pv.join(' ');
            }
            
            // Update analysis info
            if (analysisDepth) {
                analysisDepth.textContent = `Depth: ${depth}`;
            }
            
            if (analysisNodes && nodes) {
                const nodeText = nodes > 1000000 ? `${(nodes/1000000).toFixed(1)}M` : 
                                nodes > 1000 ? `${(nodes/1000).toFixed(0)}K` : nodes.toString();
                analysisNodes.textContent = `Nodes: ${nodeText}`;
            }
        }
        
        // Navigation functions
        function reviewPreviousMove() {
            if (currentReviewMove > 0) {
                currentReviewMove--;
                loadReviewPosition();
            }
        }
        
        
        
        // Load a specific review position
        function loadReviewPosition() {
            const gameState = gameStateHistory[currentReviewMove];
            restoreGameState(gameState);
            drawPieces();
            clearHighlights();
            
            updateReviewDisplay();
            analyzeCurrentPosition();
            
            // Disable board interaction
            const chessboard = document.getElementById('chessboard');
            chessboard.style.pointerEvents = 'none';
            chessboard.style.opacity = '0.8';
        }
        
        // Update the review display
        function updateReviewDisplay() {
            const reviewMoveDisplay = document.getElementById('reviewMoveDisplay');
            const reviewPrevBtn = document.getElementById('reviewPrevBtn');
            const reviewNextBtn = document.getElementById('reviewNextBtn');
            
            if (reviewMoveDisplay) {
                reviewMoveDisplay.textContent = `Move ${currentReviewMove + 1}`;
            }
            
            if (reviewPrevBtn) {
                reviewPrevBtn.disabled = currentReviewMove === 0;
            }
            
            if (reviewNextBtn) {
                reviewNextBtn.disabled = currentReviewMove >= gameStateHistory.length - 1;
            }
            
            updateTurnDisplay();
            updateCastlingDisplay();
        }
        
        // Change analysis depth
        function changeAnalysisDepth() {
            const depthSelect = document.getElementById('depthSelect');
            reviewAnalysisDepth = parseInt(depthSelect.value);
            
            if (isGameReviewMode && stockfish && stockfishReady) {
                analyzeCurrentPosition();
            }
        }
        
        // Exit game review mode
        function exitGameReview() {
            isGameReviewMode = false;
            
            // Stop any ongoing analysis
            if (stockfish && isAnalyzing) {
                stockfish.postMessage('stop');
                isAnalyzing = false;
            }
            
            // Restore original interface
            const moveHistoryContainer = document.querySelector('.move-history');
            const originalContent = moveHistoryContainer.dataset.originalContent;
            
            if (originalContent) {
                moveHistoryContainer.innerHTML = originalContent;
            }
            
            // Remove review styles
            const reviewStyles = document.getElementById('reviewStyles');
            if (reviewStyles) {
                reviewStyles.remove();
            }
            
            // Go back to live position
            goToLivePosition();
            
            // Re-enable board interaction
            const chessboard = document.getElementById('chessboard');
            chessboard.style.pointerEvents = 'auto';
            chessboard.style.opacity = '1';
        }
        
        // Enable the review button (called when game ends)
        function enableGameReview() {
            const reviewBtn = document.getElementById('reviewGameBtn');
            if (reviewBtn) {
                reviewBtn.style.display = 'block';
                reviewBtn.disabled = false;
            }
        }




        


        


        
        
        

        


        
        

        
        

        
    