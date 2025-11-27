// Simple static board renderer. No movement, no handlers.
// Renders pieces from a FEN (placement) string or default starting position.
(function(){
  const boardEl = document.getElementById('staticBoard');
  if(!boardEl) return;

  // Create 8x8 squares
  function createSquares(){
    boardEl.innerHTML = '';
    for(let r=0;r<8;r++){
      for(let c=0;c<8;c++){
        const sq=document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        sq.className = 'square ' + (isLight ? 'light':'dark');
        sq.dataset.row = r; sq.dataset.col=c;
        // add coordinates for bottom-left file and top-left rank visually only on edges
        if(r===7){
          const file = document.createElement('div');
          file.className='coord-file';
          file.textContent = String.fromCharCode(97 + c);
          sq.appendChild(file);
        }
        if(c===0){
          const rank = document.createElement('div');
          rank.className='coord-rank';
          rank.textContent = 8 - r;
          sq.appendChild(rank);
        }
        boardEl.appendChild(sq);
      }
    }
  }

  // Map piece letters to unicode pieces used in the project
  const glyphs = {
    'P': {cls:'white',sym:'♙'}, 'R':{cls:'white',sym:'♖'}, 'N':{cls:'white',sym:'♘'}, 'B':{cls:'white',sym:'♗'}, 'Q':{cls:'white',sym:'♕'}, 'K':{cls:'white',sym:'♔'},
    'p': {cls:'black',sym:'♟'}, 'r':{cls:'black',sym:'♜'}, 'n':{cls:'black',sym:'♞'}, 'b':{cls:'black',sym:'♝'}, 'q':{cls:'black',sym:'♛'}, 'k':{cls:'black',sym:'♚'}
  };

  function clearPieces(){
    const squares = boardEl.querySelectorAll('.square');
    squares.forEach(sq=>sq.textContent='');
  }

  // place pieces using placement-only FEN (first field); accepts full FEN too
  function renderFromFEN(fen){
    if(!fen) fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    const placement = fen.split(' ')[0];
    const rows = placement.split('/');
    if(rows.length!==8) return;
    clearPieces();
    for(let r=0;r<8;r++){
      const row = rows[r];
      let c=0;
      for(let i=0;i<row.length;i++){
        const ch = row[i];
        if(/[1-8]/.test(ch)){
          c += parseInt(ch,10);
          continue;
        }
        if(c>=8) continue;
          const squareIndex = r*8 + c;
          const sq = boardEl.children[squareIndex];
        const info = glyphs[ch];
        if(info){
          const el = document.createElement('div');
          el.className = 'piece ' + info.cls;
          el.textContent = info.sym;
          // keep coordinates intact, append piece before coords
          // remove any existing piece child (should be none)
          sq.appendChild(el);
        }
        c++;
      }
    }
  }

  // initialize
  createSquares();
  // default starting position
  renderFromFEN();

  // Safety check: ensure there are exactly 64 grid children; remove extras if any
  (function ensure64(){
    const children = boardEl.children;
    if (children.length === 64) return;
    console.warn('Static board had', children.length, 'children; cleaning up to 64.');
    // Remove any extra nodes beyond 64
    for (let i = children.length - 1; i >= 64; i--) {
      boardEl.removeChild(children[i]);
    }
  })();

  // expose helper (non-interactive) to change the displayed position if needed
  window.renderStaticPosition = renderFromFEN;

  // Navigation handlers for left nav
  function setActive(buttonId){
    const items = document.querySelectorAll('.left-nav .nav-item');
    items.forEach(it => {
      it.classList.toggle('active', it.id === buttonId);
      it.setAttribute('aria-pressed', it.id === buttonId ? 'true' : 'false');
    });
  }

  function wireNav(){
    const home = document.getElementById('navHomeBtn');
    const play = document.getElementById('navPlayBtn');
    const puzzle = document.getElementById('navPuzzleBtn');
    const puzzleMenu = document.getElementById('puzzleMenu');
    const puzzle8 = document.getElementById('navPuzzle8Btn');
    const puzzleKnight = document.getElementById('navPuzzleKnightBtn');
    const news = document.getElementById('navNewsBtn');
    const learn = document.getElementById('navLearnBtn');
    const watch = document.getElementById('navWatchBtn');
    const logout = document.getElementById('navLogoutBtn');

    if(home){
      home.addEventListener('click', ()=>{
        setActive('navHomeBtn');
        // show static board (default starting pos)
        renderFromFEN();
      });
    }
    if(play){
      play.addEventListener('click', ()=>{
        setActive('navPlayBtn');
        // navigate to the interactive game page (same folder)
        window.location.href = 'chessgame.html';
      });
    }
    if(puzzle){
      puzzle.addEventListener('click', ()=>{
        // Toggle puzzle submenu visibility
        if (puzzleMenu) {
          const isHidden = puzzleMenu.classList.contains('hidden');
          // hide any other menus (if required) then toggle
          if (isHidden) {
            puzzleMenu.classList.remove('hidden');
            puzzleMenu.setAttribute('aria-hidden','false');
          } else {
            puzzleMenu.classList.add('hidden');
            puzzleMenu.setAttribute('aria-hidden','true');
          }
        } else {
          setActive('navPuzzleBtn');
          alert('Puzzles section not implemented yet.');
        }
      });
      // handle puzzle menu actions
      if (puzzle8) {
          puzzle8.addEventListener('click', ()=>{
            setActive('navPuzzleBtn');
            // open 8-queens modal within this static interface
            try { openEightModal(); } catch(e){
              console.warn('openEightModal not available', e);
              // fallback: redirect to interactive page
              try { localStorage.setItem('open_puzzle','eight'); } catch(_){}
              window.location.href = 'chessgame.html';
            }
          });
      }
      if (puzzleKnight) {
          puzzleKnight.addEventListener('click', ()=>{
            setActive('navPuzzleBtn');
            // open knight placeholder in interactive page for now
            try { localStorage.setItem('open_puzzle', 'knight'); } catch(e){}
            window.location.href = 'chessgame.html';
          });
      }
    }
    if(news){
      news.addEventListener('click', ()=>{
        setActive('navNewsBtn');
        alert('News section not implemented yet.');
      });
    }
    if(learn){
      learn.addEventListener('click', ()=>{
        setActive('navLearnBtn');
        alert('Learn section not implemented yet.');
      });
    }
    if(watch){
      watch.addEventListener('click', ()=>{
        setActive('navWatchBtn');
        alert('Watch section not implemented yet.');
      });
    }
    if(logout){
      logout.addEventListener('click', async ()=>{
        // Ask for confirmation
        const ok = confirm('Are you sure you want to log out?');
        if (!ok) return;
        setActive('navLogoutBtn');

        // Clear stored chess user data
        try {
          sessionStorage.removeItem('chess_user_id');
          sessionStorage.removeItem('chess_user_email');
          sessionStorage.removeItem('chess_user_name');
          sessionStorage.removeItem('chess_user_photo');

          localStorage.removeItem('chess_user_id');
          localStorage.removeItem('chess_user_email');
          localStorage.removeItem('chess_user_name');
          localStorage.removeItem('chess_user_photo');
        } catch (e) {
          console.warn('Failed to clear storage during logout', e);
        }

        // Attempt Firebase sign-out if available
        try {
          if (window.FirebaseAuth && typeof window.FirebaseAuth.signOut === 'function') {
            await window.FirebaseAuth.signOut();
          } else if (window.firebase && window.firebase.auth && typeof window.firebase.auth === 'function') {
            // older firebase global
            await window.firebase.auth().signOut();
          }
        } catch (err) {
          console.warn('Firebase sign out failed (continuing):', err);
        }

        // Redirect back to login page
        try {
          window.location.href = 'chesslogin.html';
        } catch (err) {
          console.error('Redirect to login failed:', err);
          try { window.location.replace('chesslogin.html'); } catch(e) { /* ignore */ }
        }
      });
    }
  }

  // wire nav on next tick (DOM now has nav)
  setTimeout(wireNav, 10);

  // ---------------- 8-Queens modal logic for static page ----------------
  let eightInitialized = false;
  let eightState = Array(8).fill(-1); // row -> col or -1

  function openEightModal(){
    if (!eightInitialized) initEightModal();
    const modal = document.getElementById('eightModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    renderEightBoard();
  }

  function closeEightModal(){
    const modal = document.getElementById('eightModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
  }

  function initEightModal(){
    eightInitialized = true;
    // build 8x8 squares
    const container = document.getElementById('eightStaticBoard');
    if (!container) return;
    container.innerHTML = '';
    for (let r=0;r<8;r++){
      for (let c=0;c<8;c++){
        const sq = document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        sq.className = 'eq-square ' + (isLight ? 'light' : 'dark');
        sq.dataset.row = r; sq.dataset.col = c;
        sq.addEventListener('click', ()=>{
          toggleQueen(r,c);
          renderEightBoard();
        });
        container.appendChild(sq);
      }
    }

    // wire controls
    const solveBtn = document.getElementById('eightSolveBtn');
    const clearBtn = document.getElementById('eightClearBtn');
    const closeBtn = document.getElementById('eightCloseBtn');
    const closeFooter = document.getElementById('eightCloseFooterBtn');
    const prevBtn = document.getElementById('eightPrevBtn');
    const nextBtn = document.getElementById('eightNextBtn');
    if (solveBtn) solveBtn.addEventListener('click', ()=>{
      const sols = solveAllEight();
      if (sols && sols.length>0) {
        eightSolutions = sols;
        eightSolutionIndex = 0;
        eightState = eightSolutions[0].slice();
        renderEightBoard();
        updateSolutionCounter();
      } else alert('No solution found');
    });
    if (clearBtn) clearBtn.addEventListener('click', ()=>{ eightState = Array(8).fill(-1); eightSolutions=[]; eightSolutionIndex=-1; renderEightBoard(); updateSolutionCounter(); });
    if (closeBtn) closeBtn.addEventListener('click', closeEightModal);
    if (closeFooter) closeFooter.addEventListener('click', closeEightModal);
    if (prevBtn) prevBtn.addEventListener('click', ()=>{ if (eightSolutions.length>0){ eightSolutionIndex = (eightSolutionIndex -1 + eightSolutions.length)%eightSolutions.length; eightState = eightSolutions[eightSolutionIndex].slice(); renderEightBoard(); updateSolutionCounter(); } });
    if (nextBtn) nextBtn.addEventListener('click', ()=>{ if (eightSolutions.length>0){ eightSolutionIndex = (eightSolutionIndex +1)%eightSolutions.length; eightState = eightSolutions[eightSolutionIndex].slice(); renderEightBoard(); updateSolutionCounter(); } });
  }

  function renderEightBoard(){
    const container = document.getElementById('eightStaticBoard');
    if (!container) return;
    const squares = container.children;
    // Compute placed queens list
    const placed = [];
    for (let r=0;r<8;r++){
      const c = eightState[r];
      if (c>=0) placed.push({r,c});
    }

    // mark conflicts: for each placed queen check against others
    const conflicts = new Set(); // store keys like 'r,c' for conflicting queens
    for (let i=0;i<placed.length;i++){
      for (let j=i+1;j<placed.length;j++){
        const a = placed[i], b = placed[j];
        if (a.c === b.c || Math.abs(a.r - b.r) === Math.abs(a.c - b.c)){
          conflicts.add(a.r + ',' + a.c);
          conflicts.add(b.r + ',' + b.c);
        }
      }
    }

    // Render grid and apply classes
    for (let r=0;r<8;r++){
      for (let c=0;c<8;c++){
        const i = r*8 + c;
        const sq = squares[i];
        sq.innerHTML = '';
        if (eightState[r] === c){
          const q = document.createElement('div');
          const key = r + ',' + c;
          const isConflict = conflicts.has(key);
          q.className = 'queen ' + (isConflict ? 'conflict' : 'ok');
          q.setAttribute('aria-label', isConflict ? 'conflicting queen' : 'valid queen');
          q.textContent = '♛';
          sq.appendChild(q);
        }
      }
    }

    const count = eightState.filter(x=>x>=0).length;
    const countEl = document.getElementById('eightCount'); if (countEl) countEl.textContent = String(count);
  }

  function toggleQueen(r,c){
    if (eightState[r] === c) { eightState[r] = -1; return; }
    // enforce at most one per row (we toggle per row)
    eightState[r] = c;
  }

  // Solve 8-queens (return first solution as array of 8 cols)
  function solveEight(){
    const N = 8;
    const cols = new Set();
    const diag1 = new Set();
    const diag2 = new Set();
    const sol = Array(N).fill(-1);
    let found = null;

    function backtrack(r){
      if (r === N) { found = sol.slice(); return true; }
      for (let c=0;c<N;c++){
        if (cols.has(c) || diag1.has(r-c) || diag2.has(r+c)) continue;
        cols.add(c); diag1.add(r-c); diag2.add(r+c); sol[r]=c;
        if (backtrack(r+1)) return true;
        cols.delete(c); diag1.delete(r-c); diag2.delete(r+c); sol[r]=-1;
      }
      return false;
    }

    backtrack(0);
    return found;
  }

  // Find all solutions (returns array of solutions where each is array of columns)
  function solveAllEight(){
    const N = 8;
    const cols = new Set();
    const diag1 = new Set();
    const diag2 = new Set();
    const sol = Array(N).fill(-1);
    const results = [];

    function backtrack(r){
      if (r === N) { results.push(sol.slice()); return; }
      for (let c=0;c<N;c++){
        if (cols.has(c) || diag1.has(r-c) || diag2.has(r+c)) continue;
        cols.add(c); diag1.add(r-c); diag2.add(r+c); sol[r]=c;
        backtrack(r+1);
        cols.delete(c); diag1.delete(r-c); diag2.delete(r+c); sol[r]=-1;
      }
    }

    backtrack(0);
    return results;
  }

  function updateSolutionCounter(){
    const idxEl = document.getElementById('eightSolutionIdx');
    const totalEl = document.getElementById('eightSolutionsTotal');
    if (!idxEl || !totalEl) return;
    if (!eightSolutions || eightSolutions.length===0){ idxEl.textContent='-'; totalEl.textContent='-'; return; }
    idxEl.textContent = String(eightSolutionIndex+1);
    totalEl.textContent = String(eightSolutions.length);
  }

  // internal storage for multiple solutions
  let eightSolutions = [];
  let eightSolutionIndex = -1;

  // Expose for debugging if needed
  window.openEightModal = openEightModal;
  window.closeEightModal = closeEightModal;
})();
