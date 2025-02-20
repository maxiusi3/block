// 颜色定义
const COLORS = [
    '#000000',    // 黑色（背景）
    '#7825B3',    // 紫色
    '#64B3B3',    // 青色
    '#502216',    // 褐色
    '#508616',    // 绿色
    '#B42216',    // 红色
    '#B4227A',    // 粉色
];

// 方块形状定义
const FIGURES = [
    [[1, 5, 9, 13], [4, 5, 6, 7]],    // I
    [[4, 5, 9, 10], [2, 6, 5, 9]],      // Z
    [[6, 7, 9, 10], [1, 5, 6, 10]],     // S
    [[1, 2, 5, 9], [0, 4, 5, 6], [1, 5, 9, 8], [4, 5, 6, 10]],    // J
    [[1, 2, 6, 10], [5, 6, 7, 9], [2, 6, 10, 11], [3, 5, 6, 7]],  // L
    [[1, 4, 5, 6], [1, 4, 5, 9], [4, 5, 6, 9], [1, 5, 6, 9]],    // T
    [[1, 2, 5, 6]],                      // O
];

// 游戏设置
const BLOCK_SIZE = 20;
const FIELD_WIDTH = 10;
const FIELD_HEIGHT = 20;
const GAME_AREA_LEFT = 50;
const GAME_AREA_TOP = 60;

class Figure {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.type = Math.floor(Math.random() * FIGURES.length);
        this.color = Math.floor(Math.random() * (COLORS.length - 1)) + 1;
        this.rotation = 0;
    }

    image() {
        return FIGURES[this.type][this.rotation];
    }

    rotate() {
        this.rotation = (this.rotation + 1) % FIGURES[this.type].length;
    }
}

class Tetris {
    constructor(height, width) {
        this.height = height;
        this.width = width;
        this.field = Array(height).fill().map(() => Array(width).fill(0));
        this.score = 0;
        this.level = 1;
        this.state = "start";
        this.figure = null;
        this.nextFigure = null;
        this.gameOver = false;
        this.highScore = this.loadHighScore();
        this.doubleScoreEffect = false;
        this.doubleScoreTimer = 0;
        this.clearedLineEffects = [];

        // 加载音效
        this.rotateSound = new Audio('rotate.wav');
        this.landSound = new Audio('land.wav');
        this.clearSound = new Audio('clear.wav');
        this.doubleSound = new Audio('double.wav');

        // 设置音量
        this.rotateSound.volume = 0.3;
        this.landSound.volume = 0.3;
        this.clearSound.volume = 0.3;
        this.doubleSound.volume = 0.3;
    }

    newFigure() {
        if (!this.nextFigure) {
            this.nextFigure = new Figure(3, 0);
        }
        this.figure = this.nextFigure;
        this.nextFigure = new Figure(3, 0);
    }

