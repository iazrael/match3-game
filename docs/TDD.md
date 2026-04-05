# 消消乐 H5 游戏 - 技术设计文档 (TDD)

**文档版本**: v1.0  
**日期**: 2026-04-05  
**作者**: GLM-5  
**关联文档**: [PRD.md](./PRD.md)

---

## 1. 系统架构

### 1.1 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  MenuScene  │  │ LevelMapScene│  │     GameScene       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                    │ GridRenderer │ HUD    │  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Game Logic Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  GridManager │  │ MatchEngine │  │  SpecialDetector   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │GravityEngine│  │ ScoreManager│  │   StateMachine     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Data & Service Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │LevelManager │  │SoundManager │  │  StorageManager    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ ParticlePool│  │  TilePool   │  │   InputHandler     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 数据流

```
User Input → InputHandler → StateMachine → GridManager
                                      ↓
                              MatchEngine.detect()
                                      ↓
                         ┌────────────┴────────────┐
                         ↓                         ↓
                   Match Found              No Match
                         ↓                         ↓
              SpecialDetector.check()      Swap Back
                         ↓
              ScoreManager.calculate()
                         ↓
              GridManager.remove()
                         ↓
              GravityEngine.apply()
                         ↓
              GridManager.fill()
                         ↓
              Check New Matches (Cascade)
```

### 1.3 模块职责

| 模块 | 职责 | 关键类 |
|-----|------|-------|
| GridManager | 棋盘状态管理、元素操作 | Grid, Tile, Obstacle |
| MatchEngine | 匹配检测算法 | MatchDetector |
| SpecialDetector | 特殊元素生成判定 | PatternMatcher |
| GravityEngine | 重力下落、新元素填充 | GravitySimulator |
| ScoreManager | 分数计算、连击追踪 | ScoreCalculator |
| StateMachine | 游戏状态流转 | GameStateMachine |
| SoundManager | 程序化音效生成 | WebAudioSynthesizer |
| StorageManager | 本地数据持久化 | LocalStorageAdapter |

---

## 2. 核心算法

### 2.1 匹配检测算法

#### 2.1.1 基础匹配检测

```typescript
interface Match {
  tiles: Tile[];
  direction: 'horizontal' | 'vertical';
  length: number;
  startPos: GridPosition;
  endPos: GridPosition;
}

class MatchDetector {
  /**
   * 扫描整个棋盘，返回所有匹配
   * 时间复杂度: O(n²)，n=6，实际为常数时间
   */
  public findAllMatches(grid: Tile[][]): Match[] {
    const matches: Match[] = [];
    
    // 横向扫描
    for (let row = 0; row < GRID_SIZE; row++) {
      let count = 1;
      for (let col = 1; col <= GRID_SIZE; col++) {
        if (col < GRID_SIZE && this.isSameType(grid[row][col], grid[row][col-1])) {
          count++;
        } else {
          if (count >= 3) {
            matches.push(this.createMatch(row, col - count, row, col - 1, 'horizontal'));
          }
          count = 1;
        }
      }
    }
    
    // 纵向扫描（同理）
    for (let col = 0; col < GRID_SIZE; col++) {
      // ... 类似逻辑
    }
    
    return this.mergeOverlappingMatches(matches);
  }
  
  /**
   * 检测特定位置是否形成匹配（用于交换验证）
   */
  public checkPosition(grid: Tile[][], pos: GridPosition): Match[] {
    // 只检查该位置所在的行和列
    const rowMatches = this.scanLine(grid, pos.row, 'horizontal');
    const colMatches = this.scanLine(grid, pos.col, 'vertical');
    return [...rowMatches, ...colMatches];
  }
}
```

#### 2.1.2 重叠匹配合并

```typescript
private mergeOverlappingMatches(matches: Match[]): Match[] {
  // 使用并查集或简单遍历合并共享元素的匹配
  const merged: Match[] = [];
  const visited = new Set<string>();
  
  for (const match of matches) {
    const key = this.getMatchKey(match);
    if (visited.has(key)) continue;
    
    // 查找所有重叠的匹配
    const overlapping = matches.filter(m => 
      m.tiles.some(t => match.tiles.includes(t))
    );
    
    // 合并为一个大匹配（用于 T/L 型检测）
    const allTiles = new Set(overlapping.flatMap(m => m.tiles));
    merged.push({
      tiles: Array.from(allTiles),
      direction: match.direction,
      length: allTiles.size,
      // ... 其他属性
    });
    
    overlapping.forEach(m => visited.add(this.getMatchKey(m)));
  }
  
  return merged;
}
```

