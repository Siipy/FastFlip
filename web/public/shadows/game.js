// Shadows of the Motherland - vanilla JS + Canvas starter
// Main game module handles initialization, loop, state, and systems.

// Simple helper for randomness
const randRange = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Input handling
class Input {
  constructor() {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    this.bindEvents();
  }
  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('mousedown', () => (this.mouse.down = true));
    window.addEventListener('mouseup', () => (this.mouse.down = false));
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }
  pressed(key) {
    return this.keys.has(key.toLowerCase());
  }
}

// Simple asset placeholder (can be expanded with real images/audio)
class Assets {
  constructor() {
    this.loaded = true; // no external assets
    // Example placeholder audio context
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = ctx.createOscillator();
      const gain = ctx.createGain();
      beep.type = 'square';
      beep.frequency.value = 160;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      beep.connect(gain).connect(ctx.destination);
      beep.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      setTimeout(() => {
        gain.disconnect();
        beep.stop();
        ctx.close();
      }, 200);
    } catch (e) {
      console.warn('Audio not initialized, running silently.', e);
    }
  }
}

// Map representation uses grid for collision
class GameMap {
  constructor(tileSize = 48) {
    this.tileSize = tileSize;
    this.width = 60;
    this.height = 60;
    this.tiles = [];
    this.collision = new Set();
    this.generate();
  }
  generate() {
    // Simple generator: 0 = floor, 1 = wall, 2 = snow/forest obstacle
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let type = 0;
        if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) type = 1;
        if (Math.random() < 0.05) type = 1; // random walls
        if (y > this.height - 10 && Math.random() < 0.2) type = 2; // forest edge
        this.tiles.push(type);
        if (type === 1 || type === 2) this.collision.add(`${x},${y}`);
      }
    }
    // Place a simple apartment block (indoor area)
    for (let y = 20; y < 28; y++) {
      for (let x = 18; x < 26; x++) {
        const idx = y * this.width + x;
        this.tiles[idx] = 1;
        this.collision.add(`${x},${y}`);
      }
    }
    // Carve rooms
    for (let y = 21; y < 27; y++) {
      for (let x = 19; x < 25; x++) {
        const idx = y * this.width + x;
        this.tiles[idx] = 0;
        this.collision.delete(`${x},${y}`);
      }
    }
  }
  isBlocked(x, y) {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    return this.collision.has(`${tx},${ty}`);
  }
  draw(ctx, camera) {
    const { tileSize } = this;
    const startX = Math.floor(camera.x / tileSize) - 2;
    const startY = Math.floor(camera.y / tileSize) - 2;
    const endX = startX + Math.ceil(camera.width / tileSize) + 4;
    const endY = startY + Math.ceil(camera.height / tileSize) + 4;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
        const tile = this.tiles[y * this.width + x];
        const screenX = x * tileSize - camera.x;
        const screenY = y * tileSize - camera.y;
        if (tile === 0) {
          ctx.fillStyle = '#2b333d'; // asphalt / floor
        } else if (tile === 1) {
          ctx.fillStyle = '#4e5866'; // wall
        } else {
          ctx.fillStyle = '#3a4c3b'; // snow/forest
        }
        ctx.fillRect(screenX, screenY, tileSize, tileSize);

        // Add slight texture
        if (tile !== 1 && Math.random() < 0.05) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(screenX + 10, screenY + 10, 4, 4);
        }
      }
    }
  }
}

class Camera {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.x = 0;
    this.y = 0;
  }
  follow(target, map) {
    this.x = clamp(target.pos.x - this.width / 2, 0, map.width * map.tileSize - this.width);
    this.y = clamp(target.pos.y - this.height / 2, 0, map.height * map.tileSize - this.height);
  }
}

class Entity {
  constructor(x, y) {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.size = 22;
    this.dead = false;
  }
  update(dt) {}
  draw(ctx, camera) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.pos.x - camera.x - this.size / 2, this.pos.y - camera.y - this.size / 2, this.size, this.size);
  }
}

