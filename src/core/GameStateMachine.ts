import { GameEventEmitter } from './GameEventEmitter';

/**
 * 游戏状态枚举
 */
export enum GameState {
  /** 空闲状态，等待玩家操作 */
  IDLE = 'idle',
  /** 玩家正在选择元素 */
  SELECTING = 'selecting',
  /** 元素交换动画中 */
  SWAPPING = 'swapping',
  /** 匹配消除动画中 */
  MATCHING = 'matching',
  /** 重力下落动画中 */
  GRAVITY = 'gravity',
  /** 连锁反应处理中 */
  CASCADE = 'cascade',
  /** 游戏结束 */
  GAME_OVER = 'game_over',
  /** 游戏暂停 */
  PAUSED = 'paused',
}

/**
 * 状态转换结果
 */
interface TransitionResult {
  success: boolean;
  error?: string;
}

/**
 * 游戏状态机 - 管理游戏状态转换
 */
export class GameStateMachine extends GameEventEmitter {
  private currentState: GameState;
  private previousState: GameState | null;
  private stateBeforePause: GameState | null;
  private transitionHistory: GameState[];

  // 定义有效的状态转换
  private readonly validTransitions: Readonly<Record<GameState, GameState[]>> = {
    [GameState.IDLE]: [GameState.SELECTING, GameState.PAUSED, GameState.GAME_OVER],
    [GameState.SELECTING]: [GameState.SWAPPING, GameState.IDLE, GameState.PAUSED, GameState.GAME_OVER],
    [GameState.SWAPPING]: [GameState.MATCHING, GameState.IDLE, GameState.PAUSED, GameState.GAME_OVER],
    [GameState.MATCHING]: [GameState.GRAVITY, GameState.PAUSED, GameState.GAME_OVER],
    [GameState.GRAVITY]: [GameState.CASCADE, GameState.PAUSED, GameState.GAME_OVER],
    [GameState.CASCADE]: [GameState.MATCHING, GameState.IDLE, GameState.PAUSED, GameState.GAME_OVER],
    [GameState.GAME_OVER]: [GameState.PAUSED], // Only PAUSED is allowed, reset uses forceSetState
    [GameState.PAUSED]: [
      GameState.IDLE,
      GameState.SELECTING,
      GameState.SWAPPING,
      GameState.MATCHING,
      GameState.GRAVITY,
      GameState.CASCADE,
      GameState.GAME_OVER,
    ],
  };

  constructor() {
    super();
    this.currentState = GameState.IDLE;
    this.previousState = null;
    this.stateBeforePause = null;
    this.transitionHistory = [GameState.IDLE];
  }

  /**
   * 获取当前状态
   */
  public getCurrentState(): GameState {
    return this.currentState;
  }

  /**
   * 获取上一个状态
   */
  public getPreviousState(): GameState | null {
    return this.previousState;
  }

  /**
   * 检查是否可以转换到指定状态
   */
  public canTransition(to: GameState): boolean {
    // 不能转换到当前状态
    if (to === this.currentState) {
      return false;
    }

    const allowed = this.validTransitions[this.currentState];
    return allowed.includes(to);
  }

  /**
   * 尝试转换到指定状态
   */
  public transition(to: GameState): TransitionResult {
    if (!this.canTransition(to)) {
      return {
        success: false,
        error: `Invalid transition from ${this.currentState} to ${to}`,
      };
    }

    const from = this.currentState;
    this.previousState = this.currentState;
    this.currentState = to;
    this.transitionHistory.push(to);

    this.emit('state-change', from, to);
    this.emit(`state:${to}`, from);

    return { success: true };
  }

  /**
   * 强制设置状态（不验证转换合法性）
   * 用于特殊情况，如从存档加载
   */
  public forceSetState(state: GameState): void {
    const from = this.currentState;
    this.previousState = this.currentState;
    this.currentState = state;
    this.transitionHistory.push(state);

    this.emit('state-change', from, state);
    this.emit(`state:${state}`, from);
  }

  /**
   * 暂停游戏
   */
  public pause(): void {
    if (this.currentState === GameState.PAUSED) {
      return;
    }

    this.stateBeforePause = this.currentState;
    const from = this.currentState;
    this.previousState = this.currentState;
    this.currentState = GameState.PAUSED;

    this.emit('state-change', from, GameState.PAUSED);
    this.emit('paused', from);
  }

  /**
   * 恢复游戏
   */
  public resume(): void {
    if (this.currentState !== GameState.PAUSED) {
      return;
    }

    const to = this.stateBeforePause ?? GameState.IDLE;
    this.previousState = GameState.PAUSED;
    this.currentState = to;

    this.emit('state-change', GameState.PAUSED, to);
    this.emit('resumed', to);
  }

  /**
   * 检查是否暂停
   */
  public isPaused(): boolean {
    return this.currentState === GameState.PAUSED;
  }

  /**
   * 设置游戏结束状态
   */
  public setGameOver(): void {
    this.transition(GameState.GAME_OVER);
    this.emit('game-over');
  }

  /**
   * 重置状态机到初始状态
   */
  public reset(): void {
    const from = this.currentState;
    this.currentState = GameState.IDLE;
    this.previousState = null;
    this.stateBeforePause = null;
    this.transitionHistory = [GameState.IDLE];

    this.emit('state-change', from, GameState.IDLE);
    this.emit('reset');
  }

  /**
   * 检查当前状态是否为指定状态之一
   */
  public isState(...states: GameState[]): boolean {
    return states.includes(this.currentState);
  }

  /**
   * 检查玩家是否可以操作
   */
  public canPlayerAct(): boolean {
    if (this.isPaused()) {
      return false;
    }

    return (
      this.currentState === GameState.IDLE ||
      this.currentState === GameState.SELECTING
    );
  }

  /**
   * 检查是否正在播放动画
   */
  public isAnimating(): boolean {
    return (
      this.currentState === GameState.SWAPPING ||
      this.currentState === GameState.MATCHING ||
      this.currentState === GameState.GRAVITY ||
      this.currentState === GameState.CASCADE
    );
  }

  /**
   * 获取状态转换历史
   */
  public getTransitionHistory(): GameState[] {
    return [...this.transitionHistory];
  }

  /**
   * 清除状态转换历史
   */
  public clearHistory(): void {
    this.transitionHistory = [this.currentState];
  }
}