### 2.2 特殊元素检测算法

#### 2.2.1 模式定义

```typescript
enum SpecialPattern {
  LINE_4_HORIZONTAL,  // 4连横向
  LINE_4_VERTICAL,    // 4连纵向
  LINE_5,             // 5连直线
  T_SHAPE,            // T型（3横 + 3竖）
  L_SHAPE,            // L型（3横 + 3竖，角落）
}

interface PatternDetectionResult {
  pattern: SpecialPattern;
  centerTile: Tile;      // 特殊元素生成位置
  affectedTiles: Tile[]; // 参与形成该模式的所有元素
}
```

#### 2.2.2 T/L 型检测

```typescript
class PatternMatcher {
  /**
   * 检测 T/L 型模式
   * T型: 横向3连 + 纵向3连，交点在横向中间
   * L型: 横向3连 + 纵向3连，交点在端点
   */
  public detectTLShape(match: Match, grid: Tile[][]): PatternDetectionResult | null {
    // 获取匹配区域的边界
    const bounds = this.getMatchBounds(match);
    
    // 检查是否同时存在横向和纵向的3连
    const hasHorizontal = this.hasLineOfLength(grid, bounds, 'horizontal', 3);
    const hasVertical = this.hasLineOfLength(grid, bounds, 'vertical', 3);
    
    if (!hasHorizontal || !hasVertical) return null;
    
    // 找到交点
    const intersection = this.findIntersection(match, grid);
    
    // 判断是 T 型还是 L 型
    const pattern = this.classifyTLShape(match, intersection);
    
    return {
      pattern,
      centerTile: intersection,
      affectedTiles: match.tiles
    };
  }
  
  private classifyTLShape(match: Match, intersection: Tile): SpecialPattern {
    // 如果交点在匹配的端点，是 L 型
    // 如果交点在匹配的中间，是 T 型
    const isEndpoint = this.isEndpoint(match, intersection);
    return isEndpoint ? SpecialPattern.L_SHAPE : SpecialPattern.T_SHAPE;
  }
}
```

#### 2.2.3 特殊元素生成决策树

```
匹配长度 >= 5?
├── 是 → 生成彩虹球 (Rainbow Ball)
│         位置：中心点
└── 否 → 匹配长度 == 4?
          ├── 是 → 生成直线炸弹 (Line Bomb)
          │         方向：与匹配方向一致
          │         位置：交换点或最后移动的元素
          └── 否 → T/L 型?
                    ├── 是 → 生成范围炸弹 (Area Bomb)
                    │         位置：交点
                    └── 否 → 普通消除，无特殊元素
```

### 2.3 重力下落算法

```typescript
class GravityEngine {
  /**
   * 应用重力，返回下落动画数据
   */
  public applyGravity(grid: Tile[][]): GravityResult {
    const movements: TileMovement[] = [];
    const newTiles: Tile[] = [];
    
    for (let col = 0; col < GRID_SIZE; col++) {
      const column = this.extractColumn(grid, col);
      const emptyCount = column.filter(t => t === null).length;
      
      if (emptyCount === 0) continue;
      
      // 压缩非空元素
      const nonEmptyTiles = column.filter(t => t !== null);
      
      // 记录下落距离
      for (let i = 0; i < nonEmptyTiles.length; i++) {
        const newRow = GRID_SIZE - nonEmptyTiles.length + i;
        const oldRow = this.findOriginalRow(column, nonEmptyTiles[i]);
        const dropDistance = newRow - oldRow;
        
        if (dropDistance > 0) {
          movements.push({
            tile: nonEmptyTiles[i],
            from: { row: oldRow, col },
            to: { row: newRow, col },
            distance: dropDistance
          });
        }
      }
      
      // 在顶部生成新元素
      for (let i = 0; i < emptyCount; i++) {
        const newTile = this.createRandomTile(col, -emptyCount + i);
        newTiles.push(newTile);
        movements.push({
          tile: newTile,
          from: { row: -emptyCount + i, col },
          to: { row: i, col },
          distance: emptyCount - i,
          isNew: true
        });
      }
    }
    
    return { movements, newTiles };
  }
}

interface GravityResult {
  movements: TileMovement[];
  newTiles: Tile[];
}

interface TileMovement {
  tile: Tile;
  from: GridPosition;
  to: GridPosition;
  distance: number;
  isNew?: boolean;
}
```

