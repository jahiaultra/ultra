const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  hp: document.getElementById('hp'),
  energy: document.getElementById('energy'),
  score: document.getElementById('score'),
  wave: document.getElementById('wave'),
  message: document.getElementById('message'),
  start: document.getElementById('startBtn')
};

const W = canvas.width;
const H = canvas.height;
const keys = new Set();
let mouse = { x: W / 2, y: H / 2, down: false };
let running = false;
let frame = 0;
let gameOver = false;
let win = false;

const state = {
  wave: 1,
  score: 0,
  player: null,
  bullets: [],
  enemies: [],
  sparks: [],
  boss: null,
};

function resetGame() {
  state.wave = 1;
  state.score = 0;
  state.bullets = [];
  state.enemies = [];
  state.sparks = [];
  state.boss = null;
  gameOver = false;
  win = false;
  frame = 0;
  state.player = {
    x: W / 2,
    y: H / 2,
    r: 16,
    hp: 100,
    energy: 100,
    cooldown: 0,
    dashCd: 0,
    invuln: 0,
  };
  spawnWave(1);
  setMessage('Operaatio käynnissä. Etsi konekirotut yksiköt.');
  syncHud();
}

function setMessage(text) {
  ui.message.textContent = text;
}

function spawnWave(n) {
  const count = 4 + n * 2;
  state.enemies = [];
  for (let i = 0; i < count; i++) {
    state.enemies.push({
      x: Math.random() * (W - 80) + 40,
      y: Math.random() * (H - 80) + 40,
      r: 14,
      hp: 24 + n * 6,
      speed: 0.8 + n * 0.18,
      angle: Math.random() * Math.PI * 2,
      shootCd: 80 + Math.random() * 120,
      kind: 'drone'
    });
  }

  if (n === 3) {
    state.boss = {
      x: W * 0.7,
      y: H * 0.4,
      r: 44,
      hp: 420,
      speed: 0.9,
      shootCd: 28,
      phase: 1
    };
    setMessage('PÄÄBOSSI: OMEGA-13 aktivoitu. Pysy liikkeessä!');
  } else {
    state.boss = null;
    setMessage(`Wave ${n}: eliminoi kaikki dronet.`);
  }
}

function syncHud() {
  ui.hp.textContent = Math.max(0, Math.round(state.player.hp));
  ui.energy.textContent = Math.round(state.player.energy);
  ui.score.textContent = state.score;
  ui.wave.textContent = state.wave;
}

function addSpark(x, y, color = '#68f8ff') {
  for (let i = 0; i < 10; i++) {
    state.sparks.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      ttl: 20 + Math.random() * 20,
      color,
    });
  }
}

function shootFromPlayer() {
  if (state.player.cooldown > 0) return;
  const dx = mouse.x - state.player.x;
  const dy = mouse.y - state.player.y;
  const len = Math.hypot(dx, dy) || 1;
  state.bullets.push({
    x: state.player.x,
    y: state.player.y,
    vx: (dx / len) * 8,
    vy: (dy / len) * 8,
    from: 'player',
    r: 4,
    dmg: 12,
  });
  state.player.cooldown = 7;
}

function useEmp() {
  if (state.player.energy < 35) {
    setMessage('Ei tarpeeksi energiaa EMP:lle.');
    return;
  }
  state.player.energy -= 35;
  for (const e of state.enemies) {
    e.hp -= 18;
  }
  if (state.boss) state.boss.hp -= 35;
  addSpark(state.player.x, state.player.y, '#8ce99a');
  setMessage('EMP-purkaus! Viholliset lamaantuivat.');
}

function damagePlayer(amount) {
  if (state.player.invuln > 0) return;
  state.player.hp -= amount;
  state.player.invuln = 20;
  addSpark(state.player.x, state.player.y, '#ff4f7e');
  if (state.player.hp <= 0) {
    gameOver = true;
    running = false;
    setMessage('Järjestelmä kaatui. Paina R aloittaaksesi uudelleen.');
  }
}

function handleInput() {
  const p = state.player;
  const speed = keys.has('Shift') ? 3.4 : 2.4;
  if (keys.has('w') || keys.has('ArrowUp')) p.y -= speed;
  if (keys.has('s') || keys.has('ArrowDown')) p.y += speed;
  if (keys.has('a') || keys.has('ArrowLeft')) p.x -= speed;
  if (keys.has('d') || keys.has('ArrowRight')) p.x += speed;

  if (keys.has('Shift') && p.energy >= 0.45) p.energy -= 0.45;
  else p.energy = Math.min(100, p.energy + 0.12);

  p.x = Math.max(p.r, Math.min(W - p.r, p.x));
  p.y = Math.max(p.r, Math.min(H - p.r, p.y));

  if (mouse.down) shootFromPlayer();
}

function updateBullets() {
  for (const b of state.bullets) {
    b.x += b.vx;
    b.y += b.vy;
  }

  state.bullets = state.bullets.filter(b => b.x > -20 && b.y > -20 && b.x < W + 20 && b.y < H + 20);

  for (const b of state.bullets) {
    if (b.from === 'enemy') {
      const d = Math.hypot(b.x - state.player.x, b.y - state.player.y);
      if (d < state.player.r + b.r) {
        b.x = -9999;
        damagePlayer(9);
      }
      continue;
    }

    for (const e of state.enemies) {
      const d = Math.hypot(b.x - e.x, b.y - e.y);
      if (d < e.r + b.r) {
        e.hp -= b.dmg;
        b.x = -9999;
        addSpark(e.x, e.y);
      }
    }

    if (state.boss) {
      const d = Math.hypot(b.x - state.boss.x, b.y - state.boss.y);
      if (d < state.boss.r + b.r) {
        state.boss.hp -= b.dmg;
        b.x = -9999;
        addSpark(state.boss.x, state.boss.y, '#ffc078');
      }
    }
  }

  state.enemies = state.enemies.filter(e => {
    if (e.hp > 0) return true;
    state.score += 40;
    addSpark(e.x, e.y, '#ffd43b');
    return false;
  });

  if (state.boss && state.boss.hp <= 0) {
    state.score += 1000;
    state.boss = null;
    win = true;
    running = false;
    setMessage('Konekirous purettu! Voitit pelin. Paina R pelataksesi uudelleen.');
  }
}

