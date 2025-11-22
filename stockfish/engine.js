// Lightweight Stockfish engine helper
// Exposes startEngine(), stopEngine(), sendCommand(cmd) and getStockfishFeatures()

let sfWorker = null;
let readyPromise = null;

export function startEngine() {
    if (sfWorker) return sfWorker;
    // Try to create Stockfish worker from global Stockfish if available
    try {
        // The CDN exposes "Stockfish" as a constructor in some builds
        if (typeof Stockfish === 'function') {
            // Create worker-like wrapper
            sfWorker = Stockfish();
        } else if (typeof stockfish === 'function') {
            sfWorker = stockfish();
        } else if (typeof Worker !== 'undefined') {
            // Fall back to loading an included worker file (try several common names)
            const candidates = ['./stockfish.wasm.js', './stockfish.js', './stockfish/stockfish.js'];
            for (const c of candidates) {
                try {
                    sfWorker = new Worker(c);
                    break;
                } catch (e) {
                    // try next
                }
            }
        }
    } catch (e) {
        console.warn('Could not create Stockfish worker:', e);
        sfWorker = null;
    }

    return sfWorker;
}

export function stopEngine() {
    if (!sfWorker) return;
    try {
        if (sfWorker.terminate) sfWorker.terminate();
    } catch (e) { /* ignore */ }
    sfWorker = null;
}

function sendCommand(worker, cmd) {
    return new Promise((resolve, reject) => {
        if (!worker) return resolve(null);
        const onmsg = (e) => {
            const d = e && e.data ? e.data.toString() : String(e);
            resolve(d);
            worker.removeEventListener('message', onmsg);
        };
        // small timeout to avoid hanging if worker doesn't respond
        const timer = setTimeout(() => {
            worker.removeEventListener('message', onmsg);
            resolve(null);
        }, 3000);
        worker.addEventListener('message', onmsg);
        try { worker.postMessage(cmd); } catch (err) { clearTimeout(timer); reject(err); }
    });
}

function waitForSubstring(worker, substring, timeout = 3000) {
    return new Promise((resolve) => {
        if (!worker) return resolve(false);
        const onmsg = (e) => {
            const d = e && e.data ? e.data.toString() : String(e);
            if (d.indexOf(substring) !== -1) {
                clearTimeout(timer);
                worker.removeEventListener('message', onmsg);
                resolve(true);
            }
        };
        worker.addEventListener('message', onmsg);
        const timer = setTimeout(() => {
            try { worker.removeEventListener('message', onmsg); } catch (e) {}
            resolve(false);
        }, timeout);
    });
}

/**
 * Send an arbitrary UCI command and optionally wait for a response substring.
 * Returns the raw response lines collected (if any) or null.
 */
export async function sendUCICommand(cmd, waitFor = null, timeout = 3000) {
    const worker = startEngine();
    if (!worker) return null;
    const lines = [];
    const collector = (e) => { lines.push(e && e.data ? e.data.toString() : String(e)); };
    worker.addEventListener('message', collector);
    try {
        worker.postMessage(cmd);
    } catch (e) {
        worker.removeEventListener('message', collector);
        return null;
    }
    if (waitFor) {
        await waitForSubstring(worker, waitFor, timeout);
    } else {
        // small delay to allow immediate responses to be collected
        await new Promise(r => setTimeout(r, 120));
    }
    worker.removeEventListener('message', collector);
    return lines;
}

// Parse id/option lines returned by UCI
function parseUCIInfo(lines) {
    const result = { id: {}, options: {} };
    lines.forEach(line => {
        if (!line) return;
        const parts = line.trim().split(/\s+/);
        if (parts[0] === 'id') {
            // id name Stockfish 15
            const key = parts[1];
            const value = parts.slice(2).join(' ');
            result.id[key] = value;
        } else if (parts[0] === 'option') {
            // option name Hash type spin default 1 min 1 max 128
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

export async function getStockfishFeatures(timeout = 3000) {
    const worker = startEngine();
    if (!worker) return { error: 'no-worker' };

    // Run 'uci' and wait for 'uciok' while collecting response lines
    const uciLines = await sendUCICommand('uci', 'uciok', timeout) || [];
    const uciOk = uciLines.some(l => typeof l === 'string' && l.indexOf('uciok') !== -1);

    // Ask engine to become ready
    const readyLines = await sendUCICommand('isready', 'readyok', timeout) || [];
    const ready = readyLines.some(l => typeof l === 'string' && l.indexOf('readyok') !== -1);

    const allLines = uciLines.concat(readyLines);
    const parsed = parseUCIInfo(allLines);

    return { uciOk, ready, parsed, raw: allLines };
}