### 2.4 死局检测算法

```typescript
class DeadlockDetector {
  /**
   * 检查是否存在可交换形成匹配的移动
   * 用于：开局生成棋盘、玩家无移动时重置
   * 时间复杂度: O(n² * 4) = O(n²)，n=6
   */
  public hasValidMoves(grid: Tile[][]): boolean {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // 检查四个方向的交换
        const directions = [
          { dr: 0, dc: 1 },  // 右
          { dr: 1, dc: 0 },  // 下
          { dr: 0, dc: -1 }, // 左
          { dr: -1, dc: 0 }  // 上
        ];
        
        for (const dir of directions) {
          const newRow = row + dir.dr;
          const newCol = col + dir.dc;
          
          if (this.isValidPosition(newRow, newCol)) {
            if (this.wouldCreateMatch(grid, row, col, newRow, newCol)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
  
  /**
   * 模拟交换，检查是否形成匹配
   */
  private wouldCreateMatch(
    grid: Tile[][],
    r1: number, c1: number,
    r2: number, c2: number
  ): boolean {
    // 克隆棋盘进行模拟
    const testGrid = this.cloneGrid(grid);
    
    // 执行交换
    [testGrid[r1][c1], testGrid[r2][c2]] = [testGrid[r2][c2], testGrid[r1][c1]];
    
    // 检查两个位置是否形成匹配
    const matches1 = this.checkPosition(testGrid, r1, c1);
    const matches2 = this.checkPosition(testGrid, r2, c2);
    
    return matches1.length > 0 || matches2.length > 0;
  }
}
```

---

## 3. 类设计

### 3.1 类图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           GameScene                                  │
│  - gridManager: GridManager                                          │
│  - stateMachine: GameStateMachine                                    │
│  - scoreManager: ScoreManager                                        │
│  - soundManager: SoundManager                                        │
│  - particlePool: ParticlePool                                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
┌──────────┴──────────┐  ┌──────────┴──────────┐  ┌──────────┴──────────┐
│    GridManager      │  │  GameStateMachine   │  │   ScoreManager      │
│  - grid: Tile[][]   │  │  - currentState     │  │  - currentScore     │
│  - obstacles        │  │  - transitions      │  │  - comboCount       │
│  + swap()           │  │  + transition()     │  │  + addScore()       │
│  + removeMatches()  │  │  + canTransition()  │  │  + resetCombo()     │
│  + applyGravity()   │  └─────────────────────┘  └─────────────────────┘
└─────────────────────┘
           │
     ┌─────┴─────┐
     │           │
┌────┴────┐ ┌────┴────┐
│  Tile   │ │ Obstacle│
│ - type  │ │ - hp    │
│ - special│ │ - type  │
│ - pos   │ │ - pos   │
└─────────┘ └─────────┘
```

### 3.2 核心类定义

#### 3.2.1 GridManager

```typescript
class GridManager extends Phaser.Events.EventEmitter {
  private grid: (Tile | null)[][];
  private obstacles: (Obstacle | null)[][];
  private matchDetector: MatchDetector;
  private gravityEngine: GravityEngine;
  private specialDetector: SpecialDetector;
  
  constructor(scene: Phaser.Scene, config: GridConfig) {
    super();
    this.initializeGrid();
  }
  
  /**
   * 尝试交换两个位置的元素
   * @returns 交换结果，包含是否成功、形成的匹配等
   */
  public trySwap(pos1: GridPosition, pos2: GridPosition): SwapResult;
  
  /**
   * 获取指定位置的元素
   */
  public getTile(pos: GridPosition): Tile | null;
  
  /**
   * 设置指定位置的元素
   */
  public setTile(pos: GridPosition, tile: Tile | null): void;
  
  /**
   * 移除匹配的元素
   * @returns 被移除的元素列表和生成的特殊元素
   */
  public removeMatches(matches: Match[]): RemovalResult;
  
  /**
   * 应用重力下落
   * @returns 下落动画数据
   */
  public applyGravity(): GravityResult;
  
  /**
   * 检查是否存在有效移动
   */
  public hasValidMoves(): boolean;
  
  /**
   * 打乱棋盘（死局时调用）
   */
  public shuffle(): void;
  
  /**
   * 获取所有特殊元素
   */
  public getSpecialTiles(): Tile[];
  
  /**
   * 激活特殊元素
   */
  public activateSpecial(tile: Tile, target?: GridPosition): EffectResult;
}

