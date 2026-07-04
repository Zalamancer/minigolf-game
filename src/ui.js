// src/ui.js
// Self-contained 2D HUD overlay for a 3D minigolf game.
// No imports. No external assets. Injects its own <style> on construction.

const STYLE_ID = 'mg-ui-styles';

const CSS = `
:root {
  --mg-green-dark: #1f5c2e;
  --mg-green: #2e8b3e;
  --mg-green-light: #6fbf73;
  --mg-sand: #e8d3a0;
  --mg-sand-dark: #d8b873;
  --mg-sky: #8fd3f4;
  --mg-sky-dark: #4fa8d8;
  --mg-cream: #fff8ec;
  --mg-ink: #1c2b1f;
  --mg-shadow: rgba(20, 40, 20, 0.35);
}

.mg-root {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  pointer-events: none;
  font-family: 'Segoe UI', 'Trebuchet MS', Verdana, system-ui, -apple-system, sans-serif;
  color: var(--mg-ink);
  -webkit-font-smoothing: antialiased;
  text-shadow: none;
}

.mg-root * {
  box-sizing: border-box;
}

/* ---------- Persistent HUD: hole info + strokes ---------- */

.mg-hud-top {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  display: flex;
  gap: 10px;
  align-items: center;
}

.mg-pill {
  background: rgba(255, 248, 236, 0.9);
  border: 2px solid var(--mg-sand-dark);
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 10px var(--mg-shadow);
  white-space: nowrap;
}

.mg-hud-strokes {
  position: absolute;
  top: 16px;
  right: 16px;
  pointer-events: none;
  background: rgba(31, 92, 46, 0.92);
  color: var(--mg-cream);
  border-radius: 14px;
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 4px 10px var(--mg-shadow);
  letter-spacing: 0.3px;
}

/* ---------- Power meter ---------- */

.mg-power-wrap {
  position: absolute;
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%);
  width: 240px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.mg-power-wrap.mg-visible {
  opacity: 1;
}

.mg-power-track {
  width: 100%;
  height: 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
  border: 2px solid rgba(255, 255, 255, 0.6);
  overflow: hidden;
  box-shadow: 0 3px 8px var(--mg-shadow);
}

.mg-power-fill {
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6fbf73 0%, #e8d34a 60%, #e0552f 100%);
  transition: width 0.03s linear;
}

.mg-power-label {
  text-align: center;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--mg-cream);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* ---------- Toast / message ---------- */

.mg-toast {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  pointer-events: none;
  background: rgba(28, 43, 31, 0.92);
  color: var(--mg-cream);
  padding: 10px 22px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 4px 14px var(--mg-shadow);
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  max-width: 80vw;
  text-align: center;
}

.mg-toast.mg-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ---------- Modal overlay panels ---------- */

.mg-overlay {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(20, 50, 25, 0.35) 0%, rgba(10, 30, 15, 0.55) 100%);
}

.mg-overlay.mg-visible {
  display: flex;
  pointer-events: auto;
}

.mg-card {
  pointer-events: auto;
  background: linear-gradient(180deg, var(--mg-cream) 0%, #fdf3da 100%);
  border-radius: 22px;
  padding: 32px 36px;
  min-width: 320px;
  max-width: 92vw;
  box-shadow: 0 18px 40px var(--mg-shadow), 0 2px 0 rgba(255, 255, 255, 0.6) inset;
  border: 3px solid var(--mg-sand-dark);
  text-align: center;
  transform: scale(0.92) translateY(10px);
  opacity: 0;
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.18s ease;
}

.mg-overlay.mg-visible .mg-card {
  transform: scale(1) translateY(0);
  opacity: 1;
}

.mg-card h1 {
  margin: 0 0 6px;
  font-size: 30px;
  color: var(--mg-green-dark);
  letter-spacing: 0.5px;
}

.mg-card h2 {
  margin: 0 0 14px;
  font-size: 24px;
  color: var(--mg-green-dark);
}

.mg-card p.mg-desc {
  margin: 0 0 22px;
  font-size: 14px;
  color: #5a5040;
}

.mg-btn {
  pointer-events: auto;
  cursor: pointer;
  border: none;
  border-radius: 999px;
  padding: 13px 34px;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  color: #fff;
  background: linear-gradient(180deg, var(--mg-green-light) 0%, var(--mg-green) 60%, var(--mg-green-dark) 100%);
  box-shadow: 0 5px 0 var(--mg-green-dark), 0 8px 14px var(--mg-shadow);
  transition: transform 0.08s ease, box-shadow 0.08s ease;
  letter-spacing: 0.3px;
}

.mg-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 7px 0 var(--mg-green-dark), 0 10px 16px var(--mg-shadow);
}

.mg-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--mg-green-dark), 0 4px 8px var(--mg-shadow);
}

/* ---------- Start screen specifics ---------- */

.mg-start-emoji {
  font-size: 46px;
  margin-bottom: 4px;
}

/* ---------- Hole complete specifics ---------- */

.mg-result-badge {
  display: inline-block;
  font-size: 18px;
  font-weight: 800;
  padding: 6px 18px;
  border-radius: 999px;
  margin: 4px 0 18px;
  background: var(--mg-sky);
  color: #073b54;
  border: 2px solid var(--mg-sky-dark);
}

.mg-result-badge.mg-great {
  background: #ffe08a;
  border-color: #e0b23a;
  color: #5c3d00;
}

.mg-result-badge.mg-bad {
  background: #f3b9a8;
  border-color: #d97a5e;
  color: #5c1d00;
}

.mg-stat-row {
  display: flex;
  justify-content: center;
  gap: 28px;
  margin-bottom: 6px;
  font-size: 14px;
  color: #5a5040;
}

.mg-stat-row b {
  display: block;
  font-size: 22px;
  color: var(--mg-green-dark);
}

/* ---------- Scorecard ---------- */

.mg-scorecard-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0 18px;
  font-size: 14px;
}

.mg-scorecard-table th,
.mg-scorecard-table td {
  padding: 6px 12px;
  text-align: center;
  border-bottom: 1px solid var(--mg-sand-dark);
}

.mg-scorecard-table th {
  color: var(--mg-green-dark);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mg-scorecard-table td.mg-hole-name {
  text-align: left;
  font-weight: 600;
}

.mg-scorecard-total {
  font-weight: 800;
  border-top: 2px solid var(--mg-green-dark);
}

.mg-scorecard-scroll {
  max-height: 40vh;
  overflow-y: auto;
  margin-bottom: 10px;
}
`;

