// Llama Bomba — Web MVP based on PRD
// Canvas-based Zuma-like core: path, moving chain, shooter, matching.
import { ORB_RADIUS, ORB_SPACING, buildPath, enforceOrderAndSpacing, handleMatches, chooseInsertionS, dist2, EventBus, removeAroundS } from './core.js';
import { gameConfig, levels } from './config.js';
import { AudioManager } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const ui = {
  score: document.getElementById('score'),
  level: document.getElementById('level'),
  status: document.getElementById('status'),
  restart: document.getElementById('btn-restart'),
  audio: document.getElementById('btn-audio'),
  puSlow: document.getElementById('btn-pu-slow'),
  puBomb: document.getElementById('btn-pu-bomb'),
};

// Config-driven values
const COLORS = gameConfig.colors;
const CHAIN_SPEED = gameConfig.chainSpeed;
const PROJECTILE_SPEED = gameConfig.projectileSpeed;
const PATH_WIDTH = gameConfig.pathWidth;
const TRAJECTORY_PREVIEW = gameConfig.trajectoryPreview;

const level1Cfg = levels[0];
const level1 = {
  name: level1Cfg.name,
  colors: COLORS.slice(0, level1Cfg.colors),
  chainCount: level1Cfg.chainCount,
  path: level1Cfg.path,
  templeEndOffset: level1Cfg.templeEndOffset,
};

// Utility: provided by core.js (dist2 via import)

// Shooter at canvas center
const SHOOTER = { x: W / 2, y: H / 2, angle: 0, nextColor: null };

// Game state
const Game = {
  path: buildPath(level1.path),
  level: level1,
  orbs: [], // chain orbs: {s, color}
  projectiles: [], // moving shots: {x,y,vx,vy,color}
  leadS: 0, // leading param along path
  score: 0,
  chainCombo: 0,
  state: 'playing', // 'playing' | 'won' | 'lost'
  eventBus: new EventBus(),
  powerups: {
    slow: gameConfig.powerups.slow.stock,
    bomb: gameConfig.powerups.bomb.stock,
    bombArmed: false,
  },
  effects: {
    slowUntil: 0,
    slowFactor: gameConfig.powerups.slow.factor,
  },
};

// Audio (platform adapter)
const audio = new AudioManager();
const unlockAudio = () => audio.unlock();
['click', 'keydown', 'touchstart'].forEach((evt) => window.addEventListener(evt, unlockAudio, { once: true, passive: true }));

// Event wiring for audio
Game.eventBus.on('match_cleared', (e) => {
  const { count } = e.payload || {};
  audio.play('match', { count });
});

function initLevel(lv) {
  Game.level = lv;
  Game.path = buildPath(lv.path);
  Game.orbs = [];
  Game.projectiles = [];
  Game.leadS = 0;
  Game.score = 0;
  Game.chainCombo = 0;
  Game.state = 'playing';
  SHOOTER.nextColor = pickColor();
  // Seed chain starting behind the start with spacing
  const count = lv.chainCount;
  for (let i = 0; i < count; i++) {
    const s = -i * ORB_SPACING; // behind start, will move in
    Game.orbs.push({ s, color: pickColor() });
  }
  ui.level.textContent = lv.name;
  ui.score.textContent = `Score: ${Game.score}`;
  ui.status.textContent = 'Aim and click to shoot';
  // Reset powerup UI
  refreshPowerupButtons?.();
}

function pickColor() {
  const palette = Game.level.colors;
  return palette[Math.floor(Math.random() * palette.length)];
}

// Input handling
let mouse = { x: W / 2, y: H / 2, down: false };
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  SHOOTER.angle = Math.atan2(mouse.y - SHOOTER.y, mouse.x - SHOOTER.x);
});
canvas.addEventListener('mousedown', () => {
  if (Game.state !== 'playing') return;
  shoot();
});
window.addEventListener('keydown', (e) => {
  if (Game.state !== 'playing') return;
  if (e.code === 'Space') shoot();
  if (e.code === 'ArrowLeft') SHOOTER.angle -= 0.05;
  if (e.code === 'ArrowRight') SHOOTER.angle += 0.05;
});
ui.restart.addEventListener('click', () => initLevel(level1));
if (ui.audio) {
  ui.audio.addEventListener('click', () => {
    const muted = audio.toggleMuted();
    ui.audio.classList.toggle('muted', muted);
    ui.audio.textContent = muted ? 'Unmute' : 'Mute';
  });
}

