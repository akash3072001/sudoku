document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const newGameBtn = document.getElementById('new-game');
    const checkBtn = document.getElementById('check');
    const difficultySelect = document.getElementById('difficulty');
    const timeDisplay = document.getElementById('time');
    const messageDisplay = document.getElementById('message');
    
    let sudokuBoard = [];
    let solution = [];
    let timer;
    let seconds = 0;
    let selectedCell = null;
    
    // Initialize the game
    init();
    
    function init() {
        createBoard();
        newGame();
        
        // Event listeners
        newGameBtn.addEventListener('click', newGame);
        checkBtn.addEventListener('click', checkSolution);
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
            input.addEventListener('focus', () => {
                if (selectedCell) {
                    selectedCell.classList.remove('selected');
                }
                selectedCell = input.parentElement;
                selectedCell.classList.add('selected');
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
                    e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    moveSelection(e.key, parseInt(input.dataset.index));
                }
            });
            
            cell.appendChild(input);
            board.appendChild(cell);
        }
    }
    
    function newGame() {
        // Reset timer
        clearInterval(timer);
        seconds = 0;
        updateTimer();
        timer = setInterval(updateTimer, 1000);
        
        // Clear message
        messageDisplay.textContent = '';
        messageDisplay.className = '';
        
        // Generate new puzzle
        const difficulty = difficultySelect.value;
        generatePuzzle(difficulty);
    }
    
    function generatePuzzle(difficulty) {
        // Generate a solved Sudoku board
        solution = generateSolvedBoard();
        
        // Create a copy for the puzzle
        sudokuBoard = JSON.parse(JSON.stringify(solution));
        
        // Remove numbers based on difficulty
        let cellsToRemove;
        switch(difficulty) {
            case 'easy': cellsToRemove = 40; break;
            case 'medium': cellsToRemove = 50; break;
            case 'hard': cellsToRemove = 60; break;
            default: cellsToRemove = 40;
        }
        
        removeNumbers(sudokuBoard, cellsToRemove);
        
        // Display the puzzle
        displayBoard();
    }
    
    function generateSolvedBoard() {
        // Create empty board
        const board = Array(9).fill().map(() => Array(9).fill(0));
        
        // Fill diagonal 3x3 boxes first
        fillDiagonalBoxes(board);
        
        // Solve the rest of the board
        solveSudoku(board);
        
        return board;
    }
    
    function fillDiagonalBoxes(board) {
        for (let box = 0; box < 9; box += 3) {
            fillBox(board, box, box);
        }
    }
    
    function fillBox(board, row, col) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        shuffleArray(nums);
        
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
                
                if (solveSudoku(board)) {
                    return true;
                }
                
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
                cell.parentElement.classList.remove('error', 'correct');
            }
        }
    }
    
    function handleInput(e) {
        const input = e.target;
        const index = parseInt(input.dataset.index);
        const row = Math.floor(index / 9);
        const col = index % 9;
        let value = input.value;
        
        // Validate input
        if (value === '' || (value >= '1' && value <= '9')) {
            sudokuBoard[row][col] = value === '' ? 0 : parseInt(value);
            input.parentElement.classList.remove('error');
            
            // Check if correct
            if (value !== '' && value == solution[row][col]) {
                input.parentElement.classList.add('correct');
            } else {
                input.parentElement.classList.remove('correct');
            }
        } else {
            input.value = '';
            sudokuBoard[row][col] = 0;
        }
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
                    cell.parentElement.classList.remove('error');
                    cell.parentElement.classList.add('correct');
                }
            }
        }
        
        if (!isComplete) {
            messageDisplay.textContent = 'Puzzle is not complete!';
            messageDisplay.className = 'warning';
        } else if (isCorrect) {
            messageDisplay.textContent = 'Congratulations! Puzzle solved correctly!';
            messageDisplay.className = 'success';
            clearInterval(timer);
        } else {
            messageDisplay.textContent = 'There are errors in your solution.';
            messageDisplay.className = 'error';
        }
    }
    
    function updateTimer() {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    function moveSelection(direction, currentIndex) {
        let newIndex;
        
        switch(direction) {
            case 'ArrowUp':
                newIndex = currentIndex - 9;
                if (newIndex < 0) newIndex = currentIndex;
                break;
            case 'ArrowDown':
                newIndex = currentIndex + 9;
                if (newIndex > 80) newIndex = currentIndex;
                break;
            case 'ArrowLeft':
                newIndex = currentIndex - 1;
                if (Math.floor(newIndex / 9) !== Math.floor(currentIndex / 9)) newIndex = currentIndex;
                break;
            case 'ArrowRight':
                newIndex = currentIndex + 1;
                if (Math.floor(newIndex / 9) !== Math.floor(currentIndex / 9)) newIndex = currentIndex;
                break;
            default:
                newIndex = currentIndex;
        }
        
        const newCell = document.querySelector(`.cell input[data-index="${newIndex}"]`);
        if (newCell && !newCell.readOnly) {
            newCell.focus();
        }
    }
    
    // Helper functions
    function findEmptyCell(board) {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (board[i][j] === 0) {
                    return [i, j];
                }
            }
        }
        return null;
    }
    
    function isValid(board, row, col, num) {
        // Check row
        for (let j = 0; j < 9; j++) {
            if (board[row][j] === num) return false;
        }
        
        // Check column
        for (let i = 0; i < 9; i++) {
            if (board[i][col] === num) return false;
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