function updateEnemies() {
  for (const e of state.enemies) {
    const dx = state.player.x - e.x;
    const dy = state.player.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    e.x += (dx / len) * e.speed;
    e.y += (dy / len) * e.speed;

    e.shootCd -= 1;
    if (e.shootCd <= 0) {
      e.shootCd = 70 + Math.random() * 110;
      state.bullets.push({
        x: e.x, y: e.y,
        vx: (dx / len) * 3.4,
        vy: (dy / len) * 3.4,
        from: 'enemy',
        r: 4,
        dmg: 8,
      });
    }

    if (Math.hypot(dx, dy) < e.r + state.player.r) {
      damagePlayer(0.35);
    }
  }

  if (state.boss) {
    const p = state.player;
    const b = state.boss;
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const len = Math.hypot(dx, dy) || 1;

    b.phase = b.hp < 210 ? 2 : 1;
    b.x += (dx / len) * b.speed;
    b.y += (dy / len) * b.speed;

    b.shootCd -= 1;
    if (b.shootCd <= 0) {
      b.shootCd = b.phase === 1 ? 26 : 15;
      const spread = b.phase === 1 ? 3 : 6;
      for (let i = 0; i < spread; i++) {
        const ang = Math.atan2(dy, dx) + (i - (spread - 1) / 2) * 0.18;
        state.bullets.push({
          x: b.x, y: b.y,
          vx: Math.cos(ang) * (b.phase === 1 ? 4.2 : 5.2),
          vy: Math.sin(ang) * (b.phase === 1 ? 4.2 : 5.2),
          from: 'enemy',
          r: 5,
          dmg: b.phase === 1 ? 7 : 10,
        });
      }
    }

    if (Math.hypot(dx, dy) < b.r + p.r) {
      damagePlayer(1);
    }
  }

  if (!state.boss && state.enemies.length === 0 && state.wave < 3) {
    state.wave += 1;
    state.player.hp = Math.min(100, state.player.hp + 20);
    state.player.energy = 100;
    spawnWave(state.wave);
  }
}

function updateSparks() {
  for (const s of state.sparks) {
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.97;
    s.vy *= 0.97;
    s.ttl -= 1;
  }
  state.sparks = state.sparks.filter(s => s.ttl > 0);
}

function drawBackground() {
  ctx.fillStyle = '#070c18';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 80; i++) {
    const x = (i * 121 + frame * 0.25) % W;
    const y = (i * 73 + frame * 0.14) % H;
    ctx.fillStyle = i % 7 === 0 ? 'rgba(104,248,255,0.18)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, y, 2, 2);
  }
}

function draw() {
  drawBackground();

  for (const s of state.sparks) {
    ctx.fillStyle = s.color;
    ctx.globalAlpha = Math.max(0, s.ttl / 35);
    ctx.fillRect(s.x, s.y, 3, 3);
    ctx.globalAlpha = 1;
  }

  for (const b of state.bullets) {
    ctx.fillStyle = b.from === 'player' ? '#68f8ff' : '#ff7b9b';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of state.enemies) {
    ctx.fillStyle = '#9d4edd';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0aaff';
    ctx.stroke();
  }

  if (state.boss) {
    ctx.fillStyle = '#e03131';
    ctx.beginPath();
    ctx.arc(state.boss.x, state.boss.y, state.boss.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`OMEGA-13 HP: ${Math.max(0, Math.round(state.boss.hp))}`, state.boss.x - 55, state.boss.y - state.boss.r - 12);
  }

  const p = state.player;
  ctx.fillStyle = p.invuln > 0 ? '#ffd43b' : '#68f8ff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();

  const angle = Math.atan2(mouse.y - p.y, mouse.x - p.x);
  ctx.strokeStyle = '#b2f2ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(angle) * 28, p.y + Math.sin(angle) * 28);
  ctx.stroke();

  if (gameOver || win) {
    ctx.fillStyle = 'rgba(0,0,0,.58)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(win ? 'VICTORY' : 'SYSTEM FAILURE', W / 2, H / 2 - 10);
    ctx.font = '20px sans-serif';
    ctx.fillText('Paina R aloittaaksesi uudelleen', W / 2, H / 2 + 32);
    ctx.textAlign = 'start';
  }
}

function tick() {
  frame += 1;
  if (running) {
    handleInput();
    updateEnemies();
    updateBullets();
    updateSparks();
    state.player.cooldown = Math.max(0, state.player.cooldown - 1);
    state.player.invuln = Math.max(0, state.player.invuln - 1);
    syncHud();
  }
  draw();
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys.add(k);
  if (k === 'e' && running) useEmp();
  if (k.toLowerCase() === 'r') {
    resetGame();
    running = true;
  }
});

window.addEventListener('keyup', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys.delete(k);
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});
canvas.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);

ui.start.addEventListener('click', () => {
  resetGame();
  running = true;
});

resetGame();
requestAnimationFrame(tick);
