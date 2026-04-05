import Phaser from 'phaser';
import { GridManager } from '../core/GridManager';
import { GameStateMachine, GameState } from '../core/GameStateMachine';
import { ScoreManager } from '../core/ScoreManager';
import { GravityEngine } from '../core/GravityEngine';
import { WebAudioSynthesizer } from '../audio/WebAudioSynthesizer';
import { Tile, GridPosition, TileType, SpecialType, GRID_SIZE } from '../types';

/**
 * 游戏主场景 - 消消乐核心玩法
 */
export class GameScene extends Phaser.Scene {
  // 核心管理器
  private gridManager!: GridManager;
  private stateMachine!: GameStateMachine;
  private scoreManager!: ScoreManager;
  private gravityEngine!: GravityEngine;
  private audioSynthesizer!: WebAudioSynthesizer;

  // 视觉元素
  private tileSprites: Phaser.GameObjects.Container[][] = [];
  private selectedPosition: GridPosition | null = null;
  private selectionMarker?: Phaser.GameObjects.Graphics;

  // 配置
  private readonly TILE_SIZE = 64;
  private readonly GRID_OFFSET_X = 100;
  private readonly GRID_OFFSET_Y = 100;
  private readonly ANIMATION_DURATION = 200;

  // 颜色配置
  private readonly TILE_COLORS: Record<TileType, number> = {
    [TileType.RED]: 0xff4444,
    [TileType.BLUE]: 0x4444ff,
    [TileType.GREEN]: 0x44ff44,
    [TileType.YELLOW]: 0xffff44,
    [TileType.PURPLE]: 0xff44ff,
    [TileType.ORANGE]: 0xff8844,
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // 使用程序化图形，无需加载资源
  }

  create(): void {
    // 初始化核心管理器
    this.initializeManagers();

    // 创建游戏棋盘
    this.createGameBoard();

    // 设置事件监听
    this.setupEventListeners();

    // 创建UI
    this.createUI();

    // 初始化并填充棋盘
    this.initializeBoard();

    // 开始游戏循环
    this.startGameLoop();
  }

  /**
   * 初始化管理器
   */
  private initializeManagers(): void {
    this.gridManager = new GridManager();
    this.stateMachine = new GameStateMachine();
    this.scoreManager = new ScoreManager();
    this.gravityEngine = new GravityEngine();
    this.audioSynthesizer = new WebAudioSynthesizer();
  }

