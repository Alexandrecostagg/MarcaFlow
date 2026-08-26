// public/backup.js — Backup Automatizado

import { data, load, save } from "./store.js?v=2026.08.29";

const Backup = {
  enabled: true,
  schedule: 'daily',
  lastBackup: null,

  init() {
    this.setupSchedule();
    this.checkAndBackup();
    this.log('Backup inicializado');
  },

  setupSchedule() {
    if (this.schedule === 'daily') {
      this.checkBackupTime();
    }

    let inactivityTimer;
    document.addEventListener('mousemove', () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        this.manualBackup('inatividade');
      }, 30 * 60 * 1000);
    });
  },

  checkBackupTime() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    if (hour === 23 && minute >= 0 && minute < 5) {
      this.dailyBackup();
    }

    setTimeout(() => this.checkBackupTime(), 60 * 1000);
  },

  checkAndBackup() {
    const lastBackup = localStorage.getItem('last_backup');
    const lastBackupDate = lastBackup ? new Date(lastBackup) : null;

    if (!lastBackupDate || this.isDifferentDay(lastBackupDate)) {
      this.dailyBackup();
    } else {
      this.log('Backup diário já realizado hoje');
    }
  },

  isDifferentDay(date) {
    const today = new Date();
    return date.getDate() !== today.getDate() ||
           date.getMonth() !== today.getMonth() ||
           date.getFullYear() !== today.getFullYear();
  },

  dailyBackup() {
    this.manualBackup('diário');
  },

  snapshot() {
    try {
      return JSON.parse(JSON.stringify(load()));
    } catch (_) {
      return JSON.parse(JSON.stringify(data));
    }
  },

  manualBackup(reason = 'manual') {
    if (!this.enabled) {
      this.log('Backup desabilitado');
      return;
    }

    this.log(`Iniciando backup (${reason})...`);

    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        reason,
        workspace: this.snapshot()
      };

      localStorage.setItem('backup_' + Date.now(), JSON.stringify(backupData));
      localStorage.setItem('last_backup', new Date().toISOString());
      this.lastBackup = new Date().toISOString();

      this.notifyBackup(backupData);
      this.log('Backup concluído com sucesso');
    } catch (error) {
      this.log('Erro ao fazer backup:', error);
      this.notifyError(error);
    }
  },

  sendToFirebase(_backupData) {
    // O workspace em nuvem já é espelhado pelo firebase-service.js.
  },

  notifyBackup(backupData) {
    const workspace = backupData.workspace || {};
    const processes = (workspace.processes || []).length;
    const clients = (workspace.clients || []).length;
    const notification = document.createElement('div');
    notification.className = 'backup-notification success';
    notification.innerHTML = `
      <div class="backup-icon">✓</div>
      <div class="backup-content">
        <strong>Backup concluído!</strong>
        <p>${processes} processos, ${clients} clientes</p>
        <p class="backup-time">${new Date(backupData.timestamp).toLocaleString('pt-BR')}</p>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  },

  notifyError(error) {
    const notification = document.createElement('div');
    notification.className = 'backup-notification error';
    notification.innerHTML = `
      <div class="backup-icon">✗</div>
      <div class="backup-content">
        <strong>Erro ao fazer backup</strong>
        <p>${error.message || 'Erro desconhecido'}</p>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 5000);
    }, 3000);
  },

  restoreBackup(backupId) {
    try {
      const backupData = JSON.parse(localStorage.getItem(backupId));

      if (!backupData) {
        this.notifyError(new Error('Backup não encontrado'));
        return;
      }

      if (!confirm('Deseja restaurar este backup? Todos os dados atuais serão substituídos.')) {
        return;
      }

      if (!backupData.workspace) {
        this.notifyError(new Error('Backup em formato antigo. Exporte o workspace atual e reimporte.'));
        return;
      }

      const restored = backupData.workspace;
      const current = load();
      Object.keys(current).forEach(key => {
        if (!(key in restored)) restored[key] = current[key];
      });
      Object.assign(data, restored);
      save();

      this.notify('Backup restaurado com sucesso!');
      this.log('Backup restaurado:', backupId);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      this.notifyError(error);
    }
  },

  importWorkspace(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (_) {
      throw new Error("Arquivo inválido: JSON incorreto.");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Backup inválido: esperado um workspace.");
    }
    if (!["clients", "processes", "documents", "movements", "imports"].some(key => Array.isArray(parsed[key]))) {
      throw new Error("Backup inválido: coleções não encontradas.");
    }
    if (!confirm("Substituir todos os dados atuais por este backup?")) {
      throw new Error("Restauração cancelada.");
    }
    const current = load();
    Object.keys(current).forEach(key => {
      if (!(key in parsed)) parsed[key] = current[key];
    });
    Object.assign(data, parsed);
    save();
    return true;
  },

  listBackups() {
    const backups = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('backup_')) {
        try {
          const backupData = JSON.parse(localStorage.getItem(key));
          const workspace = backupData.workspace || {};
          backups.push({
            id: key,
            timestamp: backupData.timestamp,
            processes: (workspace.processes || []).length,
            clients: (workspace.clients || []).length
          });
        } catch (error) {
          console.warn('Erro ao ler backup:', key);
        }
      }
    }

    return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  deleteBackup(backupId) {
    if (confirm('Deseja excluir este backup?')) {
      localStorage.removeItem(backupId);
      this.log('Backup excluído:', backupId);
      this.notify('Backup excluído');
    }
  },

  exportBackup() {
    const backups = this.listBackups();
    const exportData = {
      exportDate: new Date().toISOString(),
      totalBackups: backups.length,
      backups
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marcaflow_backups_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.log('Exportação de backups concluída');
  },

  log(message, ...args) {
    if (this.enabled) {
      console.log(`[Backup] ${message}`, ...args);
    }
  },

  notify(message) {
    const notification = document.createElement('div');
    notification.className = 'backup-notification info';
    notification.innerHTML = `
      <div class="backup-icon">ℹ</div>
      <div class="backup-content">
        <strong>${message}</strong>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 3000);
    }, 3000);
  }
};

export default Backup;
