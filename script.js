// Simple configuration for blog posts.
// To add a post: create blog/<slug>.md and add an entry here.
const BLOG_POSTS = [
  {
    id: "hardware-aware-ai",
    title: "Hardware-Aware AI Acceleration Notes",
    date: "2025-08-30",
    summary: "Some notes on mapping neural networks onto FPGAs and dealing with quantization, memory, and dataflow.",
    file: "blog/hardware-aware-ai.md"
  },
  {
    id: "rtl-power-modelling",
    title: "Experiments in RTL-Level Power Modelling",
    date: "2025-09-14",
    summary: "A high-level overview of modeling dynamic power at the RTL and validating predictions against commercial tools.",
    file: "blog/rtl-power-modelling.md"
  }
];

// Utility: format YYYY-MM-DD into a nicer string.
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// Render the list of blog posts into #blog-post-list.
function renderBlogList() {
  const container = document.getElementById("blog-post-list");
  if (!container) return;
  container.innerHTML = "";

  BLOG_POSTS.sort((a, b) => (a.date < b.date ? 1 : -1));

  BLOG_POSTS.forEach((post) => {
    const item = document.createElement("div");
    item.className = "blog-list-item";
    item.dataset.postId = post.id;

    item.innerHTML = `
      <div class="blog-list-title-row">
        <div class="blog-list-title">${post.title}</div>
        <div class="blog-list-date">${formatDate(post.date)}</div>
      </div>
      <div class="blog-list-summary">${post.summary}</div>
    `;

    item.addEventListener("click", () => {
      loadPost(post);
    });

    container.appendChild(item);
  });
}

// Load a markdown file and render it into #blog-post-view.
async function loadPost(post) {
  const view = document.getElementById("blog-post-view");
  if (!view) return;

  view.innerHTML = `<p>Loading <em>${post.title}</em>…</p>`;

  try {
    const response = await fetch(post.file);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    const html = marked.parse(text);

    view.innerHTML = `
      <h3>${post.title}</h3>
      <p class="blog-list-date">${formatDate(post.date)}</p>
      <div class="blog-markdown">
        ${html}
      </div>
    `;
  } catch (err) {
    console.error(err);
    view.innerHTML = `
      <h3>${post.title}</h3>
      <p>Sorry, I couldn't load this post. Make sure <code>${post.file}</code> exists in the <code>/blog</code> folder.</p>
    `;
  }
}

// Set footer year.
function setYear() {
  const el = document.getElementById("year");
  if (el) {
    el.textContent = new Date().getFullYear();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderBlogList();
  setYear();
});