interface SwapResult {
  success: boolean;
  matches: Match[];
  specialCreations: SpecialCreation[];
  reason?: 'invalid_move' | 'no_match';
}

interface RemovalResult {
  removedTiles: Tile[];
  createdSpecials: SpecialCreation[];
  affectedObstacles: Obstacle[];
}
```

#### 3.2.2 Tile

```typescript
enum TileType {
  RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE
}

enum SpecialType {
  NONE,
  LINE_HORIZONTAL,  // 横向炸弹
  LINE_VERTICAL,    // 纵向炸弹
  AREA,             // 范围炸弹
  RAINBOW           // 彩虹球
}

interface GridPosition {
  row: number;
  col: number;
}

class Tile extends Phaser.GameObjects.Sprite {
  public readonly type: TileType;
  public special: SpecialType;
  public position: GridPosition;
  public isMoving: boolean = false;
  public isBeingRemoved: boolean = false;
  
  constructor(
    scene: Phaser.Scene,
    type: TileType,
    position: GridPosition,
    config: TileConfig
  ) {
    super(scene, 0, 0, config.textureKey);
    this.type = type;
    this.position = position;
    this.special = SpecialType.NONE;
  }
  
  /**
   * 转换为特殊元素
   */
  public promoteToSpecial(type: SpecialType): void;
  
  /**
   * 获取该元素激活时的效果范围
   */
  public getEffectRange(): GridPosition[];
  
  /**
   * 播放选中动画
   */
  public playSelectAnimation(): void;
  
  /**
   * 播放消除动画
   */
  public playRemoveAnimation(): Promise<void>;
  
  /**
   * 移动到新位置
   */
  public moveTo(position: GridPosition, duration: number): Promise<void>;
}
```

#### 3.2.3 GameStateMachine

```typescript
enum GameState {
  IDLE,           // 等待玩家输入
  SELECTING,      // 已选中一个元素
  SWAPPING,       // 交换动画中
  MATCHING,       // 匹配检测和处理
  GRAVITY,        // 重力下落
  CASCADE,        // 连锁反应检测
  GAME_OVER,      // 游戏结束（胜利/失败）
  PAUSED          // 暂停
}

class GameStateMachine extends Phaser.Events.EventEmitter {
  private currentState: GameState = GameState.IDLE;
  private previousState: GameState | null = null;
  
  // 状态转换规则
  private readonly transitions: Map<GameState, GameState[]> = new Map([
    [GameState.IDLE, [GameState.SELECTING, GameState.PAUSED]],
    [GameState.SELECTING, [GameState.IDLE, GameState.SWAPPING, GameState.PAUSED]],
    [GameState.SWAPPING, [GameState.MATCHING, GameState.IDLE]],
    [GameState.MATCHING, [GameState.GRAVITY, GameState.IDLE, GameState.GAME_OVER]],
    [GameState.GRAVITY, [GameState.CASCADE, GameState.IDLE]],
    [GameState.CASCADE, [GameState.MATCHING, GameState.IDLE]],
    [GameState.PAUSED, [GameState.IDLE]]
  ]);
  
  /**
   * 尝试状态转换
   */
  public transition(to: GameState): boolean {
    if (!this.canTransition(to)) {
      console.warn(`Invalid state transition: ${this.currentState} -> ${to}`);
      return false;
    }
    
    this.previousState = this.currentState;
    this.currentState = to;
    this.emit('stateChange', to, this.previousState);
    return true;
  }
  
  /**
   * 检查是否可以转换到指定状态
   */
  public canTransition(to: GameState): boolean {
    const allowed = this.transitions.get(this.currentState);
    return allowed?.includes(to) ?? false;
  }
  
  /**
   * 获取当前状态
   */
  public getState(): GameState {
    return this.currentState;
  }
  
  /**
   * 返回上一状态
   */
  public revert(): void {
    if (this.previousState !== null) {
      this.currentState = this.previousState;
      this.previousState = null;
    }
  }
}
```

#### 3.2.4 ScoreManager

```typescript
class ScoreManager extends Phaser.Events.EventEmitter {
  private currentScore: number = 0;
  private targetScore: number = 0;
  private comboCount: number = 0;
  private movesRemaining: number = 0;
  
  // 分数配置
  private readonly BASE_SCORES: Record<number, number> = {
    3: 30,   // 3连
    4: 40,   // 4连
    5: 50,   // 5连
    6: 60    // 6连（理论上可能）
  };
  
