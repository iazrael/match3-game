import {
  Tile,
  GravityResult,
  TileMovement,
  GRID_SIZE,
  TileType,
  SpecialType,
} from '../types';

/**
 * 重力引擎 - 负责处理元素下落和新元素生成
 */
export class GravityEngine {
  private tileTypeCounter = 0;

  /**
   * 应用重力，返回下落动画数据
   */
  public applyGravity(grid: (Tile | null)[][]): GravityResult {
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
        const tile = nonEmptyTiles[i]!;
        const oldRow = this.findOriginalRow(column, tile);
        const newRow = GRID_SIZE - nonEmptyTiles.length + i;
        const dropDistance = newRow - oldRow;

        if (dropDistance > 0) {
          movements.push({
            tile,
            from: { row: oldRow, col },
            to: { row: newRow, col },
            distance: dropDistance,
          });

          // 更新 tile 的位置
          tile.position = { row: newRow, col };
        }
      }

      // 在顶部生成新元素
      for (let i = 0; i < emptyCount; i++) {
        const startRow = -emptyCount + i;
        const endRow = i;
        const newTile: Tile = {
          type: this.getNextTileType(),
          special: SpecialType.NONE,
          position: { row: endRow, col },
        };

        newTiles.push(newTile);
        movements.push({
          tile: newTile,
          from: { row: startRow, col },
          to: { row: endRow, col },
          distance: emptyCount - i,
          isNew: true,
        });

        // 更新网格
        grid[endRow]![col] = newTile;
      }

      // 更新现有元素在网格中的位置
      for (let i = 0; i < nonEmptyTiles.length; i++) {
        const tile = nonEmptyTiles[i]!;
        const newRow = GRID_SIZE - nonEmptyTiles.length + i;
        grid[newRow]![col] = tile;
      }
    }

    return { movements, newTiles };
  }

  /**
   * 提取指定列
   */
  public extractColumn(grid: (Tile | null)[][], colIndex: number): (Tile | null)[] {
    const column: (Tile | null)[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const tile = grid[row]![colIndex];
      column.push(tile === undefined ? null : tile);
    }
    return column;
  }

  /**
   * 查找元素在列中的原始行号
   */
  private findOriginalRow(column: (Tile | null)[], tile: Tile): number {
    for (let row = 0; row < column.length; row++) {
      if (column[row] === tile) {
        return row;
      }
    }
    return -1;
  }

  /**
   * 获取下一个元素类型（用于生成新元素）
   */
  private getNextTileType(): TileType {
    const type = this.tileTypeCounter % 6;
    this.tileTypeCounter++;
    return type as TileType;
  }

  /**
   * 重置类型计数器（用于测试）
   */
  public resetTypeCounter(): void {
    this.tileTypeCounter = 0;
  }
}
