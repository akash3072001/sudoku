document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const container = document.querySelector('.container');
    const playerNameInput = document.getElementById('player-name');
    const startGameBtn = document.getElementById('start-game');
    const displayName = document.getElementById('display-name');
    const board = document.getElementById('board');
    const newGameBtn = document.getElementById('new-game');
    const hintBtn = document.getElementById('hint');
    const hintCount = document.getElementById('hint-count');
    const checkBtn = document.getElementById('check');
    const difficultySelect = document.getElementById('difficulty');
    const timeDisplay = document.getElementById('time');
    const messageDisplay = document.getElementById('message');
    const bestTimesDisplay = document.getElementById('best-times');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const themeSwitcher = document.getElementById('theme-switcher');

    // Game state
    let sudokuBoard = [];
    let solution = [];
    let timer;
    let seconds = 0;
    let selectedCell = null;
    let playerName = '';
    let hintsRemaining = 3;
    let bestTimes = {
        easy: localStorage.getItem('bestTime-easy') || '--:--',
        medium: localStorage.getItem('bestTime-medium') || '--:--',
        hard: localStorage.getItem('bestTime-hard') || '--:--'
    };
    let darkMode = localStorage.getItem('darkMode') === 'true';

    // Initialize the game
    init();

    function init() {
        // Set initial theme
        setDarkMode(darkMode);
        updateThemeIcon();

        // Show welcome screen
        welcomeScreen.style.display = 'flex';
        container.style.display = 'none';

        // Event listeners
        startGameBtn.addEventListener('click', startGame);
        newGameBtn.addEventListener('click', newGame);
        hintBtn.addEventListener('click', giveHint);
        checkBtn.addEventListener('click', checkSolution);
        darkModeToggle.addEventListener('click', toggleDarkMode);
        themeSwitcher.addEventListener('click', toggleDarkMode);
        difficultySelect.addEventListener('change', () => {
            newGame();
        });

        // Keyboard support
        playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startGame();
        });

        // Load best times
        updateBestTimesDisplay();

        // Focus on name input
        playerNameInput.focus();
    }

    function startGame() {
        const name = playerNameInput.value.trim();

        if (name === '') {
            showMessage('Please enter your name to start the game.', 'warning');
            playerNameInput.focus();
            return; // Stop the game from starting
        }

        playerName = name.length > 20 ? name.substring(0, 20) : name;
        displayName.textContent = `Player: ${playerName}`;

        welcomeScreen.style.display = 'none';
        container.style.display = 'block';

        createBoard();
        newGame();
    }


    function toggleDarkMode() {
        darkMode = !darkMode;
        setDarkMode(darkMode);
        localStorage.setItem('darkMode', darkMode);
        updateThemeIcon();
    }

    function setDarkMode(enabled) {
        document.body.setAttribute('data-theme', enabled ? 'dark' : 'light');
    }

    function updateThemeIcon() {
        const icons = document.querySelectorAll('.theme-icon');
        icons.forEach(icon => {
            icon.textContent = darkMode ? '☀️' : '🌙';
        });
    }

    function createBoard() {
        board.innerHTML = '';

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
            board.appendChild(cell);
        }
    }

    function handleCellFocus() {
        if (selectedCell) selectedCell.classList.remove('selected');
        selectedCell = this.parentElement;
        selectedCell.classList.add('selected');

        // Scroll the board into view when input is focused (mobile only)
        if (window.innerHeight < 700) { // Check if mobile screen
            setTimeout(() => {
                board.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 300); // Small delay for keyboard to appear
        }
    }

    function handleKeyDown(e) {
        const index = parseInt(this.dataset.index);
        switch (e.key) {
            case 'ArrowUp': moveSelection(index - 9); break;
            case 'ArrowDown': moveSelection(index + 9); break;
            case 'ArrowLeft': moveSelection(index - 1); break;
            case 'ArrowRight': moveSelection(index + 1); break;
        }
    }

    function moveSelection(newIndex) {
        if (newIndex < 0 || newIndex > 80) return;

        const newCell = document.querySelector(`.cell input[data-index="${newIndex}"]`);
        if (newCell && !newCell.readOnly) newCell.focus();
    }

    function newGame() {
        // Reset game state
        clearInterval(timer);
        seconds = 0;
        updateTimer();
        timer = setInterval(updateTimer, 1000);

        hintsRemaining = 3;
        hintCount.textContent = hintsRemaining;
        hintBtn.disabled = false;

        messageDisplay.textContent = '';
        messageDisplay.className = '';

        // Generate new puzzle
        generatePuzzle(difficultySelect.value);
    }

    function generatePuzzle(difficulty) {
        solution = generateSolvedBoard();
        sudokuBoard = JSON.parse(JSON.stringify(solution));

        const cellsToRemove = {
            easy: 40,
            medium: 50,
            hard: 60
        }[difficulty] || 40;

        removeNumbers(sudokuBoard, cellsToRemove);
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
        while (count > 0) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            if (board[row][col] !== 0) {
                board[row][col] = 0;
                count--;
            }
        }
    }

    function displayBoard() {
        const cells = document.querySelectorAll('.cell input');
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                const index = i * 9 + j;
                const cell = cells[index];
                const value = sudokuBoard[i][j];

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
        if (value === '' || (value >= '1' && value <= '9')) {
            sudokuBoard[row][col] = value === '' ? 0 : parseInt(value);
            if (value !== '' && value != solution[row][col]) {
                input.parentElement.classList.add('error');
                input.parentElement.classList.remove('correct');
            } else {
                input.parentElement.classList.remove('error');
                if (value !== '' && value == solution[row][col]) {
                    input.parentElement.classList.add('correct');
                }
            }
        } else {
            input.value = '';
            sudokuBoard[row][col] = 0;
        }
        /*  input.blur();
          input.focus();
          input.dispatchEvent(new Event('input'));   */
    }

    function giveHint() {
        if (hintsRemaining <= 0) {
            showMessage('No hints remaining!', 'warning');
            return;
        }

        if (!selectedCell) {
            showMessage('Please select a cell first!', 'warning');
            return;
        }

        const index = parseInt(selectedCell.dataset.index);
        const row = Math.floor(index / 9);
        const col = index % 9;

        if (sudokuBoard[row][col] !== 0) {
            showMessage('This cell already has a value!', 'warning');
            return;
        }

        const input = selectedCell.querySelector('input');
        input.value = solution[row][col];
        sudokuBoard[row][col] = solution[row][col];
        input.readOnly = true;
        selectedCell.classList.add('correct');

        hintsRemaining--;
        hintCount.textContent = hintsRemaining;
        if (hintsRemaining <= 0) hintBtn.disabled = true;

        showMessage(`Hint used! ${hintsRemaining} hint${hintsRemaining !== 1 ? 's' : ''} remaining`, 'success');
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
                if (value !== solution[i][j]) {
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
            clearInterval(timer);
            updateBestTimes();
        } else {
            showMessage('There are errors in your solution.', 'error');
        }
    }

    function showMessage(text, type) {
        messageDisplay.textContent = text;
        messageDisplay.className = type;
        messageDisplay.style.display = 'block'; // Ensure it's visible
    }

    function updateTimer() {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function updateBestTimes() {
        const difficulty = difficultySelect.value;
        const currentTime = timeDisplay.textContent;
        const currentBest = bestTimes[difficulty];

        if (currentBest === '--:--' ||
            parseInt(currentTime.replace(':', '')) < parseInt(currentBest.replace(':', ''))) {
            bestTimes[difficulty] = currentTime;
            localStorage.setItem(`bestTime-${difficulty}`, currentTime);
            updateBestTimesDisplay();
            showMessage(`New best time for ${difficulty}! ${currentTime}`, 'success');
        }
    }

    function updateBestTimesDisplay() {
        bestTimesDisplay.innerHTML = `
            <div class="best-time"><strong>Easy:</strong> ${bestTimes.easy}</div>
            <div class="best-time"><strong>Medium:</strong> ${bestTimes.medium}</div>
            <div class="best-time"><strong>Hard:</strong> ${bestTimes.hard}</div>
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