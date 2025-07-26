/**
 * Charity: Water Drop Game
 * Enhanced with difficulty modes, sound effects, milestone tracking, and DOM interactions
 */

class CharityWaterGame {
    constructor() {
        // Game state
        this.isPlaying = false;
        this.isPaused = false;
        this.score = 0;
        this.gameTime = 0;
        this.drops = [];
        this.gameInterval = null;
        this.dropSpawnInterval = null;
        this.timerInterval = null;
        
        // Game settings
        this.difficulty = 'normal';
        this.difficultySettings = {
            easy: {
                dropSpeed: 3000,      // 3 seconds to fall
                spawnRate: 1500,      // New drop every 1.5 seconds
                targetScore: 15,
                name: 'Easy'
            },
            normal: {
                dropSpeed: 2000,      // 2 seconds to fall
                spawnRate: 1000,      // New drop every 1 second
                targetScore: 25,
                name: 'Normal'
            },
            hard: {
                dropSpeed: 1200,      // 1.2 seconds to fall
                spawnRate: 800,       // New drop every 0.8 seconds
                targetScore: 40,
                name: 'Hard'
            }
        };
        
        // Milestone tracking
        this.milestones = [10, 20, 30];
        this.achievedMilestones = [];
        
        // Sound effects
        this.sounds = {
            gameStart: new Audio('./assets/audio/game-start-317318.mp3'),
            gameOver: new Audio('./assets/audio/game-over-kid-voice-clip-352738.mp3'),
            collect: null // We'll create this programmatically
        };
        
        // DOM elements
        this.elements = {
            startBtn: document.getElementById('startBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            difficultySelect: document.getElementById('difficulty'),
            gameArea: document.getElementById('gameArea'),
            score: document.getElementById('score'),
            target: document.getElementById('target'),
            timer: document.getElementById('timer'),
            milestoneDisplay: document.getElementById('milestoneDisplay'),
            gameOverModal: document.getElementById('gameOverModal'),
            gameOverTitle: document.getElementById('gameOverTitle'),
            gameOverMessage: document.getElementById('gameOverMessage'),
            playAgainBtn: document.getElementById('playAgainBtn'),
            changeDifficultyBtn: document.getElementById('changeDifficultyBtn')
        };
        
        this.init();
    }
    
    init() {
        this.setupSounds();
        this.bindEvents();
        this.updateDifficultyDisplay();
    }
    
    setupSounds() {
        // Create a collect sound using Web Audio API since we don't have a separate collect sound
        this.createCollectSound();
        
        // Configure game sounds
        this.sounds.gameStart.volume = 0.7;
        this.sounds.gameOver.volume = 0.8;
        
        // Preload sounds
        this.sounds.gameStart.load();
        this.sounds.gameOver.load();
    }
    
    createCollectSound() {
        // Create a simple collect sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        this.sounds.collect = {
            play: () => {
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.1);
            }
        };
    }
    
    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.startGame());
        this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
        this.elements.difficultySelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.updateDifficultyDisplay();
        });
        this.elements.playAgainBtn.addEventListener('click', () => this.playAgain());
        this.elements.changeDifficultyBtn.addEventListener('click', () => this.changeDifficulty());
        
        // Close modal when clicking outside
        this.elements.gameOverModal.addEventListener('click', (e) => {
            if (e.target === this.elements.gameOverModal) {
                this.hideModal();
            }
        });
    }
    
    updateDifficultyDisplay() {
        const settings = this.difficultySettings[this.difficulty];
        this.elements.target.textContent = settings.targetScore;
    }
    
    startGame() {
        if (this.isPlaying) return;
        
        this.resetGame();
        this.isPlaying = true;
        this.isPaused = false;
        
        // Play start sound
        this.playSound('gameStart');
        
        // Update UI
        this.elements.startBtn.style.display = 'none';
        this.elements.pauseBtn.style.display = 'inline-block';
        this.elements.difficultySelect.disabled = true;
        
        // Hide instructions
        const instructions = this.elements.gameArea.querySelector('.instructions');
        if (instructions) {
            instructions.style.display = 'none';
        }
        
        // Add a test click handler to the game area for debugging
        this.elements.gameArea.addEventListener('click', (e) => {
            console.log('🖱️ Game area clicked:', e.target.className);
            if (e.target.classList.contains('water-drop')) {
                console.log('🎯 Water drop detected in game area click!', e.target.dataset.id);
            }
        });
        
        // Start game loops
        this.startGameLoop();
        this.startTimer();
        
        console.log(`🎮 Game started in ${this.difficultySettings[this.difficulty].name} mode!`);
        console.log('💧 Click on the falling water drops to collect them!');
    }
    
    resetGame() {
        this.score = 0;
        this.gameTime = 0;
        this.achievedMilestones = [];
        this.drops = [];
        
        // Clear all existing drops
        const existingDrops = this.elements.gameArea.querySelectorAll('.water-drop');
        existingDrops.forEach(drop => drop.remove());
        
        // Reset displays
        this.elements.score.textContent = '0';
        this.elements.timer.textContent = '0s';
        this.elements.milestoneDisplay.innerHTML = '';
        
        // Clear intervals
        this.clearIntervals();
    }
    
    startGameLoop() {
        const settings = this.difficultySettings[this.difficulty];
        
        // Spawn drops at regular intervals
        this.dropSpawnInterval = setInterval(() => {
            if (!this.isPaused && this.isPlaying) {
                this.spawnDrop();
            }
        }, settings.spawnRate);
        
        // Main game loop for drop movement and cleanup
        this.gameInterval = setInterval(() => {
            if (!this.isPaused && this.isPlaying) {
                this.updateDrops();
                this.checkWinCondition();
            }
        }, 50);
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.isPaused && this.isPlaying) {
                this.gameTime++;
                this.elements.timer.textContent = `${this.gameTime}s`;
            }
        }, 1000);
    }
    
    spawnDrop() {
        const gameAreaRect = this.elements.gameArea.getBoundingClientRect();
        const drop = document.createElement('div');
        const dropId = 'drop_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        
        drop.className = 'water-drop';
        drop.dataset.id = dropId;
        drop.style.left = Math.random() * (this.elements.gameArea.offsetWidth - 40) + 'px';
        drop.style.animationDuration = `${this.difficultySettings[this.difficulty].dropSpeed}ms`;
        
        // Simple and reliable click handler
        const clickHandler = (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('🎯 Drop clicked!', dropId);
            this.collectDrop(e, dropId);
        };
        
        drop.addEventListener('click', clickHandler);
        drop.addEventListener('mousedown', clickHandler);
        drop.addEventListener('touchstart', clickHandler);
        
        this.elements.gameArea.appendChild(drop);
        this.drops.push({
            id: dropId,
            element: drop,
            collected: false
        });
        
        console.log(`✨ Drop spawned: ${dropId} (total: ${this.drops.length})`);
    }
    
    collectDrop(event, dropId) {
        console.log(`🎯 Attempting to collect drop: ${dropId}`);
        
        // Prevent event bubbling
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // Find the drop in our array
        const dropIndex = this.drops.findIndex(drop => drop.id === dropId);
        if (dropIndex === -1) {
            console.log(`❌ Drop ${dropId} not found in array`);
            return;
        }
        
        const drop = this.drops[dropIndex];
        if (drop.collected) {
            console.log(`❌ Drop ${dropId} already collected`);
            return;
        }
        
        // Mark as collected immediately
        drop.collected = true;
        
        console.log(`✅ Collecting drop! Score: ${this.score} → ${this.score + 1}`);
        
        // Update score immediately
        this.score++;
        this.elements.score.textContent = this.score;
        
        // Play collect sound
        this.playSound('collect');
        
        // Add visual feedback
        if (drop.element) {
            drop.element.classList.add('clicked');
            drop.element.style.pointerEvents = 'none'; // Prevent double clicks
        }
        
        // Check for milestones
        this.checkMilestones();
        
        // Remove the drop element and clean up
        setTimeout(() => {
            if (drop.element && drop.element.parentNode) {
                drop.element.remove();
            }
            // Remove from array
            const currentIndex = this.drops.findIndex(d => d.id === dropId);
            if (currentIndex !== -1) {
                this.drops.splice(currentIndex, 1);
            }
        }, 300);
        
        console.log(`🎉 Drop collected successfully! New score: ${this.score}`);
    }
    
    updateDrops() {
        this.drops = this.drops.filter(drop => {
            if (drop.collected) return false;
            
            const rect = drop.element.getBoundingClientRect();
            const gameAreaRect = this.elements.gameArea.getBoundingClientRect();
            
            // Remove drops that have fallen past the game area
            if (rect.top > gameAreaRect.bottom) {
                drop.element.remove();
                return false;
            }
            
            return true;
        });
    }
    
    checkMilestones() {
        this.milestones.forEach(milestone => {
            if (this.score >= milestone && !this.achievedMilestones.includes(milestone)) {
                this.achievedMilestones.push(milestone);
                this.showMilestone(milestone);
            }
        });
    }
    
    showMilestone(milestone) {
        const message = document.createElement('div');
        message.className = 'milestone-message';
        message.textContent = `🎉 Milestone reached: ${milestone} drops collected! Great job helping provide clean water!`;
        
        this.elements.milestoneDisplay.innerHTML = '';
        this.elements.milestoneDisplay.appendChild(message);
        
        // Remove message after 3 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 3000);
        
        console.log(`Milestone achieved: ${milestone} points!`);
    }
    
    checkWinCondition() {
        const targetScore = this.difficultySettings[this.difficulty].targetScore;
        if (this.score >= targetScore) {
            this.endGame(true);
        }
    }
    
    endGame(won = false) {
        this.isPlaying = false;
        this.clearIntervals();
        
        // Play game over sound
        this.playSound('gameOver');
        
        // Show results
        if (won) {
            this.showWinModal();
        } else {
            this.showGameOverModal();
        }
        
        // Reset UI
        this.elements.startBtn.style.display = 'inline-block';
        this.elements.pauseBtn.style.display = 'none';
        this.elements.difficultySelect.disabled = false;
        
        // Show instructions again
        const instructions = this.elements.gameArea.querySelector('.instructions');
        if (instructions) {
            instructions.style.display = 'block';
        }
    }
    
    showWinModal() {
        const settings = this.difficultySettings[this.difficulty];
        this.elements.gameOverTitle.textContent = '🎉 Congratulations!';
        this.elements.gameOverMessage.innerHTML = `
            <strong>You won on ${settings.name} difficulty!</strong><br><br>
            📊 Final Score: ${this.score} drops collected<br>
            ⏱️ Time: ${this.gameTime} seconds<br><br>
            🌍 Thanks to your help, more communities can access clean water!<br>
            Consider making a real donation to charity: water to continue the impact.
        `;
        this.showModal();
    }
    
    showGameOverModal() {
        const settings = this.difficultySettings[this.difficulty];
        const remaining = settings.targetScore - this.score;
        this.elements.gameOverTitle.textContent = '💧 Keep Trying!';
        this.elements.gameOverMessage.innerHTML = `
            You collected ${this.score} drops in ${this.gameTime} seconds.<br>
            You needed ${remaining} more drops to reach the target of ${settings.targetScore}.<br><br>
            🎯 Try again to help provide clean water to communities in need!
        `;
        this.showModal();
    }
    
    showModal() {
        this.elements.gameOverModal.style.display = 'block';
    }
    
    hideModal() {
        this.elements.gameOverModal.style.display = 'none';
    }
    
    playAgain() {
        this.hideModal();
        this.startGame();
    }
    
    changeDifficulty() {
        this.hideModal();
        // The difficulty can be changed via the dropdown
    }
    
    togglePause() {
        if (!this.isPlaying) return;
        
        this.isPaused = !this.isPaused;
        this.elements.pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
        
        if (this.isPaused) {
            // Pause all drop animations
            const drops = this.elements.gameArea.querySelectorAll('.water-drop');
            drops.forEach(drop => {
                drop.style.animationPlayState = 'paused';
            });
        } else {
            // Resume all drop animations
            const drops = this.elements.gameArea.querySelectorAll('.water-drop');
            drops.forEach(drop => {
                drop.style.animationPlayState = 'running';
            });
        }
        
        console.log(this.isPaused ? 'Game paused' : 'Game resumed');
    }
    
    clearIntervals() {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        if (this.dropSpawnInterval) {
            clearInterval(this.dropSpawnInterval);
            this.dropSpawnInterval = null;
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    playSound(soundName) {
        try {
            if (this.sounds[soundName] && this.sounds[soundName].play) {
                this.sounds[soundName].play();
            }
        } catch (error) {
            console.warn(`Could not play sound: ${soundName}`, error);
        }
    }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Charity: Water Drop Game initialized!');
    console.log('🎯 Goal: Help provide clean water to communities in need');
    console.log('💧 Click falling drops to collect them and reach your target score!');
    
    const game = new CharityWaterGame();
    
    // Make game available globally for debugging
    window.charityWaterGame = game;
});
