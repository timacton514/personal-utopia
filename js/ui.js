import { NOVEL_SEGMENTS } from './novel-data.js';

export class UIManager {
  constructor() {
    this.container = document.getElementById('segments-container');
    this.navList = document.getElementById('nav-list');
    this.navPanel = document.getElementById('nav-panel');
    this.navToggle = document.getElementById('nav-toggle');
    this.progressFill = document.getElementById('progress-fill');
    this.loading = document.getElementById('loading');

    this.chapterAnchors = [];
    this.showSideA = true;
    this.showSideB = true;
    this.atmosphereLevel = 3;

    this.init();
  }

  init() {
    this.renderAllSegments();
    this.buildNavigation();
    this.bindEvents();
    this.setupIntersectionObserver();

    // Hide loading screen
    setTimeout(() => {
      this.loading.classList.add('hidden');
      setTimeout(() => this.loading.remove(), 800);
    }, 600);
  }

  renderAllSegments() {
    this.container.innerHTML = '';

    NOVEL_SEGMENTS.forEach((seg, index) => {
      const el = this.renderSegment(seg, index);
      if (el) {
        el.dataset.segmentIndex = index;
        el.dataset.side = seg.side || '';
        el.dataset.character = seg.character || '';
        this.container.appendChild(el);
      }
    });
  }

  renderSegment(seg, index) {
    const el = document.createElement('div');
    el.id = seg.id || `seg-${index}`;

    switch (seg.type) {
      case 'chapter-header':
        el.className = 'segment chapter-header';
        if (seg.chapterNum) {
          el.innerHTML = `<span class="chapter-num">${seg.chapterNum}</span><h2>${seg.title}</h2>`;
        } else {
          el.innerHTML = `<h2>${seg.title}</h2>`;
        }
        this.chapterAnchors.push({ id: el.id, title: seg.title, element: el });
        break;

      case 'poem':
        el.className = 'segment poem';
        if (seg.poemTitle) {
          const titleDiv = document.createElement('div');
          titleDiv.className = 'poem-title';
          titleDiv.textContent = seg.poemTitle;
          el.appendChild(titleDiv);
        }
        seg.content.forEach(line => {
          const p = document.createElement('p');
          p.className = 'line';
          p.textContent = line.text;
          el.appendChild(p);
        });
        break;

      case 'entry':
        // Map character symbols to CSS-safe class names
        const charClassMap = { 'θ': 'theta', 'τ': 'tau', 'τ†': 'tau-dagger' };
        const charClass = charClassMap[seg.character] || '';
        const panelClass = seg.panelClass || charClass;

        el.className = `segment ${panelClass}`;
        if (seg.isDeleted) el.classList.add('deleted');

        // Helper: convert ~~text~~ to strikethrough HTML
        const renderMetaText = (text) => {
          return text.replace(/~~(.+?)~~/g, '<span class="line strikethrough">$1</span>');
        };

        // Metadata header
        if (seg.character || seg.visibility || seg.coordinates || seg.timestamp) {
          const meta = document.createElement('div');
          meta.className = 'meta-header';
          if (seg.character) {
            const charSpan = document.createElement('span');
            charSpan.className = `meta-char char-${charClass}`;
            charSpan.textContent = seg.character;
            meta.appendChild(charSpan);
          }
          if (seg.visibility) {
            const v = document.createElement('span');
            v.innerHTML = `能见度 ${renderMetaText(seg.visibility)}`;
            meta.appendChild(v);
          }
          if (seg.coordinates) {
            const c = document.createElement('span');
            c.innerHTML = renderMetaText(seg.coordinates);
            meta.appendChild(c);
          }
          if (seg.timestamp) {
            const t = document.createElement('span');
            t.innerHTML = renderMetaText(seg.timestamp);
            meta.appendChild(t);
          }
          el.appendChild(meta);

          // Second metadata row for merged panels
          if (seg.metaSecond) {
            const m2 = seg.metaSecond;
            const meta2 = document.createElement('div');
            meta2.className = 'meta-header meta-second';
            if (m2.character) {
              const cs = document.createElement('span');
              cs.className = `meta-char char-${charClassMap[m2.character] || ''}`;
              cs.textContent = m2.character;
              meta2.appendChild(cs);
            }
            if (m2.visibility) {
              const v = document.createElement('span');
              v.innerHTML = `能见度 ${renderMetaText(m2.visibility)}`;
              meta2.appendChild(v);
            }
            if (m2.coordinates) {
              const c = document.createElement('span');
              c.innerHTML = renderMetaText(m2.coordinates);
              meta2.appendChild(c);
            }
            if (m2.timestamp) {
              const t = document.createElement('span');
              t.innerHTML = renderMetaText(m2.timestamp);
              meta2.appendChild(t);
            }
            el.appendChild(meta2);
          }
        }

        // foldAfter: first N lines visible, rest in a seamless <details>
        if (seg.foldAfter != null && seg.content.length > seg.foldAfter) {
          // Visible lines
          for (let i = 0; i < seg.foldAfter; i++) {
            const line = seg.content[i];
            const p = document.createElement('p');
            p.className = `line ${line.style || ''}`;
            p.textContent = line.text || '';
            el.appendChild(p);
          }
          // Folded lines in <details>
          const details = document.createElement('details');
          details.className = 'inline-fold';
          const summary = document.createElement('summary');
          summary.textContent = seg.summary || '展开';
          details.appendChild(summary);
          for (let i = seg.foldAfter; i < seg.content.length; i++) {
            const line = seg.content[i];
            const p = document.createElement('p');
            p.className = `line ${line.style || ''}`;
            p.textContent = line.text || '';
            details.appendChild(p);
          }
          el.appendChild(details);
          break;
        }

        // Full collapsible wrapper (entire content folded)
        let contentParent = el;
        if (seg.collapsible) {
          const details = document.createElement('details');
          if (seg.defaultOpen) details.open = true;
          const summary = document.createElement('summary');
          summary.textContent = seg.summary || '展开';
          details.appendChild(summary);
          el.appendChild(details);
          contentParent = details;
        }

        // Content lines
        seg.content.forEach(line => {
          const p = document.createElement('p');
          p.className = `line ${line.style || ''}`;
          if (line.html) {
            p.innerHTML = line.html;
          } else {
            p.textContent = line.text || '';
          }
          contentParent.appendChild(p);
        });
        break;

      case 'paper':
        el.className = 'segment paper';
        el.title = '点击查看';
        seg.content.forEach(line => {
          const p = document.createElement('p');
          p.className = `line ${line.style || ''}`;
          p.textContent = line.text || '';
          el.appendChild(p);
        });
        // Click to expand/collapse paper
        el.addEventListener('click', () => {
          el.classList.toggle('paper-expanded');
        });
        break;

      case 'system':
        el.className = 'segment system-msg';
        seg.content.forEach(line => {
          const p = document.createElement('p');
          p.className = `line system-line ${line.style || ''}`;
          p.textContent = line.text || '';
          el.appendChild(p);
        });
        break;

      case 'search':
        el.className = 'segment system-msg';
        const sq = document.createElement('p');
        sq.className = 'search-query';
        sq.textContent = seg.query || '';
        el.appendChild(sq);
        seg.content.forEach(line => {
          const p = document.createElement('p');
          p.className = `line system-line ${line.style || ''}`;
          p.textContent = line.text || '';
          el.appendChild(p);
        });
        break;

      case 'divider':
        el.className = 'segment divider';
        break;

      case 'ending':
        el.className = 'segment ending-panel';
        el.id = 'story-end';
        seg.content.forEach(line => {
          const p = document.createElement('p');
          if (line.style === 'end-symbol') {
            p.className = 'end-symbol';
            p.id = 'restart-btn';
            p.title = '握手，回到起点';
            p.textContent = line.text;
          } else if (line.style === 'end-text') {
            p.className = 'end-text';
            p.textContent = line.text;
          } else if (line.style === 'end-hint') {
            p.className = 'restart-hint';
            p.textContent = line.text;
          }
          el.appendChild(p);
        });
        break;

      default:
        el.className = 'segment';
        if (seg.content) {
          seg.content.forEach(line => {
            const p = document.createElement('p');
            p.className = `line ${line.style || ''}`;
            p.textContent = line.text || '';
            el.appendChild(p);
          });
        }
    }

    return el;
  }

