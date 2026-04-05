import {
  Tile,
  Match,
  GridPosition,
  SpecialPattern,
  PatternDetectionResult,
  GRID_SIZE,
} from '../types';

/**
 * 匹配检测器 - 负责检测棋盘上的三连及以上匹配
 */
export class MatchDetector {
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
        const currentTile = col < GRID_SIZE ? grid[row][col] : null;
        const prevTile = grid[row][col - 1];

        if (currentTile && prevTile && this.isSameType(currentTile, prevTile)) {
          count++;
        } else {
          if (count >= 3) {
            const matchTiles: Tile[] = [];
            for (let i = col - count; i < col; i++) {
              matchTiles.push(grid[row][i]);
            }
            matches.push({
              tiles: matchTiles,
              direction: 'horizontal',
              length: count,
              startPos: { row, col: col - count },
              endPos: { row, col: col - 1 },
            });
          }
          count = 1;
        }
      }
    }

    // 纵向扫描
    for (let col = 0; col < GRID_SIZE; col++) {
      let count = 1;
      for (let row = 1; row <= GRID_SIZE; row++) {
        const currentTile = row < GRID_SIZE ? grid[row][col] : null;
        const prevTile = grid[row - 1][col];

        if (currentTile && prevTile && this.isSameType(currentTile, prevTile)) {
          count++;
        } else {
          if (count >= 3) {
            const matchTiles: Tile[] = [];
            for (let i = row - count; i < row; i++) {
              matchTiles.push(grid[i][col]);
            }
            matches.push({
              tiles: matchTiles,
              direction: 'vertical',
              length: count,
              startPos: { row: row - count, col },
              endPos: { row: row - 1, col },
            });
          }
          count = 1;
        }
      }
    }

    return matches;
  }

  /**
   * 检测特定位置是否形成匹配（用于交换验证）
   */
  public checkPosition(grid: Tile[][], pos: GridPosition): Match[] {
    const matches: Match[] = [];

    // 检查该位置所在的行
    const rowMatches = this.scanLine(grid, pos.row, 'horizontal');
    // 检查该位置所在的列
    const colMatches = this.scanLine(grid, pos.col, 'vertical');

    // 只返回包含指定位置的匹配
    for (const match of rowMatches) {
      if (match.tiles.some(t => t.position.row === pos.row && t.position.col === pos.col)) {
        matches.push(match);
      }
    }
    for (const match of colMatches) {
      if (match.tiles.some(t => t.position.row === pos.row && t.position.col === pos.col)) {
        matches.push(match);
      }
    }

    return matches;
  }

  /**
   * 检测特殊模式（4连、5连、T型、L型）
   */
  public detectSpecialPattern(matches: Match[], grid: Tile[][]): PatternDetectionResult | null {
    // 先检查是否有5连
    const match5 = matches.find(m => m.length >= 5);
    if (match5) {
      return {
        pattern: SpecialPattern.LINE_5,
        centerTile: this.getCenterPosition(match5),
        affectedTiles: match5.tiles.map(t => t.position),
      };
    }

    // 检查4连
    const match4 = matches.find(m => m.length === 4);
    if (match4) {
      const pattern = match4.direction === 'horizontal'
        ? SpecialPattern.LINE_4_HORIZONTAL
        : SpecialPattern.LINE_4_VERTICAL;
      return {
        pattern,
        centerTile: this.getCenterPosition(match4),
        affectedTiles: match4.tiles.map(t => t.position),
      };
    }

    // 检查 T/L 型（需要同时有横向和纵向的3连）
    const horizontal3 = matches.filter(m => m.direction === 'horizontal' && m.length === 3);
    const vertical3 = matches.filter(m => m.direction === 'vertical' && m.length === 3);

    if (horizontal3.length > 0 && vertical3.length > 0) {
      // 检查是否有交叉
      for (const hMatch of horizontal3) {
        for (const vMatch of vertical3) {
          const intersection = this.findIntersection(hMatch, vMatch);
          if (intersection) {
            // 判断是 T 型还是 L 型
            const isLShape = this.isEndpoint(hMatch, intersection) || this.isEndpoint(vMatch, intersection);
            const pattern = isLShape ? SpecialPattern.L_SHAPE : SpecialPattern.T_SHAPE;

            const allTiles = new Set([...hMatch.tiles, ...vMatch.tiles]);
            return {
              pattern,
              centerTile: intersection,
              affectedTiles: Array.from(allTiles).map(t => t.position),
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * 判断两个元素是否类型相同
   */
  private isSameType(tile1: Tile, tile2: Tile): boolean {
    return tile1.type === tile2.type;
  }

  /**
   * 扫描一行或一列查找匹配
   */
  private scanLine(grid: Tile[][], index: number, direction: 'horizontal' | 'vertical'): Match[] {
    const matches: Match[] = [];

    if (direction === 'horizontal') {
      let count = 1;
      for (let col = 1; col <= GRID_SIZE; col++) {
        const currentTile = col < GRID_SIZE ? grid[index][col] : null;
        const prevTile = grid[index][col - 1];

        if (currentTile && prevTile && this.isSameType(currentTile, prevTile)) {
          count++;
        } else {
          if (count >= 3) {
            const matchTiles: Tile[] = [];
            for (let i = col - count; i < col; i++) {
              matchTiles.push(grid[index][i]);
            }
            matches.push({
              tiles: matchTiles,
              direction: 'horizontal',
              length: count,
              startPos: { row: index, col: col - count },
              endPos: { row: index, col: col - 1 },
            });
          }
          count = 1;
        }
      }
    } else {
      let count = 1;
      for (let row = 1; row <= GRID_SIZE; row++) {
        const currentTile = row < GRID_SIZE ? grid[row][index] : null;
        const prevTile = grid[row - 1][index];

        if (currentTile && prevTile && this.isSameType(currentTile, prevTile)) {
          count++;
        } else {
          if (count >= 3) {
            const matchTiles: Tile[] = [];
            for (let i = row - count; i < row; i++) {
              matchTiles.push(grid[i][index]);
            }
            matches.push({
              tiles: matchTiles,
              direction: 'vertical',
              length: count,
              startPos: { row: row - count, col: index },
              endPos: { row: row - 1, col: index },
            });
          }
          count = 1;
        }
      }
    }

    return matches;
  }

  /**
   * 获取匹配的中心位置
   */
  private getCenterPosition(match: Match): GridPosition {
    const { startPos, endPos, direction, length } = match;
    if (direction === 'horizontal') {
      return { row: startPos.row, col: startPos.col + Math.floor(length / 2) };
    } else {
      return { row: startPos.row + Math.floor(length / 2), col: startPos.col };
    }
  }

  /**
   * 查找两个匹配的交叉点
   */
  private findIntersection(match1: Match, match2: Match): GridPosition | null {
    for (const tile1 of match1.tiles) {
      for (const tile2 of match2.tiles) {
        if (tile1.position.row === tile2.position.row && tile1.position.col === tile2.position.col) {
          return tile1.position;
        }
      }
    }
    return null;
  }

  /**
   * 判断位置是否是匹配的端点
   */
  private isEndpoint(match: Match, pos: GridPosition): boolean {
    return (
      (match.startPos.row === pos.row && match.startPos.col === pos.col) ||
      (match.endPos.row === pos.row && match.endPos.col === pos.col)
    );
  }
}
