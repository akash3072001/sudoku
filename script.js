document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Cached for better performance
    const elements = {
        welcomeScreen: document.getElementById('welcome-screen'),
        container: document.querySelector('.container'),
        playerNameInput: document.getElementById('player-name'),
        startGameBtn: document.getElementById('start-game'),
        displayName: document.getElementById('display-name'),
        board: document.getElementById('board'),
        newGameBtn: document.getElementById('new-game'),
        hintBtn: document.getElementById('hint'),
        hintCount: document.getElementById('hint-count'),
        checkBtn: document.getElementById('check'),
        difficultySelect: document.getElementById('difficulty'),
        timeDisplay: document.getElementById('time'),
        messageDisplay: document.getElementById('message'),
        bestTimesDisplay: document.getElementById('best-times'),
        darkModeToggle: document.getElementById('dark-mode-toggle'),
        themeSwitcher: document.getElementById('theme-switcher'),
        completionModal: document.getElementById('completion-modal'),
        completedDifficulty: document.getElementById('completed-difficulty'),
        completedTime: document.getElementById('completed-time'),
        completedHints: document.getElementById('completed-hints'),
        newBest: document.getElementById('new-best'),
        playAgainBtn: document.getElementById('play-again'),
        newDifficultyBtn: document.getElementById('new-difficulty'),
        numberPad: document.querySelector('.number-pad'),
        numberButtons: document.querySelectorAll('.number-btn')
    };

    // Game state
    const state = {
        sudokuBoard: [],
        solution: [],
        timer: null,
        seconds: 0,
        selectedCell: null,
        playerName: '',
        hintsRemaining: 3,
        hintsUsed: 0,
        bestTimes: {
            easy: localStorage.getItem('bestTime-easy') || '--:--',
            medium: localStorage.getItem('bestTime-medium') || '--:--',
            hard: localStorage.getItem('bestTime-hard') || '--:--'
        },
        darkMode: localStorage.getItem('darkMode') === 'true',
        isMobile: window.innerWidth <= 600
    };

    // Initialize the game
    init();

    function init() {
        setDarkMode(state.darkMode);
        updateThemeIcon();
        
        // Show welcome screen
        elements.welcomeScreen.style.display = 'flex';
        elements.container.style.display = 'none';
        
        setupEventListeners();
        updateBestTimesDisplay();
        elements.playerNameInput.focus();
    }

    function setupEventListeners() {
        // Button events
        elements.startGameBtn.addEventListener('click', startGame);
        elements.newGameBtn.addEventListener('click', newGame);
        elements.hintBtn.addEventListener('click', giveHint);
        elements.checkBtn.addEventListener('click', checkSolution);
        elements.darkModeToggle.addEventListener('click', toggleDarkMode);
        elements.themeSwitcher.addEventListener('click', toggleDarkMode);
        elements.playAgainBtn.addEventListener('click', playAgain);
        elements.newDifficultyBtn.addEventListener('click', newDifficulty);
        elements.difficultySelect.addEventListener('change', newGame);
        
        // Keyboard events
        elements.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startGame();
        });
        
        // Number pad events
        elements.numberButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const number = btn.dataset.number;
                if (state.selectedCell) {
                    const input = state.selectedCell.querySelector('input');
                    if (number === '0') {
                        input.value = '';
                        handleInput({ target: input });
                    } else {
                        input.value = number;
                        handleInput({ target: input });
                    }
                }
            });
        });
    }

    function startGame() {
        const name = elements.playerNameInput.value.trim();

        if (!name) {
            showMessage('Please enter your name to start the game.', 'warning');
            elements.playerNameInput.focus();
            return;
        }

        state.playerName = name.substring(0, 20);
        elements.displayName.textContent = `Player: ${state.playerName}`;

        elements.welcomeScreen.style.display = 'none';
        elements.container.style.display = 'block';

        createBoard();
        newGame();
    }

    function toggleDarkMode() {
        state.darkMode = !state.darkMode;
        setDarkMode(state.darkMode);
        localStorage.setItem('darkMode', state.darkMode);
        updateThemeIcon();
    }

    function setDarkMode(enabled) {
        document.body.setAttribute('data-theme', enabled ? 'dark' : 'light');
    }

    function updateThemeIcon() {
        const icons = document.querySelectorAll('.theme-icon');
        icons.forEach(icon => {
            icon.textContent = state.darkMode ? '☀️' : '🌙';
        });
    }

    function createBoard() {
        elements.board.innerHTML = '';
        
        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.dataset.index = i;
            
            input.addEventListener('input', handleInput);
            input.addEventListener('focus', handleCellFocus);
            input.addEventListener('keydown', handleKeyDown);
            
            cell.appendChild(input);
            elements.board.appendChild(cell);
        }
    }

    function handleCellFocus(e) {
        if (state.selectedCell) {
            state.selectedCell.classList.remove('selected');
        }
        state.selectedCell = e.target.parentElement;
        state.selectedCell.classList.add('selected');
    }

    function handleKeyDown(e) {
        const index = parseInt(e.target.dataset.index);
        const key = e.key;
        
        // Arrow key navigation
        if (key.startsWith('Arrow')) {
            e.preventDefault();
            let newIndex;
            switch(key) {
                case 'ArrowUp': newIndex = index - 9; break;
                case 'ArrowDown': newIndex = index + 9; break;
                case 'ArrowLeft': newIndex = index - 1; break;
                case 'ArrowRight': newIndex = index + 1; break;
            }
            moveSelection(newIndex);
        }
        // Number input
        else if (/^[1-9]$/.test(key)) {
            e.target.value = key;
            handleInput(e);
        }
        // Clear cell
        else if (['Backspace', 'Delete', '0'].includes(key)) {
            e.target.value = '';
            handleInput(e);
        }
    }

    function moveSelection(newIndex) {
        if (newIndex < 0 || newIndex > 80) return;
        
        const newCell = document.querySelector(`.cell input[data-index="${newIndex}"]`);
        if (newCell && !newCell.readOnly) {
            newCell.focus();
        }
    }

    function newGame() {
        // Reset game state
        clearInterval(state.timer);
        state.seconds = 0;
        updateTimer();
        state.timer = setInterval(updateTimer, 1000);
        
        state.hintsRemaining = 3;
        state.hintsUsed = 0;
        elements.hintCount.textContent = state.hintsRemaining;
        elements.hintBtn.disabled = false;
        
        clearMessage();
        
        // Generate new puzzle
        generatePuzzle(elements.difficultySelect.value);
    }

    function generatePuzzle(difficulty) {
        state.solution = generateSolvedBoard();
        state.sudokuBoard = JSON.parse(JSON.stringify(state.solution));
        
        const cellsToRemove = {
            easy: 40,
            medium: 50,
            hard: 60
        }[difficulty] || 40;
        
        removeNumbers(state.sudokuBoard, cellsToRemove);
        displayBoard();
    }

    function generateSolvedBoard() {
        const board = Array(9).fill().map(() => Array(9).fill(0));
        fillDiagonalBoxes(board);
        solveSudoku(board);
        return board;
    }

    function fillDiagonalBoxes(board) {
        for (let box = 0; box < 9; box += 3) {
            fillBox(board, box, box);
        }
    }

    function fillBox(board, row, col) {
        const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        let index = 0;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                board[row + i][col + j] = nums[index++];
            }
        }
    }

    function solveSudoku(board) {
        const emptyCell = findEmptyCell(board);
        if (!emptyCell) return true;
        
        const [row, col] = emptyCell;
        for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
                board[row][col] = num;
                if (solveSudoku(board)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    function removeNumbers(board, count) {
        let removed = 0;
        while (removed < count) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            if (board[row][col] !== 0) {
                board[row][col] = 0;
                removed++;
            }
        }
    }

    function displayBoard() {
        const cells = document.querySelectorAll('.cell input');
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const index = i * 9 + j;
                const cell = cells[index];
                const value = state.sudokuBoard[i][j];
                
                cell.value = value === 0 ? '' : value;
                cell.readOnly = value !== 0;
                cell.parentElement.className = value !== 0 ? 'cell given' : 'cell';
                cell.parentElement.classList.remove('error', 'correct', 'selected');
            }
        }
    }

    function handleInput(e) {
        const input = e.target;
        const index = parseInt(input.dataset.index);
        const row = Math.floor(index / 9);
        const col = index % 9;
        const value = input.value;
        
        // Validate input
        if (value === '' || /^[1-9]$/.test(value)) {
            state.sudokuBoard[row][col] = value === '' ? 0 : parseInt(value);
            
            // Check if correct
            if (value !== '' && value != state.solution[row][col]) {
                input.parentElement.classList.add('error');
                input.parentElement.classList.remove('correct');
            } else {
                input.parentElement.classList.remove('error');
                if (value !== '' && value == state.solution[row][col]) {
                    input.parentElement.classList.add('correct');
                }
            }
        } else {
            input.value = '';
            state.sudokuBoard[row][col] = 0;
        }
        
        // Auto-check if board is complete
        if (isBoardComplete()) {
            checkSolution();
        }
    }

    function isBoardComplete() {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (state.sudokuBoard[i][j] === 0) return false;
            }
        }
        return true;
    }

    function giveHint() {
        if (state.hintsRemaining <= 0) {
            showMessage('No hints remaining!', 'warning');
            return;
        }
        
        if (!state.selectedCell) {
            showMessage('Please select a cell first!', 'warning');
            return;
        }
        
        const index = parseInt(state.selectedCell.dataset.index);
        const row = Math.floor(index / 9);
        const col = index % 9;
        
        if (state.sudokuBoard[row][col] !== 0) {
            showMessage('This cell already has a value!', 'warning');
            return;
        }
        
        const input = state.selectedCell.querySelector('input');
        input.value = state.solution[row][col];
        state.sudokuBoard[row][col] = state.solution[row][col];
        input.readOnly = true;
        state.selectedCell.classList.add('correct');
        
        state.hintsRemaining--;
        state.hintsUsed++;
        elements.hintCount.textContent = state.hintsRemaining;
        if (state.hintsRemaining <= 0) elements.hintBtn.disabled = true;
        
        showMessage(`Hint used! ${state.hintsRemaining} hint${state.hintsRemaining !== 1 ? 's' : ''} remaining`, 'success');
    }

    function checkSolution() {
        let isComplete = true;
        let isCorrect = true;
        const cells = document.querySelectorAll('.cell input');

        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const index = i * 9 + j;
                const cell = cells[index];

                if (cell.value === '') {
                    isComplete = false;
                    cell.parentElement.classList.remove('error', 'correct');
                    continue;
                }

                const value = parseInt(cell.value);
                if (value !== state.solution[i][j]) {
                    isCorrect = false;
                    cell.parentElement.classList.add('error');
                    cell.parentElement.classList.remove('correct');
                } else {
                    if (cell.readOnly) {
                        cell.parentElement.classList.remove('correct');
                    } else {
                        cell.parentElement.classList.add('correct');
                        cell.parentElement.classList.remove('error');
                    }
                }
            }
        }

        if (!isComplete) {
            showMessage('Puzzle is not complete!', 'warning');
        } else if (isCorrect) {
            showMessage('Congratulations! Puzzle solved correctly!', 'success');
            clearInterval(state.timer);
            showCompletionModal();
            triggerConfetti();
        } else {
            showMessage('There are errors in your solution.', 'error');
        }
    }

    function showCompletionModal() {
        const difficulty = elements.difficultySelect.value;
        const currentTime = elements.timeDisplay.textContent;
        const currentBest = state.bestTimes[difficulty];
        
        elements.completedDifficulty.textContent = difficulty;
        elements.completedTime.textContent = currentTime;
        elements.completedHints.textContent = 3 - state.hintsRemaining;
        
        // Check for new best time
        const isNewBest = currentBest === '--:--' || 
                        parseInt(currentTime.replace(':', '')) < parseInt(currentBest.replace(':', ''));
        
        if (isNewBest) {
            state.bestTimes[difficulty] = currentTime;
            localStorage.setItem(`bestTime-${difficulty}`, currentTime);
            elements.newBest.style.display = 'block';
            updateBestTimesDisplay();
        } else {
            elements.newBest.style.display = 'none';
        }
        
        elements.completionModal.style.display = 'flex';
    }

    function playAgain() {
        elements.completionModal.style.display = 'none';
        newGame();
    }

    function newDifficulty() {
        elements.completionModal.style.display = 'none';
        elements.difficultySelect.value = ['easy', 'medium', 'hard'].find(d => d !== elements.difficultySelect.value);
        newGame();
    }

    function triggerConfetti() {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    function showMessage(text, type) {
        elements.messageDisplay.textContent = text;
        elements.messageDisplay.className = type;
        elements.messageDisplay.style.display = 'block';
        
        // Auto-hide message after 3 seconds
        if (type !== 'error') {
            setTimeout(clearMessage, 3000);
        }
    }

    function clearMessage() {
        elements.messageDisplay.textContent = '';
        elements.messageDisplay.className = '';
        elements.messageDisplay.style.display = 'none';
    }

    function updateTimer() {
        state.seconds++;
        const minutes = Math.floor(state.seconds / 60);
        const remainingSeconds = state.seconds % 60;
        elements.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function updateBestTimesDisplay() {
        elements.bestTimesDisplay.innerHTML = `
            <div class="best-time"><strong>Easy:</strong> ${state.bestTimes.easy}</div>
            <div class="best-time"><strong>Medium:</strong> ${state.bestTimes.medium}</div>
            <div class="best-time"><strong>Hard:</strong> ${state.bestTimes.hard}</div>
        `;
    }

    // Helper functions
    function findEmptyCell(board) {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (board[i][j] === 0) return [i, j];
            }
        }
        return null;
    }

    function isValid(board, row, col, num) {
        // Check row and column
        for (let i = 0; i < 9; i++) {
            if (board[row][i] === num || board[i][col] === num) return false;
        }
        
        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false;
            }
        }
        return true;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
});