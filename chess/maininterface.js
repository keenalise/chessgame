// KeenChess — Static Board + Puzzle Modals
// Lichess SVG pieces + 8-Queens Sol#1 + Daily Puzzle fetch
(function () {
  const boardEl = document.getElementById('staticBoard');
  if (!boardEl) return;

  /* ================================================================
     LICHESS SVG PIECE SYSTEM
     Base URL: https://lichess1.org/assets/piece/cburnett/
     Files: wP.svg, bP.svg, wR.svg, bR.svg, etc.
     ================================================================ */
  const PIECE_BASE = 'https://lichess1.org/assets/piece/cburnett/';

  // Map FEN letter → Lichess filename prefix
  const PIECE_FILE = {
    P: 'wP', R: 'wR', N: 'wN', B: 'wB', Q: 'wQ', K: 'wK',
    p: 'bP', r: 'bR', n: 'bN', b: 'bB', q: 'bQ', k: 'bK',
  };

  /** Create an <img> piece using Lichess SVG assets */
  function makePieceImg(fenChar, size = '82%') {
    const file = PIECE_FILE[fenChar];
    if (!file) return null;
    const img = document.createElement('img');
    img.src = `${PIECE_BASE}${file}.svg`;
    img.alt = fenChar;
    img.className = 'piece-svg';
    img.style.cssText = `width:${size};height:${size};display:block;pointer-events:none;
      filter:drop-shadow(0 2px 5px rgba(0,0,0,0.55));transition:transform 0.1s ease;`;
    img.draggable = false;
    return img;
  }

  /* ── Build 8×8 squares ── */
  function createSquares(container) {
    container.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        sq.className = 'square ' + (isLight ? 'light' : 'dark');
        sq.dataset.row = r;
        sq.dataset.col = c;
        container.appendChild(sq);
      }
    }
  }

  function clearPieces(container) {
    container.querySelectorAll('.piece-svg').forEach(el => el.remove());
  }

  function renderFromFEN(fen, container) {
    if (!container) container = boardEl;
    if (!fen) fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    const placement = fen.split(' ')[0];
    const rows = placement.split('/');
    if (rows.length !== 8) return;
    clearPieces(container);
    for (let r = 0; r < 8; r++) {
      const row = rows[r];
      let c = 0;
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (/[1-8]/.test(ch)) { c += parseInt(ch, 10); continue; }
        if (c >= 8) continue;
        const sq = container.children[r * 8 + c];
        const img = makePieceImg(ch);
        if (img && sq) sq.appendChild(img);
        c++;
      }
    }
  }

  /* ── Init main board ── */
  createSquares(boardEl);
  renderFromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR', boardEl);
  window.renderStaticPosition = (fen) => renderFromFEN(fen, boardEl);

  /* ================================================================
     NAVIGATION
     ================================================================ */
  function setActive(buttonId) {
    document.querySelectorAll('.left-nav .nav-item').forEach(it => {
      it.classList.toggle('active', it.id === buttonId);
      it.setAttribute('aria-pressed', it.id === buttonId ? 'true' : 'false');
    });
  }

  function wireNav() {
    const home         = document.getElementById('navHomeBtn');
    const play         = document.getElementById('navPlayBtn');
    const puzzle       = document.getElementById('navPuzzleBtn');
    const puzzleMenu   = document.getElementById('puzzleMenu');
    const puzzle8      = document.getElementById('navPuzzle8Btn');
    const puzzleKnight = document.getElementById('navPuzzleKnightBtn');
    const puzzleDaily  = document.getElementById('navPuzzleDailyBtn');
    const news         = document.getElementById('navNewsBtn');
    const learn        = document.getElementById('navLearnBtn');
    const watch        = document.getElementById('navWatchBtn');
    const logout       = document.getElementById('navLogoutBtn');

    if (home) home.addEventListener('click', () => {
      setActive('navHomeBtn');
      renderFromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR', boardEl);
    });

    if (play) play.addEventListener('click', () => {
      setActive('navPlayBtn');
      window.location.href = 'chessgame.html';
    });

    if (puzzle) puzzle.addEventListener('click', () => {
      if (puzzleMenu) {
        const hidden = puzzleMenu.classList.contains('hidden');
        puzzleMenu.classList.toggle('hidden', !hidden);
        puzzleMenu.setAttribute('aria-hidden', hidden ? 'false' : 'true');
        const chevron = puzzle.querySelector('.chevron');
        if (chevron) chevron.style.transform = hidden ? 'rotate(90deg)' : '';
      }
    });

    if (puzzle8) puzzle8.addEventListener('click', () => { setActive('navPuzzleBtn'); openEightModal(); });
    if (puzzleKnight) puzzleKnight.addEventListener('click', () => { setActive('navPuzzleBtn'); openKnightModal(); });
    if (puzzleDaily)  puzzleDaily.addEventListener('click',  () => { setActive('navPuzzleBtn'); openDailyModal(); });
    const puzzleRandom = document.getElementById('navPuzzleRandomBtn');
    if (puzzleRandom) puzzleRandom.addEventListener('click', () => { setActive('navPuzzleBtn'); openRandomModal(); });

    if (news)  news.addEventListener('click',  () => { setActive('navNewsBtn');  window.open('https://en.chessbase.com/', '_blank'); });
    if (learn) learn.addEventListener('click', () => { setActive('navLearnBtn'); window.open('https://learningchess.net/us/courses', '_blank'); });
    if (watch) watch.addEventListener('click', () => { setActive('navWatchBtn'); window.open('https://www.youtube.com/@GothamChess/videos', '_blank'); });

    if (logout) logout.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to log out?')) return;
      setActive('navLogoutBtn');
      try {
        ['chess_user_id','chess_user_email','chess_user_name','chess_user_photo'].forEach(k => {
          sessionStorage.removeItem(k); localStorage.removeItem(k);
        });
      } catch (e) { console.warn('Storage clear failed:', e); }
      try {
        if (window.FirebaseAuth?.signOut) await window.FirebaseAuth.signOut();
        else if (window.firebase?.auth?.()?.signOut) await window.firebase.auth().signOut();
      } catch (err) { console.warn('Firebase sign out failed:', err); }
      try { window.location.href = 'chesslogin.html'; }
      catch (err) { window.location.replace('chesslogin.html'); }
    });

    // Close puzzle menu on outside click
    document.addEventListener('click', (e) => {
      if (!puzzle?.contains(e.target) && !puzzleMenu?.contains(e.target)) {
        puzzleMenu?.classList.add('hidden');
        puzzleMenu?.setAttribute('aria-hidden', 'true');
        const chevron = puzzle?.querySelector('.chevron');
        if (chevron) chevron.style.transform = '';
      }
    });
  }

  setTimeout(wireNav, 10);

  /* ================================================================
     8-QUEENS MODAL
     ================================================================ */
  let eightInitialized = false;
  let eightState = Array(8).fill(-1);
  let eightSolutions = [];
  let eightSolutionIndex = -1;

  function openEightModal() {
    if (!eightInitialized) initEightModal();
    const modal = document.getElementById('eightModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    renderEightBoard();
  }
  function closeEightModal() {
    const modal = document.getElementById('eightModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  function initEightModal() {
    eightInitialized = true;
    const container = document.getElementById('eightStaticBoard');
    if (!container) return;
    container.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        sq.className = 'eq-square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.row = r; sq.dataset.col = c;
        sq.addEventListener('click', () => { toggleQueen(r, c); renderEightBoard(); });
        container.appendChild(sq);
      }
    }

    const solveBtn      = document.getElementById('eightSolveBtn');
    const sol1Btn       = document.getElementById('eightSol1Btn');
    const dailyBtn      = document.getElementById('eightDailyBtn');
    const clearBtn      = document.getElementById('eightClearBtn');
    const closeBtn      = document.getElementById('eightCloseBtn');
    const closeFooter   = document.getElementById('eightCloseFooterBtn');
    const prevBtn       = document.getElementById('eightPrevBtn');
    const nextBtn       = document.getElementById('eightNextBtn');
    const backdrop      = document.querySelector('#eightModal .modal-backdrop');

    if (solveBtn) solveBtn.addEventListener('click', () => {
      const sols = solveAllEight();
      if (sols?.length > 0) {
        eightSolutions = sols; eightSolutionIndex = 0;
        eightState = sols[0].slice();
        renderEightBoard(); updateSolutionCounter();
      } else alert('No solution found');
    });

    // ── Sol #1 button: jump straight to solution index 0 ──
    if (sol1Btn) sol1Btn.addEventListener('click', () => {
      if (!eightSolutions.length) eightSolutions = solveAllEight();
      if (eightSolutions.length) {
        eightSolutionIndex = 0;
        eightState = eightSolutions[0].slice();
        renderEightBoard(); updateSolutionCounter();
      }
    });

    // ── Daily button inside 8Q: fetch Lichess daily puzzle FEN & show on main board ──
    if (dailyBtn) dailyBtn.addEventListener('click', async () => {
      dailyBtn.disabled = true;
      dailyBtn.textContent = 'Loading…';
      try {
        const data = await fetchLichessDaily();
        if (data?.puzzle?.fen || data?.game?.fen) {
          const fen = data.puzzle?.fen || data.game?.fen;
          closeEightModal();
          renderFromFEN(fen, boardEl);
          // Show a small toast
          showToast(`Daily puzzle loaded on main board! Rating: ${data.puzzle?.rating ?? '?'}`);
        }
      } catch (e) {
        console.warn('Daily puzzle fetch failed:', e);
        showToast('Could not fetch daily puzzle — check your connection.', true);
      }
      dailyBtn.disabled = false;
      dailyBtn.innerHTML = '<img src="https://lichess1.org/assets/logo/lichess-favicon-32.png" width="14" height="14" alt="" style="vertical-align:middle;margin-right:4px;">Daily';
    });

    if (clearBtn)    clearBtn.addEventListener('click', () => { eightState = Array(8).fill(-1); eightSolutions = []; eightSolutionIndex = -1; renderEightBoard(); updateSolutionCounter(); });
    if (closeBtn)    closeBtn.addEventListener('click', closeEightModal);
    if (closeFooter) closeFooter.addEventListener('click', closeEightModal);
    if (backdrop)    backdrop.addEventListener('click', closeEightModal);
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (!eightSolutions.length) return;
      eightSolutionIndex = (eightSolutionIndex - 1 + eightSolutions.length) % eightSolutions.length;
      eightState = eightSolutions[eightSolutionIndex].slice(); renderEightBoard(); updateSolutionCounter();
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (!eightSolutions.length) return;
      eightSolutionIndex = (eightSolutionIndex + 1) % eightSolutions.length;
      eightState = eightSolutions[eightSolutionIndex].slice(); renderEightBoard(); updateSolutionCounter();
    });
  }

  function renderEightBoard() {
    const container = document.getElementById('eightStaticBoard');
    if (!container) return;
    const placed = [];
    for (let r = 0; r < 8; r++) if (eightState[r] >= 0) placed.push({ r, c: eightState[r] });
    const conflicts = new Set();
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i], b = placed[j];
        if (a.c === b.c || Math.abs(a.r - b.r) === Math.abs(a.c - b.c)) {
          conflicts.add(a.r + ',' + a.c); conflicts.add(b.r + ',' + b.c);
        }
      }
    }
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = container.children[r * 8 + c];
        sq.innerHTML = '';
        if (eightState[r] === c) {
          const q = document.createElement('div');
          const key = r + ',' + c;
          q.className = 'queen ' + (conflicts.has(key) ? 'conflict' : 'ok');
          q.setAttribute('aria-label', conflicts.has(key) ? 'conflicting queen' : 'valid queen');
          q.textContent = '♛';
          sq.appendChild(q);
        }
      }
    }
    const countEl = document.getElementById('eightCount');
    if (countEl) countEl.textContent = String(eightState.filter(x => x >= 0).length);
  }

  function toggleQueen(r, c) { eightState[r] = eightState[r] === c ? -1 : c; }

  function solveAllEight() {
    const N = 8, cols = new Set(), d1 = new Set(), d2 = new Set();
    const sol = Array(N).fill(-1), results = [];
    function bt(r) {
      if (r === N) { results.push(sol.slice()); return; }
      for (let c = 0; c < N; c++) {
        if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue;
        cols.add(c); d1.add(r - c); d2.add(r + c); sol[r] = c;
        bt(r + 1);
        cols.delete(c); d1.delete(r - c); d2.delete(r + c); sol[r] = -1;
      }
    }
    bt(0); return results;
  }

  function updateSolutionCounter() {
    const idxEl = document.getElementById('eightSolutionIdx');
    const totalEl = document.getElementById('eightSolutionsTotal');
    if (!idxEl || !totalEl) return;
    if (!eightSolutions.length) { idxEl.textContent = '—'; totalEl.textContent = '—'; return; }
    idxEl.textContent = String(eightSolutionIndex + 1);
    totalEl.textContent = String(eightSolutions.length);
  }

  window.openEightModal  = openEightModal;
  window.closeEightModal = closeEightModal;

  /* ================================================================
     KNIGHT TOUR MODAL
     ================================================================ */
  let knightInitialized = false;
  let knightBoard = Array(64).fill(-1);

  function openKnightModal() {
    if (!knightInitialized) initKnightModal();
    const modal = document.getElementById('knightModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    renderKnightBoard();
  }
  function closeKnightModal() {
    const modal = document.getElementById('knightModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  function initKnightModal() {
    knightInitialized = true;
    const container = document.getElementById('knightBoard');
    if (!container) return;
    container.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        sq.className = 'kt-square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.row = r; sq.dataset.col = c;
        sq.addEventListener('click', () => { toggleKnightSquare(r, c); renderKnightBoard(); });
        container.appendChild(sq);
      }
    }

    const solveBtn    = document.getElementById('knightSolveBtn');
    const clearBtn    = document.getElementById('knightClearBtn');
    const closeBtn    = document.getElementById('knightCloseBtn');
    const closeFooter = document.getElementById('knightCloseFooterBtn');
    const backdrop    = document.querySelector('#knightModal .modal-backdrop');

    if (solveBtn) solveBtn.addEventListener('click', async () => {
      solveBtn.disabled = true; solveBtn.textContent = 'Solving…';
      const sol = solveKnightTour();
      if (sol) {
        knightBoard = sol.slice();
        try { await animateSolution(sol); } catch (_) { renderKnightBoard(); }
        knightBoard = sol.slice(); renderKnightBoard();
      } else alert('No knight tour solution found.');
      solveBtn.disabled = false; solveBtn.textContent = 'Solve';
    });
    if (clearBtn)    clearBtn.addEventListener('click', () => { knightBoard = Array(64).fill(-1); renderKnightBoard(); });
    if (closeBtn)    closeBtn.addEventListener('click', closeKnightModal);
    if (closeFooter) closeFooter.addEventListener('click', closeKnightModal);
    if (backdrop)    backdrop.addEventListener('click', closeKnightModal);
  }

  function renderKnightBoard() {
    const container = document.getElementById('knightBoard');
    if (!container) return;
    const maxMove = Math.max(...knightBoard);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const i = r * 8 + c;
        const sq = container.children[i];
        sq.innerHTML = '';
        const moveNum  = knightBoard[i];
        const isCurrent = moveNum === maxMove && moveNum >= 0;
        sq.classList.remove('visited', 'current');
        if (moveNum >= 0) {
          sq.classList.add('visited');
          if (isCurrent) sq.classList.add('current');
          const kt = document.createElement('div');
          kt.className = 'knight'; kt.textContent = '♘';
          sq.appendChild(kt);
          if (moveNum > 0) {
            const numEl = document.createElement('div');
            numEl.className = 'move-num'; numEl.textContent = String(moveNum);
            sq.appendChild(numEl);
          }
        }
      }
    }
    const countEl = document.getElementById('knightMoveCount');
    if (countEl) countEl.textContent = String(knightBoard.filter(x => x >= 0).length);
  }

  function toggleKnightSquare(r, c) {
    const idx = r * 8 + c;
    if (knightBoard[idx] >= 0) { knightBoard[idx] = -1; return; }
    const nextNum = knightBoard.filter(x => x >= 0).length;
    if (nextNum === 0 || isKnightMoveLegal(r, c)) knightBoard[idx] = nextNum;
  }

  function isKnightMoveLegal(r, c) {
    const lastMove = Math.max(...knightBoard);
    if (lastMove < 0) return true;
    for (let i = 0; i < 64; i++) {
      if (knightBoard[i] === lastMove) {
        const pr = Math.floor(i / 8), pc = i % 8;
        const dr = Math.abs(pr - r), dc = Math.abs(pc - c);
        if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) return true;
      }
    }
    return false;
  }

  function solveKnightTour() {
    const moves = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    const board = Array(64).fill(-1);
    function bt(r, c, move) {
      if (move === 64) return true;
      const nexts = [];
      for (const [dr, dc] of moves) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr * 8 + nc] === -1) {
          let deg = 0;
          for (const [dr2, dc2] of moves) {
            const nr2 = nr + dr2, nc2 = nc + dc2;
            if (nr2 >= 0 && nr2 < 8 && nc2 >= 0 && nc2 < 8 && board[nr2 * 8 + nc2] === -1) deg++;
          }
          nexts.push({ nr, nc, deg });
        }
      }
      nexts.sort((a, b) => a.deg - b.deg);
      for (const { nr, nc } of nexts) {
        board[nr * 8 + nc] = move;
        if (bt(nr, nc, move + 1)) return true;
        board[nr * 8 + nc] = -1;
      }
      return false;
    }
    board[0] = 0;
    return bt(0, 0, 1) ? board : null;
  }

  function animateSolution(sol) {
    return new Promise(resolve => {
      let step = 0;
      const id = setInterval(() => {
        if (step < 64) {
          const tmp = Array(64).fill(-1);
          for (let i = 0; i < 64; i++) if (sol[i] <= step) tmp[i] = sol[i];
          knightBoard = tmp; renderKnightBoard(); step++;
        } else {
          clearInterval(id); knightBoard = sol.slice(); renderKnightBoard(); resolve();
        }
      }, 28);
    });
  }

  window.openKnightModal  = openKnightModal;
  window.closeKnightModal = closeKnightModal;

  /* ================================================================
     LICHESS DAILY PUZZLE
     API: https://lichess.org/api/puzzle/daily  (no auth needed, CORS ok)
     Response shape: { game: { pgn, fen }, puzzle: { fen, rating, themes, id } }
     ================================================================ */
  async function fetchLichessDaily() {
    const res = await fetch('https://lichess.org/api/puzzle/daily', {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Lichess API ${res.status}`);
    return res.json();
  }

  let dailyInitialized = false;
  let dailyBoardEl = null;

  function openDailyModal() {
    const modal = document.getElementById('dailyModal');
    if (!modal) return;
    if (!dailyInitialized) {
      dailyBoardEl = document.getElementById('dailyBoard');
      createSquares(dailyBoardEl);
      const closeBtn  = document.getElementById('dailyCloseBtn');
      const backdrop  = document.querySelector('#dailyModal .modal-backdrop');
      if (closeBtn) closeBtn.addEventListener('click', closeDailyModal);
      if (backdrop) backdrop.addEventListener('click', closeDailyModal);
      dailyInitialized = true;
    }
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    loadDailyPuzzle();
  }

  function closeDailyModal() {
    const modal = document.getElementById('dailyModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function loadDailyPuzzle() {
    const titleEl  = document.getElementById('dailyPuzzleTitle');
    const descEl   = document.getElementById('dailyPuzzleDesc');
    const ratingEl = document.getElementById('dailyRating');
    const themesEl = document.getElementById('dailyThemes');
    const linkEl   = document.getElementById('dailyLink');

    if (titleEl)  titleEl.textContent = 'Loading…';
    if (descEl)   descEl.textContent  = 'Fetching today\'s puzzle from Lichess…';
    if (ratingEl) ratingEl.textContent = '—';
    if (themesEl) themesEl.textContent  = '—';
    clearPieces(dailyBoardEl);

    try {
      const data = await fetchLichessDaily();
      const puzzle = data.puzzle;
      const fen    = puzzle?.fen || data?.game?.fen || '';

      if (titleEl)  titleEl.textContent = `Puzzle #${puzzle?.id ?? '?'}`;
      if (descEl)   descEl.textContent  = puzzle?.plays
        ? `Played ${puzzle.plays.toLocaleString()} times · Find the best move!`
        : 'Find the best continuation for the position below.';
      if (ratingEl) ratingEl.textContent = String(puzzle?.rating ?? '?');
      if (themesEl) themesEl.textContent = (puzzle?.themes ?? []).slice(0, 3).join(', ') || '—';
      if (linkEl)   linkEl.href = `https://lichess.org/training/${puzzle?.id ?? ''}`;

      if (fen && dailyBoardEl) renderFromFEN(fen, dailyBoardEl);

    } catch (err) {
      console.error('Daily puzzle error:', err);
      if (titleEl) titleEl.textContent = 'Error';
      if (descEl)  descEl.textContent  = 'Could not load the daily puzzle. Check your internet connection.';
    }
  }

  window.openDailyModal  = openDailyModal;
  window.closeDailyModal = closeDailyModal;

  /* ================================================================
     RANDOM PUZZLE — Interactive board with legal-move highlighting
     Uses Lichess puzzle API: GET /api/puzzle/next (no auth needed)
     Solution stored as UCI move list e.g. ["e2e4","e7e5","f1c4"]
     The first move is the opponent's move (played automatically),
     then odd moves are the user's, even moves are the opponent's.
     ================================================================ */

  /* ── Minimal chess engine for move validation ── */

  // Board state: array[64], index = rank*8+file (rank 0=rank8 top)
  // piece strings: 'wP','bK', etc. null = empty
  const RC = (r, c) => r * 8 + c;
  const IDX = (sq) => { const f = sq.charCodeAt(0) - 97; const r = 8 - parseInt(sq[1]); return RC(r, f); };
  const SQ  = (idx) => String.fromCharCode(97 + (idx % 8)) + String(8 - Math.floor(idx / 8));

  // Parse FEN into board array + metadata
  function parseFEN(fen) {
    const parts = fen.split(' ');
    const rows  = parts[0].split('/');
    const board = Array(64).fill(null);
    const colorMap = { 'P':'wP','R':'wR','N':'wN','B':'wB','Q':'wQ','K':'wK',
                       'p':'bP','r':'bR','n':'bN','b':'bB','q':'bQ','k':'bK' };
    for (let r = 0; r < 8; r++) {
      let c = 0;
      for (const ch of rows[r]) {
        if (/[1-8]/.test(ch)) { c += +ch; }
        else { board[RC(r,c)] = colorMap[ch]; c++; }
      }
    }
    return {
      board,
      turn:     parts[1] === 'w' ? 'w' : 'b',
      castling: parts[2] || '-',
      ep:       parts[3] !== '-' ? IDX(parts[3]) : -1,
    };
  }

  // Apply a UCI move (e.g. "e2e4", "e1g1" for castling, "e7e8q" for promo)
  function applyUCI(state, uci) {
    const from = IDX(uci.slice(0,2));
    const to   = IDX(uci.slice(2,4));
    const promo= uci[4]; // q/r/b/n or undefined
    const { board, turn } = state;
    const piece = board[from];
    const newBoard = board.slice();
    const newCastle = state.castling;
    let newEP = -1;

    // Castling
    if (piece === 'wK' && from === IDX('e1')) {
      if (to === IDX('g1')) { newBoard[IDX('h1')] = null; newBoard[IDX('f1')] = 'wR'; }
      if (to === IDX('c1')) { newBoard[IDX('a1')] = null; newBoard[IDX('d1')] = 'wR'; }
    }
    if (piece === 'bK' && from === IDX('e8')) {
      if (to === IDX('g8')) { newBoard[IDX('h8')] = null; newBoard[IDX('f8')] = 'bR'; }
      if (to === IDX('c8')) { newBoard[IDX('a8')] = null; newBoard[IDX('d8')] = 'bR'; }
    }
    // En passant capture
    if ((piece === 'wP' || piece === 'bP') && to === state.ep) {
      const capRank = Math.floor(to / 8) + (piece === 'wP' ? 1 : -1);
      newBoard[RC(capRank, to % 8)] = null;
    }
    // Double pawn push → set EP square
    if (piece === 'wP' && Math.floor(from/8)===6 && Math.floor(to/8)===4) newEP = RC(5, to%8);
    if (piece === 'bP' && Math.floor(from/8)===1 && Math.floor(to/8)===3) newEP = RC(2, to%8);

    newBoard[to]   = promo ? (turn + promo.toUpperCase()) : piece;
    newBoard[from] = null;
    return { board: newBoard, turn: turn === 'w' ? 'b' : 'w', castling: newCastle, ep: newEP };
  }

  // Generate pseudo-legal destinations for a piece at `from`
  function destinations(state, from) {
    const { board, turn, ep } = state;
    const piece = board[from];
    if (!piece || piece[0] !== turn) return [];
    const dests = [];
    const type  = piece[1];
    const enemy = turn === 'w' ? 'b' : 'w';
    const r0 = Math.floor(from / 8), c0 = from % 8;

    const push = (r, c) => {
      if (r < 0 || r > 7 || c < 0 || c > 7) return false;
      const idx = RC(r,c);
      if (board[idx] && board[idx][0] === turn) return false; // own piece
      dests.push(idx);
      return !board[idx]; // true if square was empty (can slide further)
    };

    const slide = (dirs) => dirs.forEach(([dr,dc]) => {
      let r=r0+dr, c=c0+dc;
      while (r>=0&&r<=7&&c>=0&&c<=7) { if(!push(r,c)) break; r+=dr; c+=dc; }
    });

    if (type === 'P') {
      const dir = turn === 'w' ? -1 : 1;
      const start = turn === 'w' ? 6 : 1;
      // forward
      if (r0+dir>=0&&r0+dir<=7&&!board[RC(r0+dir,c0)]) {
        dests.push(RC(r0+dir,c0));
        if (r0===start && !board[RC(r0+2*dir,c0)]) dests.push(RC(r0+2*dir,c0));
      }
      // captures
      for (const dc of [-1,1]) {
        if (c0+dc<0||c0+dc>7) continue;
        const t=RC(r0+dir,c0+dc);
        if (board[t]?.[0]===enemy || t===ep) dests.push(t);
      }
    } else if (type === 'N') {
      [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]
        .forEach(([dr,dc]) => push(r0+dr,c0+dc));
    } else if (type === 'B') {
      slide([[1,1],[1,-1],[-1,1],[-1,-1]]);
    } else if (type === 'R') {
      slide([[1,0],[-1,0],[0,1],[0,-1]]);
    } else if (type === 'Q') {
      slide([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
    } else if (type === 'K') {
      [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
        .forEach(([dr,dc]) => push(r0+dr,c0+dc));
      // Castling (simplified: only checks empty squares, not check)
      if (turn==='w'&&from===IDX('e1')) {
        if (state.castling.includes('K')&&!board[IDX('f1')]&&!board[IDX('g1')]) dests.push(IDX('g1'));
        if (state.castling.includes('Q')&&!board[IDX('d1')]&&!board[IDX('c1')]&&!board[IDX('b1')]) dests.push(IDX('c1'));
      }
      if (turn==='b'&&from===IDX('e8')) {
        if (state.castling.includes('k')&&!board[IDX('f8')]&&!board[IDX('g8')]) dests.push(IDX('g8'));
        if (state.castling.includes('q')&&!board[IDX('d8')]&&!board[IDX('c8')]&&!board[IDX('b8')]) dests.push(IDX('c8'));
      }
    }
    return dests;
  }

  /* ── Random Puzzle state ── */
  let rndState       = null;   // current chess position state
  let rndSolution    = [];     // full UCI move list from Lichess
  let rndMoveIdx     = 0;      // which move we're expecting next from user
  let rndSelected    = -1;     // currently selected square index (-1 = none)
  let rndLegalDests  = [];     // legal destinations for selected piece
  let rndLastFrom    = -1;
  let rndLastTo      = -1;
  let rndPuzzleId    = '';
  let rndInitialized = false;
  let rndBoardEl     = null;
  let rndSolved      = false;

  async function fetchRandomPuzzle() {
    // Lichess random puzzle endpoint — no auth, CORS open
    const res = await fetch('https://lichess.org/api/puzzle/next', {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Lichess ${res.status}`);
    return res.json();
  }

  function openRandomModal() {
    const modal = document.getElementById('randomModal');
    if (!modal) return;
    if (!rndInitialized) initRandomModal();
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    loadRandomPuzzle();
  }
  function closeRandomModal() {
    const modal = document.getElementById('randomModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
  }

  function initRandomModal() {
    rndInitialized = true;
    rndBoardEl = document.getElementById('randomBoard');
    createSquares(rndBoardEl);

    // Wire square clicks
    Array.from(rndBoardEl.children).forEach((sq, idx) => {
      sq.addEventListener('click', () => onRandomSquareClick(idx));
    });

    document.getElementById('randomCloseBtn')?.addEventListener('click', closeRandomModal);
    document.getElementById('randomCloseFooter')?.addEventListener('click', closeRandomModal);
    document.querySelector('#randomModal .modal-backdrop')?.addEventListener('click', closeRandomModal);
    document.getElementById('randomNewBtn')?.addEventListener('click', loadRandomPuzzle);
    document.getElementById('randomRetryBtn')?.addEventListener('click', retryRandomPuzzle);
    document.getElementById('randomSolutionBtn')?.addEventListener('click', showRandomSolution);
  }

  async function loadRandomPuzzle() {
    setRandomFeedback('', '');
    setRandomDesc('Fetching puzzle from Lichess…');
    document.getElementById('randomPuzzleTitle').textContent = 'Loading…';
    clearPieces(rndBoardEl);
    rndSelected = -1; rndLegalDests = []; rndSolved = false;

    try {
      const data = await fetchRandomPuzzle();
      const puzzle = data.puzzle;
      const initialFen = data.game?.fen || puzzle?.fen;

      rndPuzzleId   = puzzle?.id ?? '?';
      rndSolution   = puzzle?.solution ?? [];   // UCI moves: first = opponent's move
      rndMoveIdx    = 0;
      rndLastFrom   = -1; rndLastTo = -1;

      // Parse the initial FEN (position BEFORE the puzzle starts)
      rndState = parseFEN(initialFen);

      document.getElementById('randomPuzzleTitle').textContent = `Puzzle #${rndPuzzleId}`;
      document.getElementById('randomRating').textContent      = String(puzzle?.rating ?? '?');
      document.getElementById('randomThemes').textContent      = (puzzle?.themes ?? []).slice(0,3).join(', ') || '—';
      document.getElementById('randomMoveTotal').textContent   = String(Math.ceil((rndSolution.length - 1) / 2));
      document.getElementById('randomMoveNum').textContent     = '0';

      renderRandomBoard();
      updateTurnLabel();

      // Play opponent's first move automatically after a short delay
      setTimeout(() => playOpponentMove(), 700);

    } catch(e) {
      console.error('Random puzzle error:', e);
      setRandomDesc('Could not load puzzle — check your connection.');
      document.getElementById('randomPuzzleTitle').textContent = 'Error';
    }
  }

  function retryRandomPuzzle() {
    if (!rndSolution.length) return;
    // Replay opponent's first move from scratch
    const initialFen = rndState._initialFen;
    if (!initialFen) { loadRandomPuzzle(); return; }
    rndState    = parseFEN(initialFen);
    rndMoveIdx  = 0;
    rndSelected = -1; rndLegalDests = []; rndSolved = false;
    rndLastFrom = -1; rndLastTo = -1;
    setRandomFeedback('', '');
    renderRandomBoard();
    updateTurnLabel();
    setTimeout(() => playOpponentMove(), 500);
  }

  function playOpponentMove() {
    if (rndMoveIdx >= rndSolution.length) return;
    const uci  = rndSolution[rndMoveIdx];
    rndLastFrom = IDX(uci.slice(0,2));
    rndLastTo   = IDX(uci.slice(2,4));

    // Store initial FEN for retry (after first opponent move index is 0)
    if (rndMoveIdx === 0) rndState._initialFen = fenFromState(rndState);

    rndState = applyUCI(rndState, uci);
    rndMoveIdx++;
    renderRandomBoard();
    updateTurnLabel();
    setRandomDesc('Your turn — find the best move!');
    setRandomFeedback('', '');
  }

  function onRandomSquareClick(idx) {
    if (rndSolved) return;
    if (rndMoveIdx >= rndSolution.length) return;

    const sq    = rndBoardEl.children[idx];
    const piece = rndState.board[idx];

    // If a piece is already selected, try to move
    if (rndSelected >= 0) {
      if (rndLegalDests.includes(idx)) {
        attemptMove(rndSelected, idx);
        return;
      }
      // Clicked own piece — reselect
      if (piece && piece[0] === rndState.turn) {
        selectSquare(idx);
        return;
      }
      // Clicked elsewhere — deselect
      deselectAll();
      return;
    }

    // Nothing selected — select own piece
    if (piece && piece[0] === rndState.turn) {
      selectSquare(idx);
    }
  }

  function selectSquare(idx) {
    deselectAll();
    rndSelected   = idx;
    rndLegalDests = destinations(rndState, idx);
    rndBoardEl.children[idx].classList.add('selected');
    rndLegalDests.forEach(d => {
      const dsq = rndBoardEl.children[d];
      dsq.classList.add('legal-target');
      if (rndState.board[d]) dsq.classList.add('has-piece');
    });
  }

  function deselectAll() {
    rndSelected = -1; rndLegalDests = [];
    Array.from(rndBoardEl.children).forEach(sq => {
      sq.classList.remove('selected','legal-target','has-piece');
    });
  }

  function attemptMove(from, to) {
    const uci         = SQ(from) + SQ(to);
    const expectedUCI = rndSolution[rndMoveIdx];

    // Normalise: ignore promotion suffix for comparison unless specified
    const normalise = s => s.slice(0,4);
    const correct   = normalise(uci) === normalise(expectedUCI);

    deselectAll();

    if (correct) {
      // Apply user move
      rndLastFrom = from; rndLastTo = to;
      rndState    = applyUCI(rndState, expectedUCI); // use full UCI (incl promo)
      rndMoveIdx++;
      renderRandomBoard();

      const userMoveNum = Math.ceil(rndMoveIdx / 2);
      document.getElementById('randomMoveNum').textContent = String(userMoveNum);

      if (rndMoveIdx >= rndSolution.length) {
        // Puzzle complete!
        rndSolved = true;
        setRandomFeedback('✓ Puzzle solved! Excellent!', 'correct');
        setRandomDesc('You found all the best moves!');
        flashSquare(to, 'correct');
        return;
      }

      setRandomFeedback('✓ Correct! Opponent is thinking…', 'correct');
      flashSquare(to, 'correct');

      // Play opponent's reply after a delay
      setTimeout(() => playOpponentMove(), 900);

    } else {
      // Wrong move — flash red, keep position
      setRandomFeedback('✗ Not the best move — try again!', 'wrong');
      flashSquare(to, 'wrong');
    }
  }

  function showRandomSolution() {
    if (!rndSolution.length) return;
    // Play all remaining moves at 600ms intervals
    let i = rndMoveIdx;
    setRandomFeedback('Showing solution…', '');
    rndSolved = true;
    deselectAll();

    function next() {
      if (i >= rndSolution.length) {
        setRandomFeedback('✓ Solution complete!', 'correct');
        return;
      }
      const uci = rndSolution[i];
      rndLastFrom = IDX(uci.slice(0,2));
      rndLastTo   = IDX(uci.slice(2,4));
      rndState = applyUCI(rndState, uci);
      i++;
      renderRandomBoard();
      setTimeout(next, 650);
    }
    setTimeout(next, 200);
  }

  function renderRandomBoard() {
    clearPieces(rndBoardEl);
    // Clear highlights
    Array.from(rndBoardEl.children).forEach(sq =>
      sq.classList.remove('last-from','last-to','selected','legal-target','has-piece')
    );
    // Last move highlights
    if (rndLastFrom >= 0) rndBoardEl.children[rndLastFrom].classList.add('last-from');
    if (rndLastTo   >= 0) rndBoardEl.children[rndLastTo].classList.add('last-to');
    // Place pieces
    rndState.board.forEach((piece, idx) => {
      if (!piece) return;
      const img = makePieceImg(piece[1] === piece[1].toUpperCase()
        ? (piece[0]==='w' ? piece[1] : piece[1].toLowerCase())
        : piece[1],
        '82%'
      );
      // makePieceImg expects FEN char: uppercase = white, lowercase = black
      const fenChar = piece[0]==='w' ? piece[1].toUpperCase() : piece[1].toLowerCase();
      const img2 = makePieceImg(fenChar, '82%');
      if (img2) rndBoardEl.children[idx].appendChild(img2);
    });
  }

  function updateTurnLabel() {
    const label = document.getElementById('randomTurnLabel');
    if (!label) return;
    const t = rndState.turn;
    label.textContent  = t === 'w' ? '⬜ White to move' : '⬛ Black to move';
    label.style.color  = t === 'w' ? '#e8d5b0' : '#b58863';
  }

  function setRandomFeedback(msg, type) {
    const el = document.getElementById('randomFeedback');
    if (!el) return;
    el.textContent    = msg;
    el.style.opacity  = msg ? '1' : '0';
    el.style.background = type === 'correct'
      ? 'rgba(82,201,122,0.12)'
      : type === 'wrong'
      ? 'rgba(224,82,82,0.12)'
      : 'transparent';
    el.style.color = type === 'correct' ? '#52c97a'
      : type === 'wrong' ? '#e05252'
      : 'var(--text-dim)';
    el.style.border = type
      ? `1px solid ${type==='correct' ? 'rgba(82,201,122,0.3)' : 'rgba(224,82,82,0.3)'}`
      : 'none';
  }

  function setRandomDesc(msg) {
    const el = document.getElementById('randomPuzzleDesc');
    if (el) el.textContent = msg;
  }

  function flashSquare(idx, type) {
    const sq = rndBoardEl.children[idx];
    if (!sq) return;
    const cls = type === 'correct' ? 'flash-correct' : 'flash-wrong';
    sq.classList.remove('flash-correct','flash-wrong');
    void sq.offsetWidth; // reflow to restart animation
    sq.classList.add(cls);
    setTimeout(() => sq.classList.remove(cls), 600);
  }

  // Minimal FEN serializer (for retry — placement + turn only)
  function fenFromState(state) {
    const pieceToFen = p =>
      p[0]==='w' ? p[1].toUpperCase() : p[1].toLowerCase();
    let fen = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const p = state.board[RC(r,c)];
        if (p) { if (empty) { fen += empty; empty=0; } fen += pieceToFen(p); }
        else empty++;
      }
      if (empty) fen += empty;
      if (r < 7) fen += '/';
    }
    return fen + ' ' + state.turn + ' ' + state.castling + ' - 0 1';
  }

  window.openRandomModal  = openRandomModal;
  window.closeRandomModal = closeRandomModal;

  /* ================================================================
     TOAST NOTIFICATION
     ================================================================ */
  function showToast(msg, isError = false) {
    let toast = document.getElementById('keenToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'keenToast';
      toast.style.cssText = `
        position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
        background:#1a2535; border:1px solid rgba(201,168,76,0.3);
        color:#e8e2d5; font-family:'DM Mono',monospace; font-size:0.78rem;
        padding:10px 20px; border-radius:8px; z-index:9999;
        box-shadow:0 8px 32px rgba(0,0,0,0.6); max-width:90vw; text-align:center;
        transition:opacity 0.3s;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.borderColor = isError ? 'rgba(224,82,82,0.4)' : 'rgba(201,168,76,0.3)';
    toast.style.opacity = '1';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 3500);
  }

})();