  /**
   * 创建游戏棋盘容器
   */
  private createGameBoard(): void {
    this.tileSprites = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      this.tileSprites[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const container = this.add.container(
          this.GRID_OFFSET_X + col * this.TILE_SIZE,
          this.GRID_OFFSET_Y + row * this.TILE_SIZE
        );
        container.setSize(this.TILE_SIZE, this.TILE_SIZE);
        container.setInteractive();

        this.tileSprites[row][col] = container;
      }
    }
  }

  /**
   * 创建UI元素
   */
  private createUI(): void {
    // 分数显示
    this.add.text(20, 20, '分数:', { fontSize: '24px', color: '#ffffff' });
    const scoreText = this.add.text(20, 50, '0', {
      fontSize: '32px',
      color: '#ffff00',
      fontStyle: 'bold',
    });

    // 连击显示
    this.add.text(20, 90, '连击:', { fontSize: '24px', color: '#ffffff' });
    const comboText = this.add.text(20, 120, '0', {
      fontSize: '32px',
      color: '#ff8800',
      fontStyle: 'bold',
    });

    // 移动次数
    this.add.text(20, 160, '移动:', { fontSize: '24px', color: '#ffffff' });
    const movesText = this.add.text(20, 190, '0', {
      fontSize: '32px',
      color: '#00ffff',
      fontStyle: 'bold',
    });

    // 监听分数变化
    this.scoreManager.on('score-changed', (score: number) => {
      scoreText.setText(score.toString());
    });

    // 监听连击变化
    this.scoreManager.on('combo-changed', (combo: number) => {
      comboText.setText(combo.toString());
    });

    // 监听移动变化
    this.scoreManager.on('moves-changed', (moves: number) => {
      movesText.setText(moves.toString());
    });

    // 创建选择标记
    this.selectionMarker = this.add.graphics();
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 状态变化监听
    this.stateMachine.on('state-change', (from: GameState, to: GameState) => {
      console.log(`State: ${from} -> ${to}`);
    });

    // 键盘快捷键
    this.input.keyboard?.on('keydown-P', () => {
      this.togglePause();
    });

    this.input.keyboard?.on('keydown-R', () => {
      this.resetGame();
    });
  }

  /**
   * 初始化棋盘
   */
  private initializeBoard(): void {
    // 创建初始网格，确保没有初始匹配
    this.gridManager.shuffle();
    this.gridManager.fillEmptyWithRandom();

    // 确保没有初始匹配
    while (this.gridManager.getGrid().some((row, r) =>
      row.some((tile, c) => {
        if (!tile) return false;
        const matches = this.gridManager['matchDetector'].checkPosition(
          this.gridManager.getGrid(),
          { row: r, col: c }
        );
        return matches.length > 0;
      })
    )) {
      this.gridManager.shuffle();
    }

    this.updateBoardDisplay();
  }

  /**
   * 开始游戏循环
   */
  private startGameLoop(): void {
    this.stateMachine.transition(GameState.IDLE);
  }

  /**
   * 处理格子点击
   */
  private handleTileClick(row: number, col: number): void {
    if (!this.stateMachine.canPlayerAct()) {
      return;
    }

    const pos: GridPosition = { row, col };

    if (this.selectedPosition === null) {
      // 第一次点击 - 选择元素
      this.selectedPosition = pos;
      this.stateMachine.transition(GameState.SELECTING);
      this.audioSynthesizer.playSelect();
      this.updateSelectionMarker();
    } else if (
      this.selectedPosition.row === row &&
      this.selectedPosition.col === col
    ) {
      // 点击同一个元素 - 取消选择
      this.selectedPosition = null;
      this.stateMachine.transition(GameState.IDLE);
      this.updateSelectionMarker();
    } else {
      // 点击另一个元素 - 尝试交换
      this.trySwap(this.selectedPosition, pos);
    }
  }

  /**
   * 尝试交换两个元素
   */
  private async trySwap(pos1: GridPosition, pos2: GridPosition): Promise<void> {
    this.stateMachine.transition(GameState.SWAPPING);
    this.selectedPosition = null;
    this.updateSelectionMarker();

    const result = this.gridManager.trySwap(pos1, pos2);

    if (!result.success) {
      this.audioSynthesizer.playInvalid();
      this.stateMachine.transition(GameState.IDLE);
      return;
    }

    this.audioSynthesizer.playSwap();
    this.scoreManager.incrementMoves();

    // 播放交换动画
    await this.animateSwap(pos1, pos2);

    if (result.matches.length > 0) {
      await this.processMatches(result.matches);
    } else {
      this.stateMachine.transition(GameState.IDLE);
    }
  }

  /**
   * 处理匹配消除
   */
  private async processMatches(matches: import('../types').Match[]): Promise<void> {
    this.stateMachine.transition(GameState.MATCHING);
    this.scoreManager.incrementCombo();

    const combo = this.scoreManager.getCombo();
    this.audioSynthesizer.playClear(combo);

    // 计算分数
    let totalScore = 0;
    for (const match of matches) {
      const score = this.scoreManager.calculateScore(
        match.length,
        SpecialType.NONE,
        true
      );
      totalScore += score;
    }
    this.scoreManager.addScore(totalScore);

    // 播放消除动画
    await this.animateMatches(matches);

    // 移除匹配的元素
    this.gridManager.removeMatches(matches);
    this.updateBoardDisplay();

    // 应用重力
    await this.applyGravity();
  }

  /**
   * 应用重力
   */
  private async applyGravity(): Promise<void> {
    this.stateMachine.transition(GameState.GRAVITY);

    const grid = this.gridManager.getGrid();
    const result = this.gravityEngine.applyGravity(grid);

    this.audioSynthesizer.playDrop();

    // 播放下落动画
    await this.animateGravity(result);

    this.updateBoardDisplay();

    // 检查是否有新的匹配
    const matches = this.gridManager['matchDetector'].findAllMatches(grid);

    if (matches.length > 0) {
      this.stateMachine.transition(GameState.CASCADE);
      await this.processMatches(matches);
    } else {
      this.scoreManager.resetCombo();
      this.stateMachine.transition(GameState.IDLE);

      // 检查死局
      if (!this.gridManager.hasValidMoves()) {
        this.gridManager.shuffle();
        this.updateBoardDisplay();
      }
    }
  }

  /**
   * 播放交换动画
   */
  private async animateSwap(pos1: GridPosition, pos2: GridPosition): Promise<void> {
    return new Promise(resolve => {
      const sprite1 = this.tileSprites[pos1.row][pos1.col];
      const sprite2 = this.tileSprites[pos2.row][pos2.col];

      const x1 = sprite1.x;
      const y1 = sprite1.y;
      const x2 = sprite2.x;
      const y2 = sprite2.y;

      this.tweens.add({
        targets: [sprite1, sprite2],
        x: (target: Phaser.GameObjects.Container) =>
          target === sprite1 ? x2 : x1,
        y: (target: Phaser.GameObjects.Container) =>
          target === sprite1 ? y2 : y1,
        duration: this.ANIMATION_DURATION,
        ease: Phaser.Math.Easing.Quadratic.Out,
        onComplete: () => {
          // 交换容器引用
          const temp = this.tileSprites[pos1.row][pos1.col];
          this.tileSprites[pos1.row][pos1.col] = this.tileSprites[pos2.row][pos2.col];
          this.tileSprites[pos2.row][pos2.col] = temp;
          resolve();
        },
      });
    });
  }

  /**
   * 播放消除动画
   */
  private async animateMatches(matches: import('../types').Match[]): Promise<void> {
    return new Promise(resolve => {
      const toRemove: Set<string> = new Set();

      for (const match of matches) {
        for (const tile of match.tiles) {
          const key = `${tile.position.row}-${tile.position.col}`;
          toRemove.add(key);
        }
      }

      const targets: Phaser.GameObjects.Container[] = [];

      for (const key of toRemove) {
        const [row, col] = key.split('-').map(Number);
        const container = this.tileSprites[row][col];
        if (container) {
          targets.push(container);
        }
      }

      this.tweens.add({
        targets,
        scale: 0,
        alpha: 0,
        duration: this.ANIMATION_DURATION,
        ease: Phaser.Math.Easing.Back.In,
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * 播放重力动画
   */
  private async animateGravity(result: import('../types').GravityResult): Promise<void> {
    return new Promise(resolve => {
      const tweens: Phaser.Tweens.Tween[] = [];

      for (const movement of result.movements) {
        const container = this.tileSprites[movement.to.row][movement.to.col];

        if (movement.isNew) {
          container.setScale(0);
          container.setAlpha(0);
        }

        tweens.push(
          this.tweens.add({
            targets: container,
            scale: 1,
            alpha: 1,
            duration: this.ANIMATION_DURATION,
            delay: movement.distance * 20,
            ease: Phaser.Math.Easing.Bounce.Out,
          })
        );
      }

      if (tweens.length > 0) {
        this.tweens.add({
          targets: tweens[tweens.length - 1],
          duration: this.ANIMATION_DURATION + 100,
          onComplete: () => resolve(),
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 更新棋盘显示
   */
  private updateBoardDisplay(): void {
    const grid = this.gridManager.getGrid();

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const container = this.tileSprites[row][col];
        const tile = grid[row][col];

        container.removeAll();

        if (tile) {
          const graphics = this.add.graphics();
          const color = this.TILE_COLORS[tile.type];

          // 绘制圆角矩形
          graphics.fillStyle(color, 1);
          graphics.fillRoundedRect(
            -this.TILE_SIZE / 2 + 4,
            -this.TILE_SIZE / 2 + 4,
            this.TILE_SIZE - 8,
            this.TILE_SIZE - 8,
            8
          );

          // 绘制高光
          graphics.fillStyle(0xffffff, 0.3);
          graphics.fillCircle(
            -this.TILE_SIZE / 4,
            -this.TILE_SIZE / 4,
            this.TILE_SIZE / 6
          );

          container.add(graphics);

          // 设置点击事件
          container.removeAllListeners();
          container.on('pointerdown', () => {
            this.handleTileClick(row, col);
          });
        }
      }
    }
  }

  /**
   * 更新选择标记
   */
  private updateSelectionMarker(): void {
    if (!this.selectionMarker) return;

    this.selectionMarker.clear();

    if (this.selectedPosition) {
      const { row, col } = this.selectedPosition;
      const x = this.GRID_OFFSET_X + col * this.TILE_SIZE;
      const y = this.GRID_OFFSET_Y + row * this.TILE_SIZE;

      this.selectionMarker.lineStyle(4, 0xffffff);
      this.selectionMarker.strokeRoundedRect(
        x - this.TILE_SIZE / 2,
        y - this.TILE_SIZE / 2,
        this.TILE_SIZE,
        this.TILE_SIZE,
        8
      );
    }
  }

  /**
   * 切换暂停
   */
  private togglePause(): void {
    if (this.stateMachine.isPaused()) {
      this.stateMachine.resume();
      this.audioSynthesizer.playResume();
      this.scene.resume();
    } else {
      this.stateMachine.pause();
      this.audioSynthesizer.playPause();
      this.scene.pause();

      // 显示暂停菜单
      this.showPauseMenu();
    }
  }

  /**
   * 显示暂停菜单
   */
  private showPauseMenu(): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(
      0,
      0,
      this.cameras.main.width,
      this.cameras.main.height
    );

    const pauseText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      '已暂停',
      {
        fontSize: '64px',
        color: '#ffffff',
        fontStyle: 'bold',
      }
    );
    pauseText.setOrigin(0.5);

    const resumeText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 50,
      '按 P 继续',
      {
        fontSize: '32px',
        color: '#ffff00',
      }
    );
    resumeText.setOrigin(0.5);
  }

  /**
   * 重置游戏
   */
  private resetGame(): void {
    this.scoreManager.reset();
    this.stateMachine.reset();
    this.selectedPosition = null;
    this.updateSelectionMarker();
    this.initializeBoard();
    this.audioSynthesizer.playSelect();
  }
}
