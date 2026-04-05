import { SpecialType } from '../types';
import { GameEventEmitter } from './GameEventEmitter';

/**
 * 分数统计信息
 */
export interface ScoreStatistics {
  score: number;
  combo: number;
  maxCombo: number;
  moves: number;
  stars: number;
}

/**
 * 分数管理器 - 负责计算和管理游戏分数
 */
export class ScoreManager extends GameEventEmitter {
  private score: number;
  private combo: number;
  private maxCombo: number;
  private moves: number;
  private currentStars: number;
  private starThresholds: number[];

  // 基础分数配置
  private readonly BASE_POINTS = { 3: 10, 4: 15, 5: 20 };

  // 特殊元素加成
  private readonly SPECIAL_BONUS = {
    [SpecialType.NONE]: 0,
    [SpecialType.LINE_HORIZONTAL]: 50,
    [SpecialType.LINE_VERTICAL]: 50,
    [SpecialType.AREA]: 100,
    [SpecialType.RAINBOW]: 200,
  };

  constructor() {
    super();
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.moves = 0;
    this.currentStars = 0;
    this.starThresholds = [1000, 3000, 5000]; // 默认星级阈值
  }

  /**
   * 获取当前分数
   */
  public getScore(): number {
    return this.score;
  }

  /**
   * 添加分数
   */
  public addScore(points: number): void {
    const oldStars = this.calculateStars(this.score);
    this.score += points;
    const newStars = this.calculateStars(this.score);

    this.emit('score-changed', this.score);

    if (newStars !== oldStars) {
      this.currentStars = newStars;
      this.emit('stars-changed', newStars);
    }
  }

  /**
   * 计算消除得分
   * @param matchLength 匹配长度
   * @param specialType 特殊元素类型
   * @param isCascade 是否为连锁消除
   */
  public calculateScore(
    matchLength: number,
    specialType: SpecialType,
    isCascade: boolean
  ): number {
    // 计算基础分数
    const length = Math.min(matchLength, 5);
    const basePoints = this.BASE_POINTS[length as keyof typeof this.BASE_POINTS] || 10;
    let score = matchLength * basePoints;

    // 连锁加成：combo数作为倍率
    if (isCascade && this.combo > 0) {
      score *= this.combo + 1;
    }

    // 特殊元素加成
    score += this.SPECIAL_BONUS[specialType] || 0;

    return score;
  }

  /**
   * 获取当前连击数
   */
  public getCombo(): number {
    return this.combo;
  }

  /**
   * 增加连击数
   */
  public incrementCombo(): void {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.emit('combo-changed', this.combo);
  }

  /**
   * 重置连击数
   */
  public resetCombo(): void {
    this.combo = 0;
    this.emit('combo-reset');
  }

  /**
   * 获取最大连击数
   */
  public getMaxCombo(): number {
    return this.maxCombo;
  }

  /**
   * 获取移动次数
   */
  public getMoves(): number {
    return this.moves;
  }

  /**
   * 增加移动次数
   */
  public incrementMoves(): void {
    this.moves++;
    this.emit('moves-changed', this.moves);
  }

  /**
   * 获取星级评定
   */
  public getStars(): number {
    return this.currentStars;
  }

  /**
   * 计算星级
   */
  private calculateStars(score: number): number {
    let stars = 0;
    for (const threshold of this.starThresholds) {
      if (score >= threshold) {
        stars++;
      }
    }
    return stars;
  }

  /**
   * 设置自定义星级阈值
   */
  public setScoreThresholds(thresholds: number[]): void {
    this.starThresholds = [...thresholds].sort((a, b) => a - b);
    const newStars = this.calculateStars(this.score);
    if (newStars !== this.currentStars) {
      this.currentStars = newStars;
      this.emit('stars-changed', newStars);
    }
  }

  /**
   * 重置所有数据
   */
  public reset(): void {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.moves = 0;
    this.currentStars = 0;

    this.emit('reset');
  }

  /**
   * 获取统计信息
   */
  public getStatistics(): ScoreStatistics {
    return {
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      moves: this.moves,
      stars: this.currentStars,
    };
  }
}
