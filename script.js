// ===== Footer year =====
function setYear() {
  const el = document.getElementById("year");
  if (el) {
    el.textContent = new Date().getFullYear();
  }
}

// ===== Game of Life in hero card =====

class GameOfLife {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });

    // Smaller cellSize -> more cells
    this.cellSize = 8;
    this.cols = 0;
    this.rows = 0;
    this.grid = null;
    this.nextGrid = null;

    this.lastFrameTime = 0;
    this.frameInterval = 80; // ms between generations
    this.running = true; // auto-run like the reference

    window.addEventListener("resize", () => this.handleResize());
    this.handleResize();
  }

  handleResize() {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 320;
    const height = rect.height || 220;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.cols = Math.floor(width / this.cellSize);
    this.rows = Math.floor(height / this.cellSize);

    this.grid = new Uint8Array(this.cols * this.rows);
    this.nextGrid = new Uint8Array(this.cols * this.rows);

    this.seedGliders();
    this.draw();
  }

  index(x, y) {
    return y * this.cols + x;
  }

  clear() {
    if (this.grid) this.grid.fill(0);
    if (this.nextGrid) this.nextGrid.fill(0);
  }

  // Place a single canonical glider (moving down-right) with top-left at (x, y)
  placeGlider(x, y) {
    //  . # .
    //  . . #
    //  # # #
    const pattern = [
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ];

    for (const [dx, dy] of pattern) {
      const gx = x + dx;
      const gy = y + dy;
      if (gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows) {
        this.grid[this.index(gx, gy)] = 1;
      }
    }
  }

  // Seed ~3–4 gliders on the left side, spaced vertically
  seedGliders() {
    this.clear();

    if (this.cols < 5 || this.rows < 5) return;

    const maxGlidersWanted = 4;
    const gliderHeight = 5;
    const spacing = 7;

    const maxPossible =
      Math.floor((this.rows - gliderHeight) / spacing) + 1;
    const count = Math.min(maxGlidersWanted, Math.max(1, maxPossible));

    const startX = 2;
    for (let i = 0; i < count; i++) {
      const baseY = 2 + i * spacing;
      if (baseY + gliderHeight < this.rows) {
        this.placeGlider(startX, baseY);
      }
    }
  }

  // Toggle a cell based on a click inside the canvas
  toggleAtClientCoord(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return;
    if (this.cols === 0 || this.rows === 0) return;

    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);

    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;

    const idx = this.index(col, row);
    this.grid[idx] = this.grid[idx] ? 0 : 1;

    this.draw();
  }

  step() {
    const cols = this.cols;
    const rows = this.rows;
    const g = this.grid;
    const ng = this.nextGrid;

    for (let y = 0; y < rows; y++) {
      const yUp = (y - 1 + rows) % rows;
      const yDown = (y + 1) % rows;

      for (let x = 0; x < cols; x++) {
        const xLeft = (x - 1 + cols) % cols;
        const xRight = (x + 1) % cols;

        let neighbors = 0;
        neighbors += g[this.index(xLeft, yUp)];
        neighbors += g[this.index(x, yUp)];
        neighbors += g[this.index(xRight, yUp)];
        neighbors += g[this.index(xLeft, y)];
        neighbors += g[this.index(xRight, y)];
        neighbors += g[this.index(xLeft, yDown)];
        neighbors += g[this.index(x, yDown)];
        neighbors += g[this.index(xRight, yDown)];

        const idx = this.index(x, y);
        const alive = g[idx];

        if (alive) {
          ng[idx] = neighbors === 2 || neighbors === 3 ? 1 : 0;
        } else {
          ng[idx] = neighbors === 3 ? 1 : 0;
        }
      }
    }

    const tmp = this.grid;
    this.grid = this.nextGrid;
    this.nextGrid = tmp;
  }

  draw() {
    const ctx = this.ctx;
    const cellSize = this.cellSize;
    const cols = this.cols;
    const rows = this.rows;
    const g = this.grid;

    if (!ctx || !g) return;

    const rect = this.canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Background: pure black
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Alive cells: white
    ctx.fillStyle = "#ffffff";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (g[this.index(x, y)]) {
          ctx.fillRect(
            x * cellSize + 1,
            y * cellSize + 1,
            cellSize - 2,
            cellSize - 2
          );
        }
      }
    }

    // Grid lines: dark gray
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1;

    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize + 0.5, 0);
      ctx.lineTo(x * cellSize + 0.5, rows * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize + 0.5);
      ctx.lineTo(cols * cellSize, y * cellSize + 0.5);
      ctx.stroke();
    }
  }

  update(now) {
    if (now - this.lastFrameTime >= this.frameInterval) {
      this.lastFrameTime = now;

      if (this.running) {
        this.step();
      }
      this.draw();
    }

    requestAnimationFrame((t) => this.update(t));
  }

  start() {
    requestAnimationFrame((t) => {
      this.lastFrameTime = t;
      this.update(t);
    });
  }
}

// ===== Wire everything up =====

document.addEventListener("DOMContentLoaded", () => {
  setYear();

  const canvas = document.getElementById("gol-canvas");
  if (!canvas) return;

  const gol = new GameOfLife(canvas);
  gol.start();

  const toggleBtn = document.getElementById("gol-toggle");

  function refreshButton() {
    if (!toggleBtn) return;
    toggleBtn.textContent = gol.running ? "Pause" : "Play";
    toggleBtn.setAttribute("aria-pressed", gol.running ? "true" : "false");
  }

  refreshButton();

  // Click inside the canvas to toggle cells
  canvas.addEventListener("click", (event) => {
    gol.toggleAtClientCoord(event.clientX, event.clientY);
  });

  // Play / Pause button
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      gol.running = !gol.running;
      refreshButton();
    });
  }
});