    intersects() {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.figure.image().includes(i * 4 + j)) {
                    if (i + this.figure.y > this.height - 1 ||
                        j + this.figure.x >= this.width ||
                        j + this.figure.x < 0 ||
                        this.field[i + this.figure.y][j + this.figure.x] > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    freeze(isSpaceDrop = false) {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.figure.image().includes(i * 4 + j)) {
                    this.field[i + this.figure.y][j + this.figure.x] = this.figure.color;
                }
            }
        }
        this.landSound.play();
        const clearedLines = this.breakLines(isSpaceDrop);
        if (clearedLines.length > 0) {
            this.clearSound.play();
        }
        this.newFigure();
        if (this.intersects()) {
            this.gameOver = true;
        }
    }

    breakLines(isSpaceDrop = false) {
        let lines = 0;
        const clearedLines = [];
        for (let i = 1; i < this.height; i++) {
            const zeros = this.field[i].filter(cell => cell === 0).length;
            if (zeros === 0) {
                lines++;
                clearedLines.push(i);
                for (let i1 = i; i1 > 1; i1--) {
                    for (let j = 0; j < this.width; j++) {
                        this.field[i1][j] = this.field[i1-1][j];
                    }
                }
            }
        }

        // 计算双倍得分概率
        let doubleScore = false;
        if (isSpaceDrop && lines > 0) {
            const doubleChance = Math.min(10 + (this.level - 1) * 3, 50);
            const randomValue = Math.floor(Math.random() * 100) + 1;
            if (randomValue <= doubleChance) {
                doubleScore = true;
                this.doubleSound.play();
            }
        }

        // 记录消除行的位置，用于显示特效
        this.clearedLineEffects = clearedLines.map(line => ({
            line,
            effectTimer: 30,
            glowAlpha: 255,
            isDouble: doubleScore
        }));

        // 计算得分
        let baseScore = 0;
        if (lines === 1) baseScore = 100;
        else if (lines === 2) baseScore = 300;
        else if (lines === 3) baseScore = 700;
        else if (lines === 4) baseScore = 1500;

        if (doubleScore) {
            this.score += baseScore * 2;
            this.doubleScoreEffect = true;
            this.doubleScoreTimer = 30;
        } else {
            this.score += baseScore;
        }

        this.level = Math.floor(this.score / 2000) + 1;
        return clearedLines;
    }

    goSpace() {
        while (!this.intersects()) {
            this.figure.y += 1;
        }
        this.figure.y -= 1;
        this.freeze(true);
    }

    goDown() {
        this.figure.y += 1;
        if (this.intersects()) {
            this.figure.y -= 1;
            this.freeze();
        }
    }

    goSide(dx) {
        const oldX = this.figure.x;
        const newX = this.figure.x + dx;

        // 检查是否会超出边界
        let minX = 4;
        let maxX = 0;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.figure.image().includes(i * 4 + j)) {
                    minX = Math.min(minX, j);
                    maxX = Math.max(maxX, j);
                }
            }
        }

        const actualLeft = newX + minX;
        const actualRight = newX + maxX;

        if (actualLeft < 0 || actualRight >= this.width) {
            return;
        }

        this.figure.x = newX;
        if (this.intersects()) {
            this.figure.x = oldX;
        }
    }

    rotate() {
        const oldRotation = this.figure.rotation;
        const oldX = this.figure.x;
        this.figure.rotate();

        while (this.figure.x + this.getFigureWidth() > this.width) {
            this.figure.x -= 1;
        }

        while (this.figure.x < 0) {
            this.figure.x += 1;
        }

        if (this.intersects()) {
            this.figure.rotation = oldRotation;
            this.figure.x = oldX;
        } else {
            this.rotateSound.play();
        }
    }

    getFigureWidth() {
        let minX = 4;
        let maxX = 0;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (this.figure.image().includes(i * 4 + j)) {
                    minX = Math.min(minX, j);
                    maxX = Math.max(maxX, j);
                }
            }
        }
        return maxX - minX + 1;
    }

    loadHighScore() {
        const score = localStorage.getItem('highScore');
        return score ? parseInt(score) : 0;
    }

    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.score.toString());
        }
    }
}

// 游戏主循环
class Game {
    constructor() {
        this.canvas = document.getElementById('game');
        this.canvas.width = GAME_AREA_LEFT * 2 + FIELD_WIDTH * BLOCK_SIZE;
        this.canvas.height = GAME_AREA_TOP + FIELD_HEIGHT * BLOCK_SIZE + 20;
        this.ctx = this.canvas.getContext('2d');
        this.game = new Tetris(FIELD_HEIGHT, FIELD_WIDTH);
        this.counter = 0;
        this.fps = 30;
        this.pressingDown = false;

        // 绑定键盘事件
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // 创建游戏实例并开始游戏
        document.addEventListener('DOMContentLoaded', () => {
            new Game();
        });

        // 开始游戏循环
        this.gameLoop();
    }

    handleKeyDown(event) {
        if (event.key === 'Enter' && this.game.gameOver) {
            this.game.saveHighScore();
            this.game = new Tetris(FIELD_HEIGHT, FIELD_WIDTH);
            this.counter = 0;
            this.pressingDown = false;
        } else if (!this.game.gameOver) {
            switch (event.key) {
                case 'ArrowUp':
                    this.game.rotate();
                    break;
                case 'ArrowDown':
                    this.pressingDown = true;
                    break;
                case 'ArrowLeft':
                    this.game.goSide(-1);
                    break;
                case 'ArrowRight':
                    this.game.goSide(1);
                    break;
                case ' ':
                    this.game.goSpace();
                    break;
                case 'Escape':
                    // 游戏暂停或退出逻辑
                    break;
            }
        }
    }

    handleKeyUp(event) {
        if (event.key === 'ArrowDown') {
            this.pressingDown = false;
        }
    }

