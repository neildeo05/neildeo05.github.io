// ===== Footer year =====
function setYear() {
  const el = document.getElementById("year");
  if (el) {
    el.textContent = new Date().getFullYear();
  }
}

// ===== Game of Life background =====

class GameOfLife {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });

    // Adjust cell size to taste: smaller = more cells
    this.cellSize = 9;
    this.cols = 0;
    this.rows = 0;
    this.grid = null;
    this.nextGrid = null;

    this.lastFrameTime = 0;
    this.frameInterval = 80; // ms between generations
    this.running = false; // start paused

    window.addEventListener("resize", () => this.handleResize());
    this.handleResize();
  }

  handleResize() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.cols = Math.floor(width / this.cellSize);
    this.rows = Math.floor(height / this.cellSize);

    this.grid = new Uint8Array(this.cols * this.rows);
    this.nextGrid = new Uint8Array(this.cols * this.rows);

    // Seed with several gliders on the left side
    this.seedGliders();
    this.draw();
  }

  index(x, y) {
    return y * this.cols + x;
  }

  clear() {
    this.grid.fill(0);
    this.nextGrid.fill(0);
  }

  // Place a single canonical glider (moving down-right) with top-left at (x, y)
  placeGlider(x, y) {
    // glider pattern relative offsets
    //  . # .
    //  . . #
    //  # # #
    const pattern = [
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2]
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

    if (this.cols < 5 || this.rows < 5) {
      // Too small to safely place gliders
      return;
    }

    const maxGlidersWanted = 4;
    const gliderHeight = 5;
    const spacing = 7; // rows between gliders

    // How many gliders can we fit vertically?
    const maxPossible = Math.max(
      1,
      Math.floor((this.rows - gliderHeight) / spacing) + 1
    );
    const count = Math.min(maxGlidersWanted, maxPossible);

    const startX = 2; // near left edge
    for (let i = 0; i < count; i++) {
      const baseY = 2 + i * spacing;
      if (baseY + gliderHeight < this.rows) {
        this.placeGlider(startX, baseY);
      }
    }
  }

  // Toggle a cell based on client-space coordinates
  toggleAtClientCoord(clientX, clientY) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.cols === 0 || this.rows === 0) return;

    const xNorm = clientX / width;
    const yNorm = clientY / height;

    const col = Math.floor(xNorm * this.cols);
    const row = Math.floor(yNorm * this.rows);

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

    // Swap grids
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

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Alive cells
    ctx.fillStyle = "#14b8a6"; // teal
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

    // Grid lines
    ctx.strokeStyle = "rgba(30, 64, 175, 0.45)";
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

document.addEventListener("DOMContentLoaded", () => {
  setYear();

  const canvas = document.getElementById("gol-bg");
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

  // Click to toggle cells (ignore clicks on links / buttons)
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target.closest("a, button")) {
      return;
    }
    gol.toggleAtClientCoord(event.clientX, event.clientY);
  });

  // Button to start/stop simulation
  if (toggleBtn) {
    toggleBtn.addEventListener("click", (event) => {
      // Don't let this propagate to the document-level click (which would toggle a cell)
      event.stopPropagation();
      gol.running = !gol.running;
      refreshButton();
    });
  }
});