function relToParLabel(strokes, par) {
  if (strokes === 1) return 'Hole in One!';
  const diff = strokes - par;
  if (diff <= -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double Bogey';
  return `+${diff}`;
}

function relToParClass(strokes, par) {
  const diff = strokes - par;
  if (strokes === 1 || diff <= -1) return 'mg-great';
  if (diff >= 2) return 'mg-bad';
  return '';
}

export class UI {
  constructor() {
    this._injectStyles();

    this.root = document.createElement('div');
    this.root.className = 'mg-root';
    document.body.appendChild(this.root);

    this._buildPersistentHud();
    this._buildToast();
    this._buildStartScreen();
    this._buildHoleComplete();
    this._buildScorecard();

    this._toastTimer = null;
    this._activeOverlay = null;
  }

  // ---------------------------------------------------------------------
  // Style injection
  // ---------------------------------------------------------------------

  _injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------
  // Persistent HUD (hole info, strokes, power meter)
  // ---------------------------------------------------------------------

  _buildPersistentHud() {
    const top = document.createElement('div');
    top.className = 'mg-hud-top';

    this._holeInfoEl = document.createElement('div');
    this._holeInfoEl.className = 'mg-pill';
    this._holeInfoEl.textContent = '';
    top.appendChild(this._holeInfoEl);

    this.root.appendChild(top);

    this._strokesEl = document.createElement('div');
    this._strokesEl.className = 'mg-hud-strokes';
    this._strokesEl.textContent = 'Strokes: 0';
    this.root.appendChild(this._strokesEl);

    const powerWrap = document.createElement('div');
    powerWrap.className = 'mg-power-wrap';

    const track = document.createElement('div');
    track.className = 'mg-power-track';
    const fill = document.createElement('div');
    fill.className = 'mg-power-fill';
    track.appendChild(fill);
    powerWrap.appendChild(track);

    const label = document.createElement('div');
    label.className = 'mg-power-label';
    label.textContent = 'POWER';
    powerWrap.appendChild(label);

    this.root.appendChild(powerWrap);

    this._powerWrap = powerWrap;
    this._powerFill = fill;
  }

  setHoleInfo({ holeNumber, totalHoles, holeName, par }) {
    const parts = [`Hole ${holeNumber} / ${totalHoles}`];
    if (holeName) parts.push(holeName);
    parts.push(`Par ${par}`);
    this._holeInfoEl.textContent = parts.join(' – ');
  }

  setStrokes(n) {
    this._strokesEl.textContent = `Strokes: ${n}`;
  }

  setPower(power) {
    if (power === null) {
      this._powerWrap.classList.remove('mg-visible');
      return;
    }
    const clamped = Math.max(0, Math.min(1, power));
    this._powerFill.style.width = `${clamped * 100}%`;
    this._powerWrap.classList.add('mg-visible');
  }

  // ---------------------------------------------------------------------
  // Toast / transient message
  // ---------------------------------------------------------------------

  _buildToast() {
    this._toastEl = document.createElement('div');
    this._toastEl.className = 'mg-toast';
    this.root.appendChild(this._toastEl);
  }

  showMessage(text, durationMs = 1500) {
    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
      this._toastTimer = null;
    }
    this._toastEl.textContent = text;
    // Force reflow restart so re-triggering the same message still animates.
    this._toastEl.classList.remove('mg-visible');
    void this._toastEl.offsetWidth;
    this._toastEl.classList.add('mg-visible');

    this._toastTimer = setTimeout(() => {
      this._toastEl.classList.remove('mg-visible');
      this._toastTimer = null;
    }, durationMs);
  }

  // ---------------------------------------------------------------------
  // Shared overlay helpers
  // ---------------------------------------------------------------------

  _showOverlay(overlayEl) {
    if (this._activeOverlay && this._activeOverlay !== overlayEl) {
      this._activeOverlay.classList.remove('mg-visible');
    }
    overlayEl.classList.add('mg-visible');
    this._activeOverlay = overlayEl;
  }

  hidePanels() {
    [this._startOverlay, this._completeOverlay, this._scorecardOverlay].forEach((el) => {
      if (el) el.classList.remove('mg-visible');
    });
    this._activeOverlay = null;
  }

  // ---------------------------------------------------------------------
  // Start screen
  // ---------------------------------------------------------------------

  _buildStartScreen() {
    const overlay = document.createElement('div');
    overlay.className = 'mg-overlay';

    const card = document.createElement('div');
    card.className = 'mg-card';

    const emoji = document.createElement('div');
    emoji.className = 'mg-start-emoji';
    emoji.textContent = '⛳';
    card.appendChild(emoji);

    const title = document.createElement('h1');
    title.textContent = 'Kenney Mini Golf';
    card.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'mg-desc';
    desc.textContent = 'Putt your way through a sunny little course – lowest score wins!';
    card.appendChild(desc);

    const playBtn = document.createElement('button');
    playBtn.className = 'mg-btn';
    playBtn.type = 'button';
    playBtn.textContent = '▶ Play';
    card.appendChild(playBtn);

    overlay.appendChild(card);
    this.root.appendChild(overlay);

    this._startOverlay = overlay;
    this._startPlayBtn = playBtn;
  }

  showStartScreen({ onPlay }) {
    this._startPlayBtn.onclick = () => {
      this.hidePanels();
      if (typeof onPlay === 'function') onPlay();
    };
    this._showOverlay(this._startOverlay);
  }

  // ---------------------------------------------------------------------
  // Hole complete
  // ---------------------------------------------------------------------

  _buildHoleComplete() {
    const overlay = document.createElement('div');
    overlay.className = 'mg-overlay';

    const card = document.createElement('div');
    card.className = 'mg-card';

    const title = document.createElement('h2');
    title.textContent = 'Hole Complete!';
    card.appendChild(title);

    const badge = document.createElement('div');
    badge.className = 'mg-result-badge';
    card.appendChild(badge);

    const statRow = document.createElement('div');
    statRow.className = 'mg-stat-row';

    const strokesStat = document.createElement('div');
    strokesStat.innerHTML = '<b></b>Strokes';
    const parStat = document.createElement('div');
    parStat.innerHTML = '<b></b>Par';

    statRow.appendChild(strokesStat);
    statRow.appendChild(parStat);
    card.appendChild(statRow);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'mg-btn';
    nextBtn.type = 'button';
    card.appendChild(nextBtn);

    overlay.appendChild(card);
    this.root.appendChild(overlay);

    this._completeOverlay = overlay;
    this._completeBadge = badge;
    this._completeStrokesVal = strokesStat.querySelector('b');
    this._completeParVal = parStat.querySelector('b');
    this._completeNextBtn = nextBtn;
  }

  showHoleComplete({ strokes, par, holeNumber, totalHoles, isLastHole, onNext }) {
    const label = relToParLabel(strokes, par);
    const cls = relToParClass(strokes, par);

    this._completeBadge.textContent = label;
    this._completeBadge.className = `mg-result-badge${cls ? ' ' + cls : ''}`;
    this._completeStrokesVal.textContent = strokes;
    this._completeParVal.textContent = par;
    this._completeNextBtn.textContent = isLastHole ? 'Finish Round' : 'Next Hole';

    this._completeNextBtn.onclick = () => {
      this.hidePanels();
      if (typeof onNext === 'function') onNext();
    };

    this._showOverlay(this._completeOverlay);
  }

  // ---------------------------------------------------------------------
  // Scorecard
  // ---------------------------------------------------------------------

  _buildScorecard() {
    const overlay = document.createElement('div');
    overlay.className = 'mg-overlay';

    const card = document.createElement('div');
    card.className = 'mg-card';
    card.style.minWidth = '360px';

    const title = document.createElement('h2');
    title.textContent = 'Final Scorecard';
    card.appendChild(title);

    const scroll = document.createElement('div');
    scroll.className = 'mg-scorecard-scroll';

    const table = document.createElement('table');
    table.className = 'mg-scorecard-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Hole</th><th>Strokes</th><th>Par</th><th>+/-</th></tr>';
    const tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);
    scroll.appendChild(table);
    card.appendChild(scroll);

    const totalLine = document.createElement('p');
    totalLine.className = 'mg-desc';
    totalLine.style.margin = '0 0 18px';
    card.appendChild(totalLine);

    const playAgainBtn = document.createElement('button');
    playAgainBtn.className = 'mg-btn';
    playAgainBtn.type = 'button';
    playAgainBtn.textContent = 'Play Again';
    card.appendChild(playAgainBtn);

    overlay.appendChild(card);
    this.root.appendChild(overlay);

    this._scorecardOverlay = overlay;
    this._scorecardBody = tbody;
    this._scorecardTotalLine = totalLine;
    this._scorecardPlayAgainBtn = playAgainBtn;
  }

  showScorecard({ scores, onPlayAgain }) {
    this._scorecardBody.innerHTML = '';

    let totalStrokes = 0;
    let totalPar = 0;

    scores.forEach(({ holeNumber, holeName, strokes, par }) => {
      totalStrokes += strokes;
      totalPar += par;

      const diff = strokes - par;
      const diffText = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;

      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      nameCell.className = 'mg-hole-name';
      nameCell.textContent = `${holeNumber}. ${holeName || ''}`.trim();

      const strokesCell = document.createElement('td');
      strokesCell.textContent = strokes;

      const parCell = document.createElement('td');
      parCell.textContent = par;

      const diffCell = document.createElement('td');
      diffCell.textContent = diffText;

      row.appendChild(nameCell);
      row.appendChild(strokesCell);
      row.appendChild(parCell);
      row.appendChild(diffCell);
      this._scorecardBody.appendChild(row);
    });

    const totalDiff = totalStrokes - totalPar;
    const totalDiffText = totalDiff === 0 ? 'E' : totalDiff > 0 ? `+${totalDiff}` : `${totalDiff}`;

    const totalRow = document.createElement('tr');
    totalRow.className = 'mg-scorecard-total';
    totalRow.innerHTML = `<td class="mg-hole-name">Total</td><td>${totalStrokes}</td><td>${totalPar}</td><td>${totalDiffText}</td>`;
    this._scorecardBody.appendChild(totalRow);

    this._scorecardTotalLine.textContent = `Total: ${totalStrokes} strokes (par ${totalPar})`;

    this._scorecardPlayAgainBtn.onclick = () => {
      this.hidePanels();
      if (typeof onPlayAgain === 'function') onPlayAgain();
    };

    this._showOverlay(this._scorecardOverlay);
  }
}