class Bullet extends Entity {
  constructor(x, y, dir, speed, damage, owner) {
    super(x, y);
    this.dir = dir;
    this.speed = speed;
    this.damage = damage;
    this.owner = owner;
    this.life = 1.5;
    this.size = 6;
  }
  update(dt, game) {
    this.pos.x += Math.cos(this.dir) * this.speed * dt;
    this.pos.y += Math.sin(this.dir) * this.speed * dt;
    this.life -= dt;
    if (this.life <= 0 || game.map.isBlocked(this.pos.x, this.pos.y)) this.dead = true;
  }
  draw(ctx, camera) {
    ctx.fillStyle = '#f2c265';
    ctx.beginPath();
    ctx.arc(this.pos.x - camera.x, this.pos.y - camera.y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

class InventoryItem {
  constructor(name, quantity = 1, color = '#8fc4d9') {
    this.name = name;
    this.quantity = quantity;
    this.color = color;
  }
}

class Inventory {
  constructor(maxSlots = 12) {
    this.maxSlots = maxSlots;
    this.items = [];
  }
  add(item) {
    const existing = this.items.find((i) => i.name === item.name);
    if (existing) {
      existing.quantity += item.quantity;
      return true;
    }
    if (this.items.length < this.maxSlots) {
      this.items.push(item);
      return true;
    }
    return false; // inventory full
  }
  remove(name, amount) {
    const idx = this.items.findIndex((i) => i.name === name);
    if (idx >= 0) {
      const itm = this.items[idx];
      if (itm.quantity >= amount) {
        itm.quantity -= amount;
        if (itm.quantity === 0) this.items.splice(idx, 1);
        return true;
      }
    }
    return false;
  }
  has(name, amount) {
    const itm = this.items.find((i) => i.name === name);
    return itm && itm.quantity >= amount;
  }
}

class CraftingSystem {
  constructor(inventory) {
    this.inventory = inventory;
    this.recipes = [
      { name: 'Bandage', requires: { Cloth: 2, Alcohol: 1 }, color: '#d4f0f0' },
      { name: 'Upgraded Pistol', requires: { 'Gun Parts': 2, 'Scrap Metal': 3 }, color: '#d9c58f' },
      { name: 'Molotov', requires: { Bottle: 1, Cloth: 1, Fuel: 1 }, color: '#d98f8f' },
      { name: 'Makeshift Armor', requires: { 'Scrap Metal': 4, Cloth: 2 }, color: '#8fd9a8' },
    ];
  }
  canCraft(recipe) {
    return Object.entries(recipe.requires).every(([name, qty]) => this.inventory.has(name, qty));
  }
  craft(recipe) {
    if (!this.canCraft(recipe)) return false;
    Object.entries(recipe.requires).forEach(([name, qty]) => this.inventory.remove(name, qty));
    this.inventory.add(new InventoryItem(recipe.name, 1, recipe.color));
    return true;
  }
  draw(ctx, width, height, active) {
    if (!active) return;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 12, 16, 0.85)';
    ctx.fillRect(width * 0.6, 20, width * 0.35, height - 40);
    ctx.fillStyle = '#e6e9ef';
    ctx.font = '18px sans-serif';
    ctx.fillText('Crafting', width * 0.62, 50);
    ctx.font = '14px monospace';
    this.recipes.forEach((recipe, i) => {
      const y = 80 + i * 80;
      const can = this.canCraft(recipe);
      ctx.fillStyle = can ? '#a6ff8f' : '#9aa3b5';
      ctx.fillText(recipe.name, width * 0.62, y);
      ctx.fillStyle = '#c2c7d6';
      const req = Object.entries(recipe.requires)
        .map(([n, q]) => `${n} x${q}`)
        .join(', ');
      ctx.fillText(req, width * 0.62, y + 20);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(width * 0.62, y + 28, width * 0.3, 34);
      ctx.strokeStyle = can ? '#a6ff8f' : '#6f7483';
      ctx.strokeRect(width * 0.62, y + 28, width * 0.3, 34);
      ctx.fillStyle = '#c2c7d6';
      ctx.fillText('Press [' + (i + 1) + '] to craft', width * 0.62 + 6, y + 50);
    });
    ctx.restore();
  }
}

class Player extends Entity {
  constructor(x, y, input, bullets, inventory) {
    super(x, y);
    this.input = input;
    this.bullets = bullets;
    this.inventory = inventory;
    this.speed = 180;
    this.sprintMultiplier = 1.5;
    this.stamina = 100;
    this.maxStamina = 100;
    this.health = 100;
    this.maxHealth = 100;
    this.fireCooldown = 0;
    this.fireRate = 0.25;
    this.damage = 15;
    this.level = 1;
    this.xp = 0;
    this.size = 24;
  }
  gainXP(amount) {
    this.xp += amount;
    const needed = this.level * 100;
    if (this.xp >= needed) {
      this.level++;
      this.maxHealth += 10;
      this.health = this.maxHealth;
      this.damage += 2;
    }
  }
  update(dt, game) {
    let dirX = 0, dirY = 0;
    if (this.input.pressed('w')) dirY -= 1;
    if (this.input.pressed('s')) dirY += 1;
    if (this.input.pressed('a')) dirX -= 1;
    if (this.input.pressed('d')) dirX += 1;
    const sprinting = this.input.pressed('shift') && this.stamina > 0 && (dirX !== 0 || dirY !== 0);
    const spd = this.speed * (sprinting ? this.sprintMultiplier : 1);
    const len = Math.hypot(dirX, dirY) || 1;
    this.vel.x = (dirX / len) * spd;
    this.vel.y = (dirY / len) * spd;

    this.pos.x += this.vel.x * dt;
    if (game.map.isBlocked(this.pos.x, this.pos.y)) this.pos.x -= this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    if (game.map.isBlocked(this.pos.x, this.pos.y)) this.pos.y -= this.vel.y * dt;

    // stamina regen/drain
    if (sprinting) this.stamina = Math.max(0, this.stamina - 35 * dt);
    else this.stamina = Math.min(this.maxStamina, this.stamina + 20 * dt);

    // shooting
    this.fireCooldown -= dt;
    if (this.input.mouse.down && this.fireCooldown <= 0 && !game.paused && game.state === 'play') {
      const angle = Math.atan2(this.input.mouse.y + game.camera.y - this.pos.y, this.input.mouse.x + game.camera.x - this.pos.x);
      this.bullets.push(new Bullet(this.pos.x, this.pos.y, angle, 480, this.damage, this));
      this.fireCooldown = this.fireRate;
      // Placeholder gunshot sound could be placed here
    }
  }
  draw(ctx, camera) {
    const x = this.pos.x - camera.x;
    const y = this.pos.y - camera.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#c7d9ff';
    ctx.beginPath();
    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f3b52';
    ctx.fillRect(-this.size / 4, -this.size / 2, this.size / 2, this.size / 1.2);
    ctx.restore();
  }
}

class Enemy extends Entity {
  constructor(x, y, type = 'patrol') {
    super(x, y);
    this.type = type;
    this.speed = type === 'patrol' ? 90 : 70;
    this.damage = type === 'patrol' ? 8 : 14;
    this.health = type === 'patrol' ? 40 : 60;
    this.waypoints = [];
    this.currentWP = 0;
    this.aggroRange = 200;
    this.noticeRange = 120;
    this.fireCooldown = 0;
    this.fireRate = type === 'patrol' ? 1.2 : 1.6;
    this.size = 22;
  }
  setWaypoints(list) {
    this.waypoints = list;
  }
  update(dt, game) {
    const player = game.player;
    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    let target = null;
    if (dist < this.aggroRange) target = player.pos;
    else if (this.waypoints.length) target = this.waypoints[this.currentWP];

    if (target) {
      const dirX = target.x - this.pos.x;
      const dirY = target.y - this.pos.y;
      const len = Math.hypot(dirX, dirY) || 1;
      const spd = target === player.pos ? this.speed * 1.1 : this.speed;
      this.pos.x += (dirX / len) * spd * dt;
      if (game.map.isBlocked(this.pos.x, this.pos.y)) this.pos.x -= (dirX / len) * spd * dt;
      this.pos.y += (dirY / len) * spd * dt;
      if (game.map.isBlocked(this.pos.x, this.pos.y)) this.pos.y -= (dirY / len) * spd * dt;

      if (target !== player.pos && Math.hypot(dirX, dirY) < 12 && this.waypoints.length) {
        this.currentWP = (this.currentWP + 1) % this.waypoints.length;
      }
    }

    // Shooting at player
    this.fireCooldown -= dt;
    if (dist < this.noticeRange && this.fireCooldown <= 0) {
      const angle = Math.atan2(dy, dx);
      game.bullets.push(new Bullet(this.pos.x, this.pos.y, angle, 360, this.damage, this));
      this.fireCooldown = this.fireRate;
    }

    if (this.health <= 0) this.dead = true;
  }
  takeDamage(dmg) {
    this.health -= dmg;
  }
  draw(ctx, camera) {
    const x = this.pos.x - camera.x;
    const y = this.pos.y - camera.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = this.type === 'patrol' ? '#d99393' : '#c7a86d';
    ctx.beginPath();
    ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.fill();
    ctx.fillStyle = '#1c1f2a';
    ctx.fillRect(-this.size / 4, -this.size / 4, this.size / 2, this.size / 2);
    ctx.restore();
  }
}

class ContainerLoot {
  constructor(x, y) {
    this.pos = { x, y };
    this.size = 26;
    this.opened = false;
    this.lootTable = [
      new InventoryItem('Scrap Metal', 2, '#9fa6b1'),
      new InventoryItem('Cloth', 2, '#c9d6ff'),
      new InventoryItem('Gun Parts', 1, '#d9c48f'),
      new InventoryItem('Bottle', 1, '#88b6d1'),
      new InventoryItem('Fuel', 1, '#d99a5c'),
      new InventoryItem('Alcohol', 1, '#a987ff'),
    ];
  }
  interact(player) {
    if (this.opened) return null;
    const loot = this.lootTable[Math.floor(Math.random() * this.lootTable.length)];
    this.opened = true;
    return loot;
  }
  draw(ctx, camera) {
    const x = this.pos.x - camera.x;
    const y = this.pos.y - camera.y;
    ctx.fillStyle = this.opened ? '#4e4e4e' : '#8c7c52';
    ctx.fillRect(x - this.size / 2, y - this.size / 2, this.size, this.size);
    ctx.strokeStyle = '#2d2413';
    ctx.strokeRect(x - this.size / 2, y - this.size / 2, this.size, this.size);
  }
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.last = 0;
    this.input = new Input();
    this.assets = new Assets();
    this.map = new GameMap();
    this.camera = new Camera(this.width, this.height);
    this.bullets = [];
    this.enemies = [];
    this.containers = [];
    this.inventory = new Inventory();
    this.crafting = new CraftingSystem(this.inventory);
    this.player = new Player(200, 200, this.input, this.bullets, this.inventory);
    this.state = 'title'; // title, play, gameover
    this.paused = false;

    this.createWorld();
    this.bindEvents();
    requestAnimationFrame(this.loop.bind(this));
  }
  bindEvents() {
    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.camera.width = this.width;
      this.camera.height = this.height;
    });
    this.canvas.addEventListener('click', () => {
      if (this.state === 'title') this.state = 'play';
      if (this.state === 'gameover') this.reset();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.paused = !this.paused;
      if (e.key.toLowerCase() === 'e') this.tryInteract();
      if (e.key.toLowerCase() === 'i') this.showInventory = !this.showInventory;
      if (e.key.toLowerCase() === 'c') this.showCrafting = !this.showCrafting;
      if (this.showCrafting) {
        const num = parseInt(e.key);
        if (!isNaN(num) && this.crafting.recipes[num - 1]) {
          this.crafting.craft(this.crafting.recipes[num - 1]);
        }
      }
    });
  }
  createWorld() {
    // enemies with patrol routes
    const patrol1 = new Enemy(600, 520, 'patrol');
    patrol1.setWaypoints([{ x: 600, y: 520 }, { x: 900, y: 520 }, { x: 900, y: 750 }, { x: 600, y: 750 }]);
    const patrol2 = new Enemy(1200, 400, 'bandit');
    patrol2.setWaypoints([{ x: 1200, y: 400 }, { x: 1400, y: 400 }, { x: 1400, y: 600 }]);
    this.enemies.push(patrol1, patrol2);

    // loot containers
    for (let i = 0; i < 10; i++) {
      this.containers.push(new ContainerLoot(randRange(200, 1800), randRange(200, 1800)));
    }
  }
  reset() {
    this.enemies = [];
    this.bullets = [];
    this.containers = [];
    this.inventory = new Inventory();
    this.crafting = new CraftingSystem(this.inventory);
    this.player = new Player(200, 200, this.input, this.bullets, this.inventory);
    this.state = 'play';
    this.paused = false;
    this.createWorld();
  }
  tryInteract() {
    const p = this.player.pos;
    this.containers.forEach((c) => {
      const dist = Math.hypot(c.pos.x - p.x, c.pos.y - p.y);
      if (dist < 40) {
        const loot = c.interact(this.player);
        if (loot) this.inventory.add(loot);
      }
    });
  }
  loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - this.last) / 1000);
    this.last = timestamp;

    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }
  update(dt) {
    if (this.state !== 'play' || this.paused) return;
    this.player.update(dt, this);
    this.enemies.forEach((e) => e.update(dt, this));
    this.bullets.forEach((b) => b.update(dt, this));

    // collisions bullets
    this.bullets.forEach((b) => {
      if (b.dead) return;
      if (b.owner === this.player) {
        this.enemies.forEach((e) => {
          const d = Math.hypot(e.pos.x - b.pos.x, e.pos.y - b.pos.y);
          if (d < (e.size + b.size) / 2) {
            e.takeDamage(b.damage);
            b.dead = true;
            if (e.dead) this.player.gainXP(25);
          }
        });
      } else {
        const d = Math.hypot(this.player.pos.x - b.pos.x, this.player.pos.y - b.pos.y);
        if (d < (this.player.size + b.size) / 2) {
          this.player.health -= b.damage;
          b.dead = true;
          if (this.player.health <= 0) this.state = 'gameover';
        }
      }
    });

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);

    this.camera.follow(this.player, this.map);
  }
  renderParallax() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0e1117';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(-this.camera.x * 0.2, -this.camera.y * 0.2);
    ctx.fillStyle = '#1b2733';
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc((i * 200) % (this.width * 3), (i * 120) % (this.height * 3), 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  render() {
    this.renderParallax();
    if (this.state === 'title') {
      this.drawTitle();
      return;
    }
    if (this.state === 'gameover') {
      this.drawGameOver();
      return;
    }

    // Main scene
    this.map.draw(this.ctx, this.camera);
    this.containers.forEach((c) => c.draw(this.ctx, this.camera));
    this.enemies.forEach((e) => e.draw(this.ctx, this.camera));
    this.bullets.forEach((b) => b.draw(this.ctx, this.camera));
    this.player.draw(this.ctx, this.camera);

    this.drawHUD();
    if (this.paused) this.drawPauseMenu();
    if (this.showInventory) this.drawInventory();
    this.crafting.draw(this.ctx, this.width, this.height, this.showCrafting);
  }
  drawTitle() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0f141a';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#d7e1ff';
    ctx.font = '48px serif';
    ctx.fillText('Shadows of the Motherland', this.width / 2 - 240, this.height / 2 - 20);
    ctx.font = '20px monospace';
    ctx.fillText('Click to Start', this.width / 2 - 70, this.height / 2 + 30);
  }
  drawGameOver() {
    this.renderParallax();
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#ffb3b3';
    ctx.font = '42px serif';
    ctx.fillText('You Died', this.width / 2 - 80, this.height / 2 - 20);
    ctx.font = '20px monospace';
    ctx.fillText('Click to restart', this.width / 2 - 80, this.height / 2 + 20);
  }
  drawHUD() {
    const ctx = this.ctx;
    // Health & stamina
    ctx.fillStyle = '#1c242e';
    ctx.fillRect(20, 20, 200, 18);
    ctx.fillRect(20, 44, 200, 12);
    ctx.fillStyle = '#e76f51';
    ctx.fillRect(20, 20, (this.player.health / this.player.maxHealth) * 200, 18);
    ctx.fillStyle = '#6ab8a6';
    ctx.fillRect(20, 44, (this.player.stamina / this.player.maxStamina) * 200, 12);
    ctx.strokeStyle = '#45505f';
    ctx.strokeRect(20, 20, 200, 18);
    ctx.strokeRect(20, 44, 200, 12);

    // XP bar
    ctx.fillStyle = '#11161d';
    ctx.fillRect(this.width / 2 - 150, this.height - 24, 300, 12);
    const needed = this.player.level * 100;
    ctx.fillStyle = '#9ab8ff';
    ctx.fillRect(this.width / 2 - 150, this.height - 24, (this.player.xp / needed) * 300, 12);
    ctx.strokeStyle = '#3b4656';
    ctx.strokeRect(this.width / 2 - 150, this.height - 24, 300, 12);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#d7e1ff';
    ctx.fillText(`Level ${this.player.level}`, this.width / 2 - 10, this.height - 28);

    // Ammo placeholder
    ctx.font = '16px monospace';
    ctx.fillText('Ammo: ∞', this.width - 120, this.height - 20);
  }
  drawInventory() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(15,20,26,0.9)';
    ctx.fillRect(20, 80, 300, 360);
    ctx.strokeStyle = '#556070';
    ctx.strokeRect(20, 80, 300, 360);
    ctx.fillStyle = '#d7e1ff';
    ctx.font = '18px sans-serif';
    ctx.fillText('Inventory', 30, 105);
    this.inventory.items.forEach((item, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = 30 + col * 90;
      const y = 130 + row * 90;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, y, 80, 80);
      ctx.strokeStyle = '#5b6673';
      ctx.strokeRect(x, y, 80, 80);
      ctx.fillStyle = item.color;
      ctx.fillRect(x + 10, y + 10, 30, 30);
      ctx.fillStyle = '#d7e1ff';
      ctx.font = '12px monospace';
      ctx.fillText(item.name, x + 8, y + 55);
      ctx.fillText('x' + item.quantity, x + 8, y + 70);
    });
  }
  drawPauseMenu() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#d7e1ff';
    ctx.font = '26px serif';
    ctx.fillText('Paused', this.width / 2 - 50, this.height / 2 - 40);
    ctx.font = '16px monospace';
    ctx.fillText('Esc - Resume | I - Inventory | C - Crafting', this.width / 2 - 170, this.height / 2 - 10);
    ctx.fillText('WASD - Move | Mouse - Aim/Fire | Shift - Sprint | E - Interact', this.width / 2 - 230, this.height / 2 + 14);
  }
}

// Bootstrap once DOM ready
window.addEventListener('DOMContentLoaded', () => {
  const loading = document.getElementById('loading');
  const canvas = document.getElementById('game');
  new Game(canvas);
  loading.remove();
});
