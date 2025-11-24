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
        setActive('navPuzzleBtn');
        // show a puzzle modal or static puzzle view (placeholder)
        alert('Puzzles section not implemented yet.');
      });
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
      logout.addEventListener('click', ()=>{
        setActive('navLogoutBtn');
        alert('Logout pressed (placeholder)');
      });
    }
  }

  // wire nav on next tick (DOM now has nav)
  setTimeout(wireNav, 10);
})();