// Power-up UI handlers
function refreshPowerupButtons() {
  if (ui.puSlow) ui.puSlow.textContent = `Slow (${Game.powerups.slow})`;
  if (ui.puBomb) {
    ui.puBomb.textContent = `Bomb (${Game.powerups.bomb})${Game.powerups.bombArmed ? ' [ARMED]' : ''}`;
    ui.puBomb.classList.toggle('armed', Game.powerups.bombArmed);
  }
  if (ui.puSlow) ui.puSlow.disabled = Game.powerups.slow <= 0;
  if (ui.puBomb) ui.puBomb.disabled = Game.powerups.bomb <= 0 && !Game.powerups.bombArmed;
}

ui.puSlow?.addEventListener('click', () => {
  if (Game.powerups.slow <= 0) return;
  Game.powerups.slow -= 1;
  Game.effects.slowUntil = performance.now() / 1000 + gameConfig.powerups.slow.durationSec;
  audio.play('chain', { dur: 0.2, vol: 0.2 });
  refreshPowerupButtons();
});

ui.puBomb?.addEventListener('click', () => {
  if (Game.powerups.bombArmed) {
    Game.powerups.bombArmed = false; // disarm
  } else if (Game.powerups.bomb > 0) {
    Game.powerups.bombArmed = true; // arm for next shot
    Game.powerups.bomb -= 1;
  }
  refreshPowerupButtons();
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === 'b' || e.key === 'B') ui.puBomb?.click();
  if (e.key === 's' || e.key === 'S') ui.puSlow?.click();
});

function shoot() {
  const c = SHOOTER.nextColor || pickColor();
  const vx = Math.cos(SHOOTER.angle) * PROJECTILE_SPEED;
  const vy = Math.sin(SHOOTER.angle) * PROJECTILE_SPEED;
  const type = Game.powerups.bombArmed ? 'bomb' : 'normal';
  Game.projectiles.push({ x: SHOOTER.x, y: SHOOTER.y, vx, vy, color: c, type });
  if (type === 'bomb') {
    Game.powerups.bombArmed = false;
    ui.puBomb?.classList.remove('armed');
  }
  SHOOTER.nextColor = pickColor();
  Game.eventBus.emit({ type: 'shoot', payload: {}, timestamp: performance.now() });
  audio.play('shoot');
}

