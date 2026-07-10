(function () {
    const popupStyles = `
#popup-container {
  position: fixed;
    top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: min(90vw, 400px);
  pointer-events: none;
}

.popup-toast {
  min-width: 240px;
  padding: 0.7rem 1rem;
  border-radius: 0.7rem;
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.25s ease, transform 0.25s ease;
  font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
  pointer-events: auto;
}

.popup-toast.visible {
  opacity: 1;
  transform: translateY(0);
}

.popup-toast.info { background: rgba(37, 99, 235, 0.95); }
.popup-toast.success { background: rgba(16, 185, 129, 0.95); }
.popup-toast.warning { background: rgba(234, 179, 8, 0.95); color: #0f172a; }
.popup-toast.error { background: rgba(239, 68, 68, 0.95); }

.confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.62);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
}

.confirm-modal {
    width: min(94vw, 420px);
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(160deg, #0f172a 0%, #111827 100%);
    color: #e2e8f0;
    box-shadow: 0 24px 48px rgba(2, 6, 23, 0.45);
    overflow: hidden;
    transform: translateY(8px) scale(0.98);
    opacity: 0;
    transition: transform 0.2s ease, opacity 0.2s ease;
}

.confirm-modal.visible {
    transform: translateY(0) scale(1);
    opacity: 1;
}

.confirm-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 1rem 1rem 0.35rem;
}

.confirm-icon {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: #fecaca;
    color: #991b1b;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.confirm-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #f8fafc;
}

.confirm-message {
    margin: 0;
    padding: 0.25rem 1rem 1rem;
    color: #cbd5e1;
    font-size: 0.94rem;
    line-height: 1.5;
}

.confirm-actions {
    display: flex;
    gap: 0.65rem;
    padding: 0.95rem 1rem 1rem;
    border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.confirm-btn {
    flex: 1;
    border: none;
    border-radius: 10px;
    padding: 0.62rem 0.95rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s ease, filter 0.2s ease, box-shadow 0.2s ease;
}

.confirm-btn:active {
    transform: translateY(1px);
}

.confirm-btn-cancel {
    background: #334155;
    color: #e2e8f0;
}

.confirm-btn-cancel:hover {
    filter: brightness(1.08);
}

.confirm-btn-ok {
    background: #dc2626;
    color: #fff;
    box-shadow: 0 8px 22px rgba(220, 38, 38, 0.35);
}

.confirm-btn-ok:hover {
    filter: brightness(1.05);
}
`; 
    const styleTag = document.createElement('style');
    styleTag.textContent = popupStyles;
    document.head.appendChild(styleTag);

    const container = document.createElement('div');
    container.id = 'popup-container';
    document.body.appendChild(container);

    function closePopup(el) {
        if (!el) return;
        el.classList.remove('visible');
        setTimeout(() => { if (el && el.parentNode) el.parentNode.removeChild(el); }, 250);
    }

    window.showPopup = function (message, type = 'info', duration = 3000) {
        if (!message) return;
        const toast = document.createElement('div');
        toast.className = `popup-toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        const timeoutId = setTimeout(() => closePopup(toast), duration);

        toast.addEventListener('click', () => {
            clearTimeout(timeoutId);
            closePopup(toast);
        });

        return toast;
    };

    window.showConfirm = function (message, options = {}) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'confirm-overlay';

            const box = document.createElement('div');
            box.className = 'confirm-modal';

            const header = document.createElement('div');
            header.className = 'confirm-header';

            const icon = document.createElement('span');
            icon.className = 'confirm-icon';
            icon.textContent = '!';

            const title = document.createElement('h4');
            title.className = 'confirm-title';
            title.textContent = options.title || 'Confirm Deletion';

            const text = document.createElement('p');
            text.className = 'confirm-message';
            text.textContent = message || 'Are you sure?';

            const actions = document.createElement('div');
            actions.className = 'confirm-actions';

            const cancelButton = document.createElement('button');
            cancelButton.textContent = options.cancelText || 'Cancel';
            cancelButton.className = 'confirm-btn confirm-btn-cancel';

            const okButton = document.createElement('button');
            okButton.textContent = options.okText || 'Delete';
            okButton.className = 'confirm-btn confirm-btn-ok';

            header.appendChild(icon);
            header.appendChild(title);
            actions.appendChild(cancelButton);
            actions.appendChild(okButton);
            box.appendChild(header);
            box.appendChild(text);
            box.appendChild(actions);
            modal.appendChild(box);
            document.body.appendChild(modal);

            requestAnimationFrame(() => {
                box.classList.add('visible');
            });

            const cleanup = () => {
                if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
            };

            cancelButton.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            okButton.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            modal.addEventListener('click', (event) => {
                if (event.target === modal && options.closeOnBackground !== false) {
                    cleanup();
                    resolve(false);
                }
            });
        });
    };

    // Replace default alert, but keep console fallback for non-DOM contexts
    window.alert = function (message) {
        if (typeof showPopup !== 'function') {
            console.log(message);
            return;
        }
        showPopup(message, 'info', 4000);
    };
})();