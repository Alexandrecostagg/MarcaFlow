// public/a11y.js — Acessibilidade (WCAG 2.1 AA)

const A11y = {
  init() {
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupAnnouncements();
    this.setupContrast();
    this.log('Acessibilidade inicializada');
  },

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.trackFocus();
      }
      if (e.key === 'Escape') {
        this.closeModals();
      }
    });
  },

  trackFocus() {
    const active = document.activeElement;
    if (active) {
      active.setAttribute('data-focused', 'true');
    }
  },

  setupFocusManagement() {
    const focusableSelectors = [
      'button',
      'input',
      'select',
      'textarea',
      'a[href]',
      '[tabindex]'
    ].join(', ');

    document.addEventListener('click', (e) => {
      const target = e.target.closest(focusableSelectors);
      if (target) {
        target.focus();
      }
    });
  },

  setupAnnouncements() {
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    this.announcer.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);';
    document.body.appendChild(this.announcer);
  },

  announce(message, priority = 'polite') {
    if (this.announcer) {
      this.announcer.setAttribute('aria-live', priority);
      this.announcer.textContent = message;
      setTimeout(() => {
        this.announcer.textContent = '';
      }, 1000);
    }
  },

  setupContrast() {
    const minContrast = 4.5;
    this.checkContrast();
  },

  checkContrast() {
    const elements = document.querySelectorAll('[style*="color"]');
    elements.forEach(el => {
      const computed = getComputedStyle(el);
      const bgColor = computed.backgroundColor;
      const fgColor = computed.color;
      
      if (bgColor && fgColor) {
        const ratio = this.getContrastRatio(bgColor, fgColor);
        if (ratio < 4.5) {
          console.warn(`Contraste insuficiente em ${el.tagName}: ${ratio}:1 (min: 4.5:1)`);
        }
      }
    });
  },

  getContrastRatio(bg, fg) {
    const bgRGB = this.parseColor(bg);
    const fgRGB = this.parseColor(fg);
    
    const bgLum = this.getLuminance(bgRGB);
    const fgLum = this.getLuminance(fgRGB);
    
    const lighter = Math.max(bgLum, fgLum);
    const darker = Math.min(bgLum, fgLum);
    
    return (lighter + 0.05) / (darker + 0.05);
  },

  parseColor(color) {
    const match = color.match(/(\d+)/g);
    if (!match) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(match[0]),
      g: parseInt(match[1]),
      b: parseInt(match[2])
    };
  },

  getLuminance({ r, g, b }) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  closeModals() {
    const modals = document.querySelectorAll('[role="dialog"]');
    modals.forEach(modal => {
      modal.style.display = 'none';
    });
    this.announce('Modal fechado');
  },

  addAriaLabels() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      if (!button.getAttribute('aria-label')) {
        const text = button.textContent.trim();
        if (text) {
          button.setAttribute('aria-label', text);
        }
      }
    });

    const links = document.querySelectorAll('a');
    links.forEach(link => {
      if (!link.getAttribute('aria-label')) {
        const text = link.textContent.trim();
        if (text) {
          link.setAttribute('aria-label', text);
        }
      }
    });

    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
        const placeholder = input.getAttribute('placeholder');
        if (placeholder) {
          input.setAttribute('aria-label', placeholder);
        }
      }
    });
  },

  enableKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            this.announce('Salvando...');
            if (typeof saveCurrentView === 'function') saveCurrentView();
            break;
          case 'b':
            e.preventDefault();
            this.toggleSidebar();
            break;
          case 'n':
            e.preventDefault();
            this.openNewBrandModal();
            break;
          case 'h':
            e.preventDefault();
            this.showHelp();
            break;
        }
      }
    });
  },

  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      this.announce(isCollapsed ? 'Menu colapsado' : 'Menu expandido');
    }
  },

  openNewBrandModal() {
    const modal = document.querySelector('[data-modal="new-brand"]');
    if (modal) {
      modal.style.display = 'flex';
      modal.focus();
      this.announce('Novo formulário de marca aberto');
    }
  },

  showHelp() {
    const help = document.querySelector('[data-help]');
    if (help) {
      help.style.display = 'block';
      help.focus();
      this.announce('Ajuda aberta');
    }
  },

  log(message) {
    console.log(`[A11y] ${message}`);
  }
};

export default A11y;
