// services/loggerService.js
class LoggerService {
    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            userAgent: navigator.userAgent
        };

        // Console output
        console[level === 'ERROR' ? 'error' : 'log'](`[${timestamp}] ${level}: ${message}`, data);

        // Save to localStorage (persistent)
        this.saveToStorage(logEntry);
        
        // Optional: Send to backend
        this.sendToBackend(logEntry);
    }

    saveToStorage(logEntry) {
        try {
            const existingLogs = JSON.parse(localStorage.getItem('app-logs') || '[]');
            existingLogs.push(logEntry);
            
            // Keep only last 100 logs
            if (existingLogs.length > 100) {
                existingLogs.splice(0, existingLogs.length - 100);
            }
            
            localStorage.setItem('app-logs', JSON.stringify(existingLogs));
        } catch (e) {
            console.error('Failed to save log:', e);
        }
    }

    sendToBackend(logEntry) {
        // Optional: Send logs to your backend API
        // fetch('/api/logs', { method: 'POST', body: JSON.stringify(logEntry) })
    }

    downloadLogs() {
        try {
            const logs = JSON.parse(localStorage.getItem('app-logs') || '[]');
            const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shift-logs-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Failed to download logs:', e);
        }
    }

    clearLogs() {
        localStorage.removeItem('app-logs');
    }
}

export const loggerService = new LoggerService();