// Update loop
let last = performance.now();
function frame(ts) {
  const dt = (ts - last) / 1000;
  last = ts;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function update(dt) {
  if (Game.state !== 'playing') return;
  // Advance lead and maintain spacing
  const now = performance.now() / 1000;
  const slowActive = now < Game.effects.slowUntil;
  const effSpeed = CHAIN_SPEED * (slowActive ? Game.effects.slowFactor : 1);
  Game.leadS += effSpeed * dt;
  // Move each orb to follow with spacing
  if (Game.orbs.length > 0) {
    Game.orbs[0].s = Game.leadS;
    for (let i = 1; i < Game.orbs.length; i++) {
      const target = Game.orbs[i - 1].s - ORB_SPACING;
      const cur = Game.orbs[i].s;
      Game.orbs[i].s = cur + (target - cur) * 8 * dt; // spring-like follow
    }
  }
  // Projectiles movement
  for (const p of Game.projectiles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  // Remove off-screen projectiles
  Game.projectiles = Game.projectiles.filter((p) => p.x > -40 && p.x < W + 40 && p.y > -40 && p.y < H + 40);

  // Projectile-chain collision and insertion
  for (let pi = Game.projectiles.length - 1; pi >= 0; pi--) {
    const p = Game.projectiles[pi];
    let hitIndex = -1;
    let minD2 = Infinity;
    for (let i = 0; i < Game.orbs.length; i++) {
      const pos = Game.path.sample(Game.orbs[i].s);
      const d2 = dist2(p.x, p.y, pos.x, pos.y);
      if (d2 < (ORB_RADIUS * 1.1) ** 2 && d2 < minD2) {
        minD2 = d2;
        hitIndex = i;
      }
    }
    if (hitIndex !== -1) {
      // Decide whether to insert before or after based on proximity
      const baseS = Game.orbs[hitIndex].s;
      if (p.type === 'bomb') {
        const removed = removeAroundS(Game, baseS, gameConfig.powerups.bomb.radius);
        Game.projectiles.splice(pi, 1);
        if (removed > 0) {
          const basePts = gameConfig.scoring.basePerOrb * removed;
          Game.score += basePts;
          ui.score.textContent = `Score: ${Game.score}`;
          Game.chainCombo = 0;
          audio.play('bomb', { dur: 0.18, vol: 0.22 });
        }
      } else {
        const insertS = chooseInsertionS(Game.path, baseS, { x: p.x, y: p.y });
        const inserted = { s: insertS, color: p.color };
        Game.orbs.push(inserted);
        Game.projectiles.splice(pi, 1);
        // Enforce ordering and spacing, then find inserted index
        enforceOrderAndSpacing(Game);
        const idx = Game.orbs.indexOf(inserted);
        // Check matches and scoring from inserted position
        const removed = handleMatches(Game, idx);
        if (removed > 0) {
          // Scoring via config and combo bonus
          const base = gameConfig.scoring.basePerOrb * removed;
          const bonus = Game.chainCombo > 0 ? gameConfig.scoring.chainBonusStep * Game.chainCombo : 0;
          Game.score += base + bonus;
          ui.score.textContent = `Score: ${Game.score}`;
          Game.chainCombo += 1;
        } else {
          Game.chainCombo = 0;
        }
      }
      // Check win
      if (Game.orbs.length === 0) {
        Game.state = 'won';
        ui.status.textContent = 'Level cleared!';
        Game.eventBus.emit({ type: 'level_cleared', payload: {}, timestamp: performance.now() });
        audio.play('win', { dur: 0.3, vol: 0.25 });
      }
    }
  }
  // After movement, normalize order and spacing to avoid overlaps
  enforceOrderAndSpacing(Game);

  // Lose condition: lead reaches near end
  if (Game.orbs.length > 0) {
    if (Game.orbs[0].s >= Game.path.length + Game.level.templeEndOffset) {
      Game.state = 'lost';
      ui.status.textContent = 'The orbs reached the temple!';
      Game.eventBus.emit({ type: 'game_over', payload: {}, timestamp: performance.now() });
      audio.play('lose', { dur: 0.35, vol: 0.22 });
    }
  }
}

// handleMatches is imported from core.js; it updates Game.orbs spacing and clearing

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Background elements (temple end marker)
  drawPath(Game.level.path, '#10343c');
  drawTempleEnd();

  // Draw shooter
  drawShooter();

  // Draw chain
  for (let i = Game.orbs.length - 1; i >= 0; i--) {
    const { x, y } = Game.path.sample(Game.orbs[i].s);
    drawOrb(x, y, Game.orbs[i].color);
  }

  // Draw projectiles
  for (const p of Game.projectiles) drawOrb(p.x, p.y, p.color, true);

  // End state overlay
  if (Game.state !== 'playing') {
    const text = Game.state === 'won' ? 'Level Cleared!' : 'Game Over';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, H / 2);
  }
}

function drawPath(points, stroke = '#0e2b32') {
  ctx.lineWidth = PATH_WIDTH;
  ctx.strokeStyle = stroke;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
}

function drawTempleEnd() {
  // mark the final segment end as temple gate
  const end = Game.level.path[Game.level.path.length - 1];
  ctx.fillStyle = '#8a5f3f';
  ctx.fillRect(end[0] - 12, end[1] - 24, 24, 48);
  ctx.fillStyle = '#cfa97a';
  ctx.fillRect(end[0] - 8, end[1] - 18, 16, 36);
}

function drawShooter() {
  // Llama placeholder: a friendly wedge + next orb color as nose
  ctx.save();
  ctx.translate(SHOOTER.x, SHOOTER.y);
  ctx.rotate(SHOOTER.angle);
  ctx.fillStyle = '#d8bca1';
  ctx.beginPath();
  ctx.moveTo(-26, -18);
  ctx.lineTo(-26, 18);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // Barrel
  ctx.fillStyle = '#394b59';
  ctx.fillRect(-6, -5, 36, 10);
  // Next orb preview at tip
  drawOrb(30, 0, SHOOTER.nextColor || '#fff');
  ctx.restore();

  // Trajectory preview
  if (TRAJECTORY_PREVIEW) {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(SHOOTER.x, SHOOTER.y);
    const px = SHOOTER.x + Math.cos(SHOOTER.angle) * 1200;
    const py = SHOOTER.y + Math.sin(SHOOTER.angle) * 1200;
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawOrb(x, y, color, glow = false) {
  ctx.save();
  if (glow) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, ORB_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  // subtle highlight
  const grad = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, ORB_RADIUS);
  grad.addColorStop(0, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, ORB_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Start
initLevel(level1);
requestAnimationFrame(frame);