    gameLoop() {
        if (this.game.figure === null) {
            this.game.newFigure();
        }

        this.counter++;
        if (this.counter > 100000) {
            this.counter = 0;
        }

        if (this.counter % Math.floor(this.fps / this.game.level) === 0 || this.pressingDown) {
            if (this.game.state === "start" && !this.game.gameOver) {
                this.game.goDown();
            }
        }

        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    draw() {
        // 绘制背景
        this.ctx.fillStyle = COLORS[0];
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制游戏区域边框
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.strokeRect(GAME_AREA_LEFT - 2, GAME_AREA_TOP - 2,
                          FIELD_WIDTH * BLOCK_SIZE + 4, FIELD_HEIGHT * BLOCK_SIZE + 4);

        // 绘制游戏区域
        for (let i = 0; i < this.game.height; i++) {
            for (let j = 0; j < this.game.width; j++) {
                // 绘制网格
                this.ctx.strokeStyle = '#323232';
                this.ctx.strokeRect(GAME_AREA_LEFT + j * BLOCK_SIZE,
                                  GAME_AREA_TOP + i * BLOCK_SIZE,
                                  BLOCK_SIZE, BLOCK_SIZE);

                if (this.game.field[i][j] > 0) {
                    this.ctx.fillStyle = COLORS[this.game.field[i][j]];
                    this.ctx.fillRect(GAME_AREA_LEFT + j * BLOCK_SIZE,
                                    GAME_AREA_TOP + i * BLOCK_SIZE,
                                    BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            }
        }

        // 绘制消除行特效
        for (const effect of this.game.clearedLineEffects) {
            if (effect.effectTimer > 0) {
                // 创建发光效果
                this.ctx.fillStyle = '#ffff00';
                this.ctx.globalAlpha = effect.glowAlpha / 255;
                this.ctx.fillRect(GAME_AREA_LEFT, GAME_AREA_TOP + effect.line * BLOCK_SIZE,
                                FIELD_WIDTH * BLOCK_SIZE, BLOCK_SIZE);
                
                // 只在双倍得分时显示2x提示
                if (effect.isDouble && effect.effectTimer > 15) {
                    this.ctx.globalAlpha = 1;
                    this.ctx.fillStyle = '#ffff00';
                    this.ctx.font = '24px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('2x',
                        GAME_AREA_LEFT + FIELD_WIDTH * BLOCK_SIZE / 2,
                        GAME_AREA_TOP + effect.line * BLOCK_SIZE + BLOCK_SIZE / 2 + 8);
                }
                
                // 更新特效状态
                effect.effectTimer--;
                effect.glowAlpha = Math.floor(effect.glowAlpha * 0.9);
            }
        }
        this.ctx.globalAlpha = 1;

        // 绘制当前方块
        if (this.game.figure) {
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (this.game.figure.image().includes(i * 4 + j)) {
                        this.ctx.fillStyle = COLORS[this.game.figure.color];
                        this.ctx.fillRect(
                            GAME_AREA_LEFT + (j + this.game.figure.x) * BLOCK_SIZE,
                            GAME_AREA_TOP + (i + this.game.figure.y) * BLOCK_SIZE,
                            BLOCK_SIZE - 1,
                            BLOCK_SIZE - 1
                        );
                    }
                }
            }
        }

        // 更新分数显示
        document.getElementById('score').textContent = this.game.score;
        document.getElementById('level').textContent = this.game.level;
        document.getElementById('high-score').textContent = this.game.highScore;

        // 如果触发双倍得分特效，显示闪烁的分数
        if (this.game.doubleScoreEffect && this.game.doubleScoreTimer > 0) {
            const scoreElement = document.getElementById('score');
            if (this.game.doubleScoreTimer % 6 < 3) {
                scoreElement.style.color = '#ffff00';
            } else {
                scoreElement.style.color = '#ff8000';
            }
            this.game.doubleScoreTimer--;
            if (this.game.doubleScoreTimer <= 0) {
                this.game.doubleScoreEffect = false;
                scoreElement.style.color = '#ffffff';
            }
        }

        // 显示游戏结束界面
        const gameOverElement = document.getElementById('game-over');
        if (this.game.gameOver) {
            // 绘制半透明背景
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 显示游戏结束界面
            gameOverElement.style.display = 'block';
            gameOverElement.innerHTML = `
                <h2>游戏结束!</h2>
                <p>最终得分: ${this.game.score}</p>
                <p>按回车键重新开始</p>
            `;
        } else {
            gameOverElement.style.display = 'none';
        }
    }
}

// 创建游戏实例
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});