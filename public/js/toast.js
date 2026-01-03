// Hand-Drawn Toast Notification System
const Toast = {
    init() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);

            // Inject Styles
            const style = document.createElement('style');
            style.innerHTML = `
                .sketch-toast {
                    font-family: 'Gochi Hand', cursive;
                    padding: 16px 24px;
                    background: white;
                    border: 2px solid black;
                    border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
                    box-shadow: 2px 3px 0px 0px rgba(0,0,0,1);
                    min-width: 300px;
                    max-width: 400px;
                    transform: rotate(-1deg);
                    animation: slideIn 0.3s ease-out;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 1.25rem;
                }
                .sketch-toast.success { background-color: #dcfce7; color: #166534; }
                .sketch-toast.error { background-color: #fee2e2; color: #991b1b; }
                .sketch-toast.info { background-color: #dbeafe; color: #1e40af; }
                
                @keyframes slideIn {
                    from { transform: translateX(100%) rotate(0deg); opacity: 0; }
                    to { transform: translateX(0) rotate(-1deg); opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; transform: translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
    },

    show(message, type = 'info') {
        this.init();
        const container = document.getElementById('toast-container');

        const toast = document.createElement('div');
        toast.className = `sketch-toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="margin-left:12px; font-weight:bold;">&times;</button>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    info(msg) { this.show(msg, 'info'); }
};

// Global Exposure
window.showToast = Toast.show.bind(Toast);
window.Toast = Toast;
