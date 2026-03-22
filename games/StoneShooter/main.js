window.game = new Game();

// Hook up UI buttons
document.addEventListener('DOMContentLoaded', () => {
    
    // Main Menu Buttons
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const ui = window.game.ui;
            
            switch(action) {
                case 'solo-practice':
                    window.game.start('solo');
                    break;
                case 'versus':
                    window.game.start('versus');
                    break;
                case 'how-to':
                    ui.showScreen('how-to-screen');
                    break;
                case 'options':
                    ui.showScreen('options-screen');
                    break;
                case 'back':
                case 'quit':
                    window.game.state = 'menu';
                    ui.showScreen('main-menu');
                    ui.elements.hud.classList.add('hidden');
                    break;
                case 'resume':
                    window.game.togglePause();
                    break;
                case 'restart':
                    window.game.start(window.game.mode);
                    break;
                case 'toggle-particles':
                    // Just a toggle visual for now
                    const span = document.getElementById('opt-particles');
                    span.innerText = span.innerText === 'ON' ? 'OFF' : 'ON';
                    break;
            }
            
            window.game.audio.sfx.select();
        });
        
        btn.addEventListener('mouseenter', () => {
             window.game.audio.sfx.move();
        });
    });

    // Start loop
    requestAnimationFrame(t => window.game.loop(t));
});