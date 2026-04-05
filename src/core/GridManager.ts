import {
  Tile,
  GridPosition,
  Match,
  SwapResult,
  SpecialCreation,
  SpecialPattern,
  SpecialType,
  GRID_SIZE,
  TileType,
} from '../types';
import { MatchDetector } from './MatchDetector';
import { GameEventEmitter } from './GameEventEmitter';

/**
 * 棋盘管理器 - 负责棋盘状态管理和基本操作
 */
export class GridManager extends GameEventEmitter {
  private grid: (Tile | null)[][];
  private matchDetector: MatchDetector;

  constructor(initialGrid?: (Tile | null)[][]) {
    super();

    if (initialGrid) {
      this.grid = initialGrid.map(row => [...row]);
    } else {
      this.grid = this.createEmptyGrid();
    }

    this.matchDetector = new MatchDetector();
  }

  /**
   * 创建空网格
   */
  private createEmptyGrid(): (Tile | null)[][] {
    return Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => null)
    );
  }

  /**
   * 获取当前网格
   */
  public getGrid(): (Tile | null)[][] {
    return this.grid;
  }

  /**
   * 设置网格状态
   */
  public setGrid(grid: (Tile | null)[][]): void {
    this.grid = grid.map(row => [...row]);
    this.emit('grid-changed', this.grid);
  }

  /**
   * 获取指定位置的元素
   */
  public getTile(pos: GridPosition): Tile | null {
    if (!this.isValidPosition(pos)) {
      return null;
    }
    const tile = this.grid[pos.row]![pos.col];
    return tile === undefined ? null : tile;
  }

  /**
   * 设置指定位置的元素
   */
  public setTile(pos: GridPosition, tile: Tile | null): void {
    if (this.isValidPosition(pos)) {
      this.grid[pos.row]![pos.col] = tile;
      if (tile) {
        tile.position = pos;
      }
    }
  }

  /**
   * 检查位置是否有效
   */
  public isValidPosition(pos: GridPosition): boolean {
    return pos.row >= 0 && pos.row < GRID_SIZE && pos.col >= 0 && pos.col < GRID_SIZE;
  }

  /**
   * 检查两个位置是否相邻
   */
  public isAdjacent(pos1: GridPosition, pos2: GridPosition): boolean {
    const rowDiff = Math.abs(pos1.row - pos2.row);
    const colDiff = Math.abs(pos1.col - pos2.col);

    return (
      this.isValidPosition(pos1) &&
      this.isValidPosition(pos2) &&
      ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1))
    );
  }

  /**
   * 尝试交换两个位置的元素
   */
  public trySwap(pos1: GridPosition, pos2: GridPosition): SwapResult {
    // 检查位置是否有效
    if (!this.isValidPosition(pos1) || !this.isValidPosition(pos2)) {
      return { success: false, matches: [], specialCreations: [], reason: 'invalid_move' };
    }

    // 检查是否相邻
    if (!this.isAdjacent(pos1, pos2)) {
      return { success: false, matches: [], specialCreations: [], reason: 'invalid_move' };
    }

    const tile1 = this.getTile(pos1);
    const tile2 = this.getTile(pos2);

    // 检查位置是否都有元素
    if (!tile1 || !tile2) {
      return { success: false, matches: [], specialCreations: [], reason: 'invalid_move' };
    }

    // 执行交换
    this.setTile(pos1, tile2);
    this.setTile(pos2, tile1);

    // 检查是否形成匹配
    const matches1 = this.matchDetector.checkPosition(this.grid as Tile[][], pos1);
    const matches2 = this.matchDetector.checkPosition(this.grid as Tile[][], pos2);
    const allMatches = [...matches1, ...matches2];

    // 去重匹配（可能同一个匹配被两个位置都检测到）
    const uniqueMatches = this.deduplicateMatches(allMatches);

    if (uniqueMatches.length === 0) {
      // 没有匹配，还原交换
      this.setTile(pos1, tile1);
      this.setTile(pos2, tile2);
      return { success: false, matches: [], specialCreations: [], reason: 'no_match' };
    }

    // 检测特殊模式
    const specialCreations: SpecialCreation[] = [];
    const specialPattern = this.matchDetector.detectSpecialPattern(uniqueMatches, this.grid as Tile[][]);

    if (specialPattern) {
      const specialType = this.getSpecialTypeFromPattern(specialPattern.pattern);
      specialCreations.push({
        position: specialPattern.centerTile,
        pattern: specialPattern.pattern,
        type: specialType,
      });
    }

    return {
      success: true,
      matches: uniqueMatches,
      specialCreations,
    };
  }

  /**
   * 去重匹配
   */
  private deduplicateMatches(matches: Match[]): Match[] {
    const seen = new Set<string>();
    const result: Match[] = [];

    for (const match of matches) {
      const key = `${match.direction}-${match.startPos.row}-${match.startPos.col}-${match.endPos.row}-${match.endPos.col}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(match);
      }
    }

    return result;
  }

  /**
   * 从特殊模式获取特殊元素类型
   */
  private getSpecialTypeFromPattern(pattern: SpecialPattern): SpecialType {
    switch (pattern) {
      case SpecialPattern.LINE_4_HORIZONTAL:
      case SpecialPattern.LINE_4_VERTICAL:
        return SpecialType.LINE_HORIZONTAL;
      case SpecialPattern.LINE_5:
        return SpecialType.RAINBOW;
      case SpecialPattern.T_SHAPE:
      case SpecialPattern.L_SHAPE:
        return SpecialType.AREA;
      default:
        return SpecialType.NONE;
    }
  }

  /**
   * 移除匹配的元素
   */
  public removeMatches(matches: Match[]): void {
    const toRemove = new Set<string>();

    for (const match of matches) {
      for (const tile of match.tiles) {
        const key = `${tile.position.row}-${tile.position.col}`;
        toRemove.add(key);
      }
    }

    for (const key of toRemove) {
      const parts = key.split('-').map(Number);
      const row = parts[0]!;
      const col = parts[1]!;
      this.setTile({ row, col }, null);
    }

    this.emit('matches-removed', matches, toRemove.size);
  }

  /**
   * 检查是否有有效移动
   */
  public hasValidMoves(): boolean {
    // 遍历所有可能的交换
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // 尝试向右交换
        if (col < GRID_SIZE - 1) {
          const result = this.trySwap({ row, col }, { row, col: col + 1 });
          if (result.success) {
            return true;
          }
        }

        // 尝试向下交换
        if (row < GRID_SIZE - 1) {
          const result = this.trySwap({ row, col }, { row: row + 1, col });
          if (result.success) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 打乱棋盘直到有有效移动
   */
  public shuffle(): void {
    const maxAttempts = 100;
    let attempts = 0;

    do {
      this.shuffleGrid();
      attempts++;
    } while (!this.hasValidMoves() && attempts < maxAttempts);

    this.emit('shuffled', this.grid);
  }

  /**
   * 内部打乱方法
   */
  private shuffleGrid(): void {
    // 收集所有元素
    const tiles: Tile[] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const tile = this.grid[row]![col];
        if (tile) {
          tiles.push(tile);
        }
      }
    }

    // Fisher-Yates 洗牌算法
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i]!, tiles[j]!] = [tiles[j]!, tiles[i]!];
    }

    // 重新放置
    let index = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (index < tiles.length) {
          const tile = tiles[index]!;
          tile.position = { row, col };
          this.grid[row]![col] = tile;
          index++;
        }
      }
    }
  }

  /**
   * 用随机元素填充空位
   */
  public fillEmptyWithRandom(): void {
    const filledPositions: GridPosition[] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.grid[row]![col] === null) {
          const tile: Tile = {
            type: Math.floor(Math.random() * 6) as TileType,
            special: SpecialType.NONE,
            position: { row, col },
          };
          this.grid[row]![col] = tile;
          filledPositions.push({ row, col });
        }
      }
    }

    this.emit('filled', filledPositions);
  }

  /**
   * 创建匹配（用于测试）
   */
  public createMatchPattern(startRow: number, startCol: number, length: number, type: TileType): void {
    for (let i = 0; i < length; i++) {
      if (startCol + i < GRID_SIZE) {
        this.grid[startRow]![startCol + i] = {
          type,
          special: SpecialType.NONE,
          position: { row: startRow, col: startCol + i },
        };
      }
    }
  }
}