  buildNavigation() {
    this.navList.innerHTML = '';

    // Add title
    const titleLi = document.createElement('li');
    titleLi.textContent = '封面';
    titleLi.dataset.target = 'title-screen';
    titleLi.addEventListener('click', () => {
      document.getElementById('title-screen').scrollIntoView({ behavior: 'smooth' });
      this.closeNav();
    });
    this.navList.appendChild(titleLi);

    this.chapterAnchors.forEach(ch => {
      const li = document.createElement('li');
      li.textContent = ch.title;
      li.dataset.target = ch.id;
      li.addEventListener('click', () => {
        ch.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.closeNav();
      });
      this.navList.appendChild(li);
    });

    // Add end
    const endLi = document.createElement('li');
    endLi.textContent = '故事结束';
    endLi.dataset.target = 'story-end';
    endLi.addEventListener('click', () => {
      document.getElementById('story-end').scrollIntoView({ behavior: 'smooth' });
      this.closeNav();
    });
    this.navList.appendChild(endLi);
  }

  bindEvents() {
    // Nav toggle
    this.navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.navPanel.classList.toggle('hidden');
    });

    // Close nav on outside click
    document.addEventListener('click', (e) => {
      if (!this.navPanel.classList.contains('hidden') &&
          !this.navPanel.contains(e.target) &&
          !this.navToggle.contains(e.target)) {
        this.closeNav();
      }
    });

    // Side filters
    document.getElementById('btn-side-a').addEventListener('click', () => {
      this.showSideA = !this.showSideA;
      document.getElementById('btn-side-a').classList.toggle('active', this.showSideA);
      this.applyFilters();
    });

    document.getElementById('btn-side-b').addEventListener('click', () => {
      this.showSideB = !this.showSideB;
      document.getElementById('btn-side-b').classList.toggle('active', this.showSideB);
      this.applyFilters();
    });

    // Atmosphere toggle — 5 levels
    const applyAtmosphere = (level) => {
      this.atmosphereLevel = level;
      const btn = document.getElementById('btn-atmosphere');
      btn.dataset.level = level;
      const dots = btn.querySelector('.atm-dots');
      if (dots) {
        dots.innerHTML = Array.from({ length: level }, () => '·').join('');
      }
      // Vignette & haze respond to atmosphere
      const a = (level - 1) / 4; // 0 to 1
      const vignette = document.getElementById('vignette');
      if (vignette) {
        vignette.style.background = `radial-gradient(ellipse at center,
          transparent ${70 - a * 30}%,
          rgba(5,2,0, ${0.35 + a * 0.6}) 100%)`;
      }
      const haze = document.getElementById('haze-bottom');
      if (haze) {
        haze.style.background = `linear-gradient(to top,
          rgba(20,8,2, ${0.5 + a * 0.45}), transparent)`;
      }
      if (this.onAtmosphereChange) {
        this.onAtmosphereChange(level);
      }
    };

    document.getElementById('btn-atmosphere').addEventListener('click', () => {
      applyAtmosphere((this.atmosphereLevel % 5) + 1);
    });
    // Init
    applyAtmosphere(this.atmosphereLevel);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeNav();
      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        const dir = e.key === '[' ? -1 : 1;
        this.navigateChapter(dir);
      }
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
        document.getElementById('btn-side-a').click();
      }
      if (e.key === 'b' && !e.ctrlKey && !e.metaKey) {
        document.getElementById('btn-side-b').click();
      }
    });

    // Scroll handler for progress
    window.addEventListener('scroll', () => {
      this.updateProgress();
      if (this.onScroll) this.onScroll(this.getScrollProgress());
    }, { passive: true });

    // Strikethrough click handlers
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('strikethrough') ||
          e.target.closest('.line.strikethrough')) {
        const line = e.target.classList.contains('strikethrough') ? e.target : e.target.closest('.line.strikethrough');
        line.classList.toggle('restored');
      }
    });

    // Restart button: scroll to B-side start (序 零之下)
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        const bSideStart = document.getElementById('preface');
        if (bSideStart) {
          bSideStart.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');

          // Update active nav item
          const segIndex = entry.target.dataset.segmentIndex;
          if (segIndex && this.chapterAnchors.length > 0) {
            this.updateActiveNav(entry.target.id);
          }
        }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('.segment').forEach(el => {
      observer.observe(el);
    });
  }

  updateActiveNav(currentId) {
    const items = this.navList.querySelectorAll('li');
    items.forEach(li => li.classList.remove('active'));

    // Find the closest chapter header before current segment
    for (let i = this.chapterAnchors.length - 1; i >= 0; i--) {
      if (this.chapterAnchors[i].id === currentId ||
          this.isBeforeInDOM(this.chapterAnchors[i].element, document.getElementById(currentId))) {
        const targetId = this.chapterAnchors[i].id;
        items.forEach(li => {
          if (li.dataset.target === targetId) li.classList.add('active');
        });
        break;
      }
    }
  }

  isBeforeInDOM(a, b) {
    if (!a || !b) return false;
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
  }

  applyFilters() {
    document.querySelectorAll('.segment').forEach(el => {
      const side = el.dataset.side;
      if (!side) return; // Don't filter non-content segments

      const showA = this.showSideA && side === 'A';
      const showB = this.showSideB && side === 'B';
      const showMeta = side === 'meta';

      if (showA || showB || showMeta || (this.showSideA && this.showSideB)) {
        el.style.display = '';
        el.style.opacity = '';
      } else if ((side === 'A' && !this.showSideA) || (side === 'B' && !this.showSideB)) {
        el.style.display = 'none';
      }
    });
  }

  navigateChapter(dir) {
    // Find current visible chapter
    let currentIdx = -1;
    const scrollY = window.scrollY + window.innerHeight / 2;

    for (let i = 0; i < this.chapterAnchors.length; i++) {
      const rect = this.chapterAnchors[i].element.getBoundingClientRect();
      const absY = rect.top + window.scrollY;
      if (absY <= scrollY) {
        currentIdx = i;
      }
    }

    const newIdx = Math.max(0, Math.min(this.chapterAnchors.length - 1, currentIdx + dir));
    if (this.chapterAnchors[newIdx]) {
      this.chapterAnchors[newIdx].element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  closeNav() {
    this.navPanel.classList.add('hidden');
  }

  getScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    return docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
  }

  updateProgress() {
    const progress = this.getScrollProgress();
    this.progressFill.style.width = `${progress * 100}%`;
  }
}
