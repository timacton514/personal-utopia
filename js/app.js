import { MarsScene } from './scene.js';
import { UIManager } from './ui.js';

class App {
  constructor() {
    this.scene = null;
    this.ui = null;
    this.init();
  }

  init() {
    // Initialize 3D scene
    const canvas = document.getElementById('mars-scene');
    this.scene = new MarsScene(canvas);

    // Initialize UI
    this.ui = new UIManager();

    // Wire up UI callbacks
    this.ui.onScroll = (progress) => {
      this.scene.setFromProgress(progress);
    };

    this.ui.onAtmosphereChange = (level) => {
      this.scene.atmosphereLevel = level;
    };

    // Initial scene state
    this.scene.setFromProgress(0);

    // Start render loop
    this.animate();

    // Handle initial hash navigation
    if (window.location.hash) {
      setTimeout(() => {
        const el = document.getElementById(window.location.hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 800);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.scene.render();
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
