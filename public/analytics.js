// public/analytics.js — Analytics e Tracking

const Analytics = {
  enabled: true,
  userId: null,
  sessionId: null,
  
  init() {
    this.userId = this.generateId();
    this.sessionId = this.generateId();
    this.setupPageTracking();
    this.setupEventTracking();
    this.log('Analytics inicializado');
  },

  generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  },

  setupPageTracking() {
    const observer = new MutationObserver(() => {
      this.trackPageView(window.location.hash || '/dashboard');
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },

  setupEventTracking() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-track]');
      if (target) {
        const event = target.getAttribute('data-track');
        this.trackEvent(event, {
          element: target.tagName,
          label: target.textContent.trim().substring(0, 50)
        });
      }
    });
  },

  trackPageView(path) {
    if (!this.enabled) return;
    
    const data = {
      type: 'page_view',
      path,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      title: document.title
    };
    
    this.sendToFirebase(data);
    this.sendToLocal(data);
  },

  trackEvent(name, params = {}) {
    if (!this.enabled) return;
    
    const data = {
      type: 'event',
      name,
      params,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId
    };
    
    this.sendToFirebase(data);
    this.sendToLocal(data);
  },

  sendToFirebase(data) {
    try {
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        firebase.firestore().collection('analytics').add(data);
      }
    } catch (error) {
      console.warn('Analytics: Erro ao enviar para Firebase', error);
    }
  },

  sendToLocal(data) {
    try {
      const storage = localStorage.getItem('analytics_queue');
      const queue = storage ? JSON.parse(storage) : [];
      queue.push(data);
      
      // Manter apenas últimos 1000 eventos
      if (queue.length > 1000) {
        queue.splice(0, queue.length - 1000);
      }
      
      localStorage.setItem('analytics_queue', JSON.stringify(queue));
    } catch (error) {
      console.warn('Analytics: Erro ao salvar localmente', error);
    }
  },

  // Eventos customizados
  trackSearch(query) {
    this.trackEvent('search', { query });
  },

  trackBrandAction(action, brandId) {
    this.trackEvent('brand_action', { action, brandId });
  },

  trackAlertAction(action, alertId) {
    this.trackEvent('alert_action', { action, alertId });
  },

  trackGRUAction(action, brandId) {
    this.trackEvent('gru_action', { action, brandId });
  },

  trackAnteriorityAction(action, brandName) {
    this.trackEvent('antteriority_action', { action, brandName });
  },

  trackPetitionAction(action, type) {
    this.trackEvent('petition_action', { action, type });
  },

  trackReportAction(action, type) {
    this.trackEvent('report_action', { action, type });
  },

  trackEmarcasAction(action) {
    this.trackEvent('emarcas_action', { action });
  },

  trackFinancialAction(action, type) {
    this.trackEvent('financial_action', { action, type });
  },

  trackClientAction(action, clientId) {
    this.trackEvent('client_action', { action, clientId });
  },

  trackAgentAction(action, query) {
    this.trackEvent('agent_action', { action, query });
  },

  // Métricas de uso
  getMetrics() {
    const queue = JSON.parse(localStorage.getItem('analytics_queue') || '[]');
    
    const metrics = {
      totalEvents: queue.length,
      eventsByType: {},
      eventsByUser: {},
      lastActive: null
    };
    
    queue.forEach(event => {
      if (!metrics.eventsByType[event.type]) {
        metrics.eventsByType[event.type] = 0;
      }
      metrics.eventsByType[event.type]++;
      
      if (!metrics.eventsByUser[event.userId]) {
        metrics.eventsByUser[event.userId] = 0;
      }
      metrics.eventsByUser[event.userId]++;
      
      if (!metrics.lastActive || event.timestamp > metrics.lastActive) {
        metrics.lastActive = event.timestamp;
      }
    });
    
    return metrics;
  },

  // Heatmap de cliques
  trackClicks() {
    const clicks = [];
    document.addEventListener('click', (e) => {
      clicks.push({
        x: e.clientX,
        y: e.clientY,
        tag: e.target.tagName,
        id: e.target.id,
        class: e.target.className,
        timestamp: Date.now()
      });
      
      // Manter apenas últimos 10000 cliques
      if (clicks.length > 10000) {
        clicks.splice(0, clicks.length - 10000);
      }
    });
    
    return clicks;
  },

  // Tempo de sessão
  trackSessionTime() {
    const startTime = Date.now();
    
    return {
      get duration() {
        return Math.floor((Date.now() - startTime) / 1000);
      },
      get startTime() {
        return startTime;
      }
    };
  },

  // Exportar dados para análise
  exportAnalytics() {
    const metrics = this.getMetrics();
    const sessionTime = this.trackSessionTime();
    
    return {
      metrics,
      sessionTime: sessionTime.duration,
      exportDate: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId
    };
  },

  log(message) {
    if (this.enabled) {
      console.log(`[Analytics] ${message}`);
    }
  }
};

export default Analytics;
