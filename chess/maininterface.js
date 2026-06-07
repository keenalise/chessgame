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