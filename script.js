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

    // Smaller cellSize = more cells
    this.cellSize = 6;
    this.cols = 0;
    this.rows = 0;
    this.grid = null;
    this.nextGrid = null;

    this.lastFrameTime = 0;
    this.frameInterval = 80; // ms between generations
    this.running = false;    // start paused

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

    // Initial seed: Illinois I + corner gliders
    this.seedIlliniLogo();
    this.draw();
  }

  index(x, y) {
    return y * this.cols + x;
  }

  clear() {
    if (this.grid) this.grid.fill(0);
    if (this.nextGrid) this.nextGrid.fill(0);
  }

  // ------- Glider placement (down-right moving glider) -------

  placeGlider(x, y) {
    // Canonical glider:
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

  seedCornerGliders() {
    if (this.cols < 10 || this.rows < 10) return;

    // Top-left
    this.placeGlider(10, 10);

    // Top-right
    this.placeGlider(this.cols - 14, 10);

    // Bottom-left
    this.placeGlider(10, this.rows - 14);

    // Bottom-right
    this.placeGlider(this.cols - 14, this.rows - 14);
  }

  // ------- Illinois "I" pattern in the center -------

  seedIlliniLogo() {
    this.clear();
    if (this.cols < 10 || this.rows < 10) return;

    const pattern = [
      "0001111111000", // top bar
      "0001111111000",
      "0000011100000", // vertical stroke
      "0000011100000",
      "0000011100000",
      "0000011100000",
      "0000011100000",
      "0000011100000",
      "0000011100000",
      "0000011100000",
      "0000011100000",
      "0001111111000", // bottom bar
      "0001111111000",
    ];

    const ph = pattern.length;
    const pw = pattern[0].length;

    const startX = Math.floor(this.cols / 2 - pw / 2);
    const startY = Math.floor(this.rows / 2 - ph / 2);

    for (let y = 0; y < ph; y++) {
      const row = pattern[y];
      for (let x = 0; x < pw; x++) {
        if (row[x] === "1") {
          const gx = startX + x;
          const gy = startY + y;
          if (gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows) {
            this.grid[this.index(gx, gy)] = 1;
          }
        }
      }
    }

    // Add four gliders in the corners after drawing the I
    this.seedCornerGliders();
  }

  // Public reset helper: Illinois + corner gliders + pause + redraw
  reset() {
    this.running = false;
    this.seedIlliniLogo();
    this.draw();
  }

  // ------- Interaction -------

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

  // ------- Simulation core -------

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

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, height);

    // Background: Illinois blue
    ctx.fillStyle = "#13294b";
    ctx.fillRect(0, 0, width, height);

    // Alive cells: Illinois orange
    ctx.fillStyle = "#e84a27";
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

    // Grid lines: darker blue
    ctx.strokeStyle = "#0b172b";
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
  const resetBtn = document.getElementById("gol-reset");

  function refreshPlayButton() {
    if (!toggleBtn) return;
    toggleBtn.textContent = gol.running ? "Pause" : "Play";
    toggleBtn.setAttribute("aria-pressed", gol.running ? "true" : "false");
  }

  // Initial: paused → shows "Play"
  refreshPlayButton();

  // Click inside the canvas to toggle cells
  canvas.addEventListener("click", (event) => {
    gol.toggleAtClientCoord(event.clientX, event.clientY);
  });

  // Play / Pause button
  if (toggleBtn) {
    toggleBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      gol.running = !gol.running;
      refreshPlayButton();
    });
  }

  // Reset button: restore Illinois logo + corner gliders and pause
  if (resetBtn) {
    resetBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      gol.reset();
      refreshPlayButton();
    });
  }
});