  private readonly SPECIAL_BONUS: Record<SpecialType, number> = {
    [SpecialType.NONE]: 1,
    [SpecialType.LINE_HORIZONTAL]: 2,
    [SpecialType.LINE_VERTICAL]: 2,
    [SpecialType.AREA]: 3,
    [SpecialType.RAINBOW]: 5
  };
  
  /**
   * 计算消除分数
   */
  public calculateScore(
    matchLength: number,
    specialType: SpecialType,
    isCascade: boolean
  ): number {
    let score = this.BASE_SCORES[matchLength] || 30;
    score *= this.SPECIAL_BONUS[specialType];
    
    // 连锁加成
    if (isCascade) {
      score *= (1 + this.comboCount * 0.5);
    }
    
    return Math.floor(score);
  }
  
  /**
   * 添加分数
   */
  public addScore(points: number): void {
    this.currentScore += points;
    this.emit('scoreChange', this.currentScore);
  }
  
  /**
   * 增加连击计数
   */
  public incrementCombo(): void {
    this.comboCount++;
    this.emit('comboChange', this.comboCount);
  }
  
  /**
   * 重置连击
   */
  public resetCombo(): void {
    this.comboCount = 0;
    this.emit('comboChange', 0);
  }
  
  /**
   * 减少步数
   */
  public useMove(): void {
    this.movesRemaining--;
    this.emit('moveChange', this.movesRemaining);
  }
  
  /**
   * 检查是否达到目标
   */
  public isTargetReached(): boolean {
    return this.currentScore >= this.targetScore;
  }
  
  /**
   * 检查是否还有步数
   */
  public hasMovesLeft(): boolean {
    return this.movesRemaining > 0;
  }
  
  /**
   * 获取星级评定
   */
  public getStars(): number {
    const ratio = this.currentScore / this.targetScore;
    if (ratio >= 2.0) return 3;
    if (ratio >= 1.5) return 2;
    if (ratio >= 1.0) return 1;
    return 0;
  }
}
```

---

## 4. 状态机详细设计

### 4.1 游戏主状态机

```
                    ┌─────────┐
         ┌─────────│  PAUSED │─────────┐
         │         └─────────┘         │
         │              ↑              │
         │              │              │
    ┌────▼────┐    ┌────┴────┐   ┌─────▼─────┐
    │  IDLE   │◄───│SELECTING│   │  GAME_OVER│
    └────┬────┘    └────┬────┘   └───────────┘
         │              │
         │         ┌────▼────┐
         └────────►│SWAPPING │
                   └────┬────┘
                        │
                   ┌────▼────┐
                   │MATCHING │◄──────────┐
                   └────┬────┘           │
                        │                │
                   ┌────▼────┐      ┌────┴────┐
                   │ GRAVITY │─────►│CASCADE  │
                   └─────────┘      └─────────┘
```

### 4.2 状态转换时序

```
玩家点击元素A
    │
    ▼
[IDLE] ──select──► [SELECTING]
    │
玩家点击相邻元素B
    │
    ▼
[SELECTING] ──swap──► [SWAPPING]
    │
交换动画完成
    │
    ▼
[SWAPPING] ──check_match──► [MATCHING]
    │
有匹配?
    ├── 是 ──► 消除动画 ──► [GRAVITY]
    │                       │
    │                       ▼
    │                   下落动画
    │                       │
    │                       ▼
    │                   [CASCADE]
    │                       │
    │                   新匹配?
    │                       ├── 是 ──► [MATCHING] (循环)
    │                       └── 否 ──► [IDLE]
    │
    └── 否 ──► 交换回退 ──► [IDLE]
```

### 4.3 状态事件

| 状态 | 进入事件 | 退出事件 | 允许操作 |
|-----|---------|---------|---------|
| IDLE | 重置选中 | - | 点击元素 |
| SELECTING | 高亮元素 | 取消高亮 | 点击相邻元素、点击空白处取消 |
| SWAPPING | 播放交换动画 | - | 无（阻塞） |
| MATCHING | 检测匹配、计算分数 | - | 无（阻塞） |
| GRAVITY | 计算下落、生成新元素 | - | 无（阻塞） |
| CASCADE | 检测新匹配 | 重置连击 | 无（阻塞） |
| GAME_OVER | 显示结算 | - | 点击重试/下一关 |
| PAUSED | 显示暂停菜单 | 隐藏菜单 | 继续/重试/退出 |

---

## 5. 资源管线

### 5.1 图片资源规格

| 资源类型 | 格式 | 尺寸 | 备注 |
|---------|------|------|------|
| 基础元素 | PNG/WebP | 128×128 | 6种颜色，带边框 |
| 特殊元素 | PNG/WebP | 128×128 | 条纹、爆炸、彩虹效果 |
| 障碍物 | PNG/WebP | 128×128 | 冰块、果冻 |
| 粒子纹理 | PNG | 32×32 | 圆形、星形 |
| UI按钮 | PNG/WebP | 可变 | 主菜单、暂停、重试 |
| 背景 | PNG/JPG | 1080×1920 | 竖屏适配 |

### 5.2 图集（Atlas）策略

使用 Texture Packer 或 Phaser 内置打包：

```
atlas/
├── tiles.json      # 元素图集
├── tiles.png
├── ui.json         # UI图集
├── ui.png
└── particles.json  # 粒子图集
    particles.png
