// Netlify Build Plugin: build-blog-index
//
// Runs automatically on every deploy (including ones triggered by Decap CMS
// publishing a new post). It scans blog/entries/*.md, reads the frontmatter
// + body that Decap CMS writes, and regenerates blog/posts.json — the file
// the live site's blog page actually fetches and renders.
//
// No npm dependencies — written using only Node's built-in modules so it
// runs instantly with no install step.

const fs = require('fs');
const path = require('path');

const ENTRIES_DIR = path.join(process.cwd(), 'blog', 'entries');
const OUTPUT_FILE = path.join(process.cwd(), 'blog', 'posts.json');

// Minimal frontmatter parser: handles the simple "key: value" YAML
// that Decap CMS writes for this content model. Avoids needing a
// third-party YAML library.
function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };

  const [, frontmatterBlock, body] = match;
  const data = {};
  let currentKey = null;

  frontmatterBlock.split('\n').forEach(line => {
    const kvMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (kvMatch) {
      let [, key, value] = kvMatch;
      value = value.trim();
      // Strip surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      data[key] = value;
      currentKey = key;
    }
  });

  return { data, body: body.trim() };
}

// Very small markdown -> HTML converter covering the basics Decap's
// markdown widget produces: paragraphs, **bold**, *italic*, links,
// and line breaks. Good enough for blog body copy without pulling in
// a full markdown library.
function markdownToHtml(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');

  // Bold / italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Paragraphs: split on blank lines, wrap remaining lines in <p>
  const blocks = html.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  html = blocks.map(b => {
    if (/^<h[23]>/.test(b)) return b;
    return '<p>' + b.replace(/\n/g, '<br>') + '</p>';
  }).join('\n');

  return html;
}

module.exports = {
  onPreBuild: async ({ utils }) => {
    try {
      if (!fs.existsSync(ENTRIES_DIR)) {
        console.log('[build-blog-index] No blog/entries directory found yet — skipping.');
        return;
      }

      const files = fs.readdirSync(ENTRIES_DIR).filter(f => f.endsWith('.md'));
      console.log(`[build-blog-index] Found ${files.length} post file(s) in blog/entries/`);

      const posts = files.map(filename => {
        const raw = fs.readFileSync(path.join(ENTRIES_DIR, filename), 'utf8');
        const { data, body } = parseFrontmatter(raw);

        return {
          slug: data.slug || filename.replace(/\.md$/, ''),
          title: data.title || 'Untitled post',
          excerpt: data.excerpt || '',
          body: markdownToHtml(body),
          category: data.category || '',
          date: data.date || '',
          image: data.image || '',
          featured: data.featured === true || data.featured === 'true'
        };
      });

      // Newest first
      posts.sort((a, b) => new Date(b.date) - new Date(a.date));

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2));
      console.log(`[build-blog-index] Wrote ${posts.length} post(s) to blog/posts.json`);
    } catch (err) {
      utils.build.failBuild('build-blog-index plugin failed', { error: err });
    }
  }
};
