import Phaser from 'phaser';

/**
 * 游戏主场景 - 消消乐核心玩法
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // TODO: 加载资源
  }

  create(): void {
    // TODO: 创建游戏对象
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      '消消乐游戏\n开发中...',
      {
        fontSize: '48px',
        color: '#ffffff',
        align: 'center',
      }
    ).setOrigin(0.5);
  }
}