```

### 5.3 粒子效果设计

| 效果 | 配置参数 |
|-----|---------|
| 基础消除 | 10-15个粒子，向外扩散，0.5s生命周期 |
| 特殊元素生成 | 20-30个粒子，旋转上升，金色/彩虹色 |
| 炸弹爆炸 | 40-50个粒子，冲击波效果，烟雾残留 |
| 彩虹球激活 | 全屏粒子雨，彩虹渐变颜色 |
| 连击提示 | 文字+粒子上升，随连击数增加粒子数 |

---

## 6. 音频系统

### 6.1 技术选型

**选择：原生 Web Audio API**
- 无需外部依赖
- 完全可控的音频合成
- 文件体积小（无音频资源文件）

### 6.2 合成器实现

```typescript
class WebAudioSynthesizer {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.masterGain.gain.value = 0.7;
  }
  
  /**
   * 播放选择音效
   * 正弦波，短促高频
   */
  public playSelect(): void {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }
  
  /**
   * 播放交换音效
   * 频率滑动效果
   */
  public playSwap(): void {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }
  
  /**
   * 播放消除音效
   * 随连击数变调
   */
  public playClear(combo: number): void {
    const baseFreq = 600;
    const freq = baseFreq + combo * 100;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }
}

---

## 7. 性能优化

### 7.1 对象池设计

```typescript
class TilePool {
  private pool: Tile[] = [];
  private active: Set<Tile> = new Set();
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene, initialSize: number = 50) {
    this.scene = scene;
    this.prePopulate(initialSize);
  }
  
  private prePopulate(count: number): void {
    for (let i = 0; i < count; i++) {
      const tile = new Tile(this.scene, TileType.RED, { row: -1, col: -1 }, {});
      tile.setActive(false);
      tile.setVisible(false);
      this.pool.push(tile);
    }
  }
  
  public acquire(type: TileType, position: GridPosition): Tile {
    let tile = this.pool.find(t => !t.active);
    
    if (!tile) {
      tile = new Tile(this.scene, type, position, {});
    } else {
      tile.setType(type);
      tile.setPosition(position);
      tile.setSpecial(SpecialType.NONE);
    }
    
    tile.setActive(true);
    tile.setVisible(true);
    this.active.add(tile);
    
    return tile;
  }
  
  public release(tile: Tile): void {
    tile.setActive(false);
    tile.setVisible(false);
    this.active.delete(tile);
  }
}
```

### 7.2 内存管理

| 策略 | 实现方式 |
|-----|---------|
| 纹理压缩 | 使用 WebP 格式，减少 30-50% 体积 |
| 图集合并 | 减少 draw call，提升渲染性能 |
| 对象池 | Tile、Particle 对象复用 |
| 场景切换清理 | 离开 GameScene 时释放非必要资源 |

---

## 8. 测试策略

### 8.1 单元测试

```typescript
describe("MatchDetector", () => {
  test("should detect horizontal match of 3", () => {
    // 测试代码
  });
});
```

### 8.2 集成测试场景

- 基础消除流程
- 连锁反应
- 特殊元素生成与激活
- 死局处理
- 关卡完成/失败

---

## 9. 风险与应对

| 风险 | 影响 | 应对措施 |
|-----|------|---------|
| 移动端性能不足 | 高 | 对象池、纹理压缩、减少粒子数 |
| 音频上下文限制 | 中 | 用户交互后初始化，页面隐藏时暂停 |
| 复杂匹配检测Bug | 高 | 完整单元测试覆盖 |
| 动画卡顿 | 中 | 使用 requestAnimationFrame，避免阻塞 |

---

**文档结束**

