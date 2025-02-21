// 颜色定义
const COLORS = [
    '#000000',    // 黑色（背景）
    '#D64C35',    // 朱红
    '#2B5F75',    // 藏蓝
    '#8E4B2C',    // 赭石
    '#557C3E',    // 松绿
    '#794B8F',    // 紫色
    '#C17E61',    // 檀色
];

// 游戏设置
const BLOCK_SIZE = 24;  // 方块大小
const FIELD_WIDTH = 10;
const FIELD_HEIGHT = 20;
const GAME_AREA_LEFT = 160;  // 增加左侧空间以适应进度显示
const GAME_AREA_TOP = 50;
const PREVIEW_BLOCK_SIZE = BLOCK_SIZE * 0.8;  // 稍微缩小预览区块大小
const PREVIEW_AREA_LEFT = GAME_AREA_LEFT + FIELD_WIDTH * BLOCK_SIZE + 30;  // 减少间距
const PREVIEW_AREA_TOP = 220;  // 将预览区域向下移动
const PREVIEW_AREA_SIZE = 120;  // 预览区域大小

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
        this.state = "waiting";
        this.figure = null;
        this.nextFigure = null;
        this.progressCount = 0;
        this.maxProgressColumns = 4;
        this.progressBlocksPerColumn = height;
        this.victory = false;
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

        // 显示欢迎界面
        document.getElementById('welcome-screen').style.display = 'block';
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
                // 更新进度并检查胜利条件
                this.progressCount++;
                if (this.progressCount >= this.maxProgressColumns * this.progressBlocksPerColumn) {
                    this.victory = true;
                    this.gameOver = true;
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
        this.canvas.width = 700;  // 设置固定宽度
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
        if (event.key === 'Enter') {
            if (this.game.gameOver) {
                this.game.saveHighScore();
                this.game = new Tetris(FIELD_HEIGHT, FIELD_WIDTH);
                this.counter = 0;
                this.pressingDown = false;
            } else if (this.game.state === "waiting") {
                this.game.state = "playing";
                document.getElementById('welcome-screen').style.display = 'none';
            }
        } else if (this.game.state === "playing" && !this.game.gameOver) {
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

        if (this.counter % Math.floor(this.fps / (0.5 + this.game.level * 0.5)) === 0 || this.pressingDown) {
            if (this.game.state === "playing" && !this.game.gameOver) {
                this.game.goDown();
            }
        }

        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
    }

    draw() {
        // 绘制背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#2B5F75');  // 藏蓝色
        gradient.addColorStop(1, '#000000');  // 渐变至黑色
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制装饰性边框
        this.ctx.strokeStyle = '#C17E61';  // 檀色边框
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(10, 10, this.canvas.width - 20, this.canvas.height - 20);

        // 添加水墨风装饰
        this.ctx.strokeStyle = 'rgba(193, 126, 97, 0.3)';  // 半透明檀色
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(30, 30);
        this.ctx.lineTo(this.canvas.width - 30, 30);
        this.ctx.moveTo(30, this.canvas.height - 30);
        this.ctx.lineTo(this.canvas.width - 30, this.canvas.height - 30);
        this.ctx.stroke();

        // 绘制游戏区域边框和背景
        this.ctx.fillStyle = 'rgba(43, 95, 117, 0.3)';  // 半透明藏蓝色
        this.ctx.fillRect(GAME_AREA_LEFT - 2, GAME_AREA_TOP - 2,
                          FIELD_WIDTH * BLOCK_SIZE + 4, FIELD_HEIGHT * BLOCK_SIZE + 4);
        this.ctx.strokeStyle = '#D64C35';  // 朱红色边框
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(GAME_AREA_LEFT - 2, GAME_AREA_TOP - 2,
                          FIELD_WIDTH * BLOCK_SIZE + 4, FIELD_HEIGHT * BLOCK_SIZE + 4);

        // 绘制游戏区域
        for (let i = 0; i < this.game.height; i++) {
            for (let j = 0; j < this.game.width; j++) {
                // 绘制网格
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                this.ctx.lineWidth = 0.5;
                this.ctx.strokeRect(GAME_AREA_LEFT + j * BLOCK_SIZE,
                                  GAME_AREA_TOP + i * BLOCK_SIZE,
                                  BLOCK_SIZE, BLOCK_SIZE);

                if (this.game.field[i][j] > 0) {
                    const x = GAME_AREA_LEFT + j * BLOCK_SIZE;
                    const y = GAME_AREA_TOP + i * BLOCK_SIZE;
                    
                    // 绘制方块阴影
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    this.ctx.fillRect(x + 2, y + 2, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                    
                    // 绘制方块主体
                    const blockGradient = this.ctx.createLinearGradient(x, y, x, y + BLOCK_SIZE);
                    const baseColor = COLORS[this.game.field[i][j]];
                    blockGradient.addColorStop(0, this.lightenColor(baseColor, 20));
                    blockGradient.addColorStop(1, baseColor);
                    
                    this.ctx.fillStyle = blockGradient;
                    this.ctx.fillRect(x, y, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                    
                    // 绘制高光效果
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    this.ctx.fillRect(x, y, BLOCK_SIZE - 1, Math.floor(BLOCK_SIZE / 4));
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
                        const x = GAME_AREA_LEFT + (j + this.game.figure.x) * BLOCK_SIZE;
                        const y = GAME_AREA_TOP + (i + this.game.figure.y) * BLOCK_SIZE;
                        
                        // 绘制方块阴影
                        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                        this.ctx.fillRect(x + 2, y + 2, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                        
                        // 绘制方块主体
                        const blockGradient = this.ctx.createLinearGradient(x, y, x, y + BLOCK_SIZE);
                        const baseColor = COLORS[this.game.figure.color];
                        blockGradient.addColorStop(0, this.lightenColor(baseColor, 20));
                        blockGradient.addColorStop(1, baseColor);
                        
                        this.ctx.fillStyle = blockGradient;
                        this.ctx.fillRect(x, y, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                        
                        // 绘制高光效果
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                        this.ctx.fillRect(x, y, BLOCK_SIZE - 1, Math.floor(BLOCK_SIZE / 4));
                    }
                }
            }
        }

        // 绘制预览区域
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px "Microsoft YaHei", "SimHei", Arial, sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('下一个:', PREVIEW_AREA_LEFT, PREVIEW_AREA_TOP + 10);

        // 绘制预览区域边框
        this.ctx.strokeStyle = '#C17E61';  // 檀色边框
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(PREVIEW_AREA_LEFT, PREVIEW_AREA_TOP + 20,
                          PREVIEW_AREA_SIZE, PREVIEW_AREA_SIZE);

        // 添加装饰性角落
        this.ctx.strokeStyle = 'rgba(193, 126, 97, 0.5)';
        this.ctx.lineWidth = 1;
        const cornerSize = 10;
        
        // 左上角
        this.ctx.beginPath();
        this.ctx.moveTo(PREVIEW_AREA_LEFT, PREVIEW_AREA_TOP + cornerSize + 20);
        this.ctx.lineTo(PREVIEW_AREA_LEFT, PREVIEW_AREA_TOP + 20);
        this.ctx.lineTo(PREVIEW_AREA_LEFT + cornerSize, PREVIEW_AREA_TOP + 20);
        this.ctx.stroke();
        
        // 右上角
        this.ctx.beginPath();
        this.ctx.moveTo(PREVIEW_AREA_LEFT + PREVIEW_AREA_SIZE - cornerSize, PREVIEW_AREA_TOP + 20);
        this.ctx.lineTo(PREVIEW_AREA_LEFT + PREVIEW_AREA_SIZE, PREVIEW_AREA_TOP + 20);
        this.ctx.lineTo(PREVIEW_AREA_LEFT + PREVIEW_AREA_SIZE, PREVIEW_AREA_TOP + cornerSize + 20);
        this.ctx.stroke();
        
        // 左下角
        this.ctx.beginPath();
        this.ctx.moveTo(PREVIEW_AREA_LEFT, PREVIEW_AREA_TOP + PREVIEW_AREA_SIZE - cornerSize + 20);
        this.ctx.lineTo(PREVIEW_AREA_LEFT, PREVIEW_AREA_TOP + PREVIEW_AREA_SIZE + 20);
        this.ctx.lineTo(PREVIEW_AREA_LEFT + cornerSize, PREVIEW_AREA_TOP + PREVIEW_AREA_SIZE + 20);
        this.ctx.stroke();
        
        // 右下角
        this.ctx.beginPath();
        this.ctx.moveTo(PREVIEW_AREA_LEFT + PREVIEW_AREA_SIZE - cornerSize, PREVIEW_AREA_TOP + PREVIEW_AREA_SIZE + 20);
        this.ctx.lineTo(PREVIEW_AREA_LEFT + PREVIEW_AREA_SIZE, PREVIEW_AREA_TOP + PREVIEW_AREA_SIZE + 20);
        this.ctx.lineTo(PREVIEW_AREA_LEFT + PREVIEW_AREA_SIZE, PREVIEW_AREA_TOP + PREVIEW_AREA_SIZE - cornerSize + 20);
        this.ctx.stroke();

        // 绘制下一个方块
        if (this.game.nextFigure) {
            const shape = this.game.nextFigure.image();
            let minX = 4, maxX = 0, minY = 4, maxY = 0;
            
            // 计算方块的实际边界
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (shape.includes(i * 4 + j)) {
                        minX = Math.min(minX, j);
                        maxX = Math.max(maxX, j);
                        minY = Math.min(minY, i);
                        maxY = Math.max(maxY, i);
                    }
                }
            }
            
            const blockWidth = maxX - minX + 1;
            const blockHeight = maxY - minY + 1;
            
            // 修改缩放比例计算逻辑，使预览区域的方块大小与游戏区域一致
            const previewCenterX = PREVIEW_AREA_LEFT + (PREVIEW_AREA_SIZE - blockWidth * BLOCK_SIZE) / 2;
            const previewCenterY = PREVIEW_AREA_TOP + 20 + (PREVIEW_AREA_SIZE - blockHeight * BLOCK_SIZE) / 2;
            
            // 绘制预览方块
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (shape.includes(i * 4 + j)) {
                        const x = previewCenterX + (j - minX) * BLOCK_SIZE;
                        const y = previewCenterY + (i - minY) * BLOCK_SIZE;
                        
                        // 绘制方块阴影
                        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                        this.ctx.fillRect(x + 2, y + 2, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                        
                        // 绘制方块主体
                        const blockGradient = this.ctx.createLinearGradient(x, y, x, y + BLOCK_SIZE);
                        const baseColor = COLORS[this.game.nextFigure.color];
                        blockGradient.addColorStop(0, this.lightenColor(baseColor, 20));
                        blockGradient.addColorStop(1, baseColor);
                        
                        this.ctx.fillStyle = blockGradient;
                        this.ctx.fillRect(x, y, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                        
                        // 绘制高光效果
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                        this.ctx.fillRect(x, y, BLOCK_SIZE - 1, Math.floor(BLOCK_SIZE / 4));
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

        // 绘制进度显示区域
        const progressLeft = 20;
        const progressBottom = GAME_AREA_TOP + FIELD_HEIGHT * BLOCK_SIZE;
        const progressBlockSize = BLOCK_SIZE;  // 使用与游戏区相同的方块大小
        const progressSpacing = 2;

        // 添加分隔线
        this.ctx.strokeStyle = '#C17E61';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(progressLeft + this.game.maxProgressColumns * (progressBlockSize + progressSpacing) + 20, GAME_AREA_TOP);
        this.ctx.lineTo(progressLeft + this.game.maxProgressColumns * (progressBlockSize + progressSpacing) + 20, progressBottom);
        this.ctx.stroke();

        for (let col = 0; col < this.game.maxProgressColumns; col++) {
            for (let row = 0; row < this.game.progressBlocksPerColumn; row++) {
                const blockIndex = col * this.game.progressBlocksPerColumn + row;
                const x = progressLeft + col * (progressBlockSize + progressSpacing);
                const y = progressBottom - (row + 1) * (progressBlockSize + progressSpacing);

                // 如果该方块应该被填充
                if (blockIndex < this.game.progressCount) {
                    // 计算当前列的颜色
                    const progress = col / (this.game.maxProgressColumns - 1);
                    const r = Math.round(255 + (135 - 255) * progress);  // 从白色(255)过渡到天空蓝(135)
                    const g = Math.round(255 + (206 - 255) * progress);  // 从白色(255)过渡到天空蓝(206)
                    const b = Math.round(255 + (235 - 255) * progress);  // 从白色(255)过渡到天空蓝(235)
                    const color = `rgb(${r}, ${g}, ${b})`;
                    
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(x, y, progressBlockSize, progressBlockSize);
                }
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
            if (this.game.victory) {
                gameOverElement.innerHTML = `
                    <h2>恭喜胜利!</h2>
                    <p>最终得分: ${this.game.score}</p>
                    <p>按回车键重新开始</p>
                `;
            } else {
                gameOverElement.innerHTML = `
                    <h2>游戏结束!</h2>
                    <p>最终得分: ${this.game.score}</p>
                    <p>按回车键重新开始</p>
                `;
            }
        } else {
            gameOverElement.style.display = 'none';
        }
    }
}

// 创建游戏实例
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});