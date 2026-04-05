import { describe, it, expect } from 'vitest';
import { GravityEngine } from '../GravityEngine';
import { Tile, TileType, GRID_SIZE, SpecialType } from '../../types';

describe('GravityEngine', () => {
  const createTestGrid = (layout: (TileType | null)[][]): (Tile | null)[][] => {
    const grid: (Tile | null)[][] = [];
    for (let row = 0; row < layout.length; row++) {
      grid[row] = [];
      for (let col = 0; col < layout[row]!.length; col++) {
        const type = layout[row]![col];
        if (type !== null) {
          grid[row]![col] = { type: type as TileType, special: SpecialType.NONE, position: { row, col } };
        } else {
          grid[row]![col] = null;
        }
      }
    }
    return grid;
  };

  describe('applyGravity', () => {
    it('should handle empty grid', () => {
      const grid: (Tile | null)[][] = Array(GRID_SIZE).fill(null).map(() =>
        Array(GRID_SIZE).fill(null)
      );

      const engine = new GravityEngine();
      const result = engine.applyGravity(grid);

      expect(result.movements).toHaveLength(GRID_SIZE * GRID_SIZE);
      expect(result.newTiles).toHaveLength(GRID_SIZE * GRID_SIZE);
    });

    it('should not move tiles when grid is full', () => {
      const grid = createTestGrid([
        [0, 1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const engine = new GravityEngine();
      const result = engine.applyGravity(grid);

      // 棋盘已满，不应该有任何移动
      expect(result.movements).toHaveLength(0);
      expect(result.newTiles).toHaveLength(0);
    });

    it('should drop tiles down when there are empty spaces', () => {
      const grid: (Tile | null)[][] = [];
      for (let i = 0; i < GRID_SIZE; i++) {
        grid[i] = [null, null, null, null, null, null];
      }
      grid[0]![0] = { type: 0, special: SpecialType.NONE, position: { row: 0, col: 0 } };
      grid[1]![0] = { type: 2, special: SpecialType.NONE, position: { row: 1, col: 0 } };

      const engine = new GravityEngine();
      const result = engine.applyGravity(grid);

      // 现有元素应该下落
      expect(result.movements.length).toBeGreaterThan(0);

      // 列中有2个元素，应该落到 row 4 和 5
      const col0Moves = result.movements.filter(m => m.to.col === 0 && !m.isNew);
      expect(col0Moves).toHaveLength(2);
      expect(col0Moves[0]?.to.row).toBe(4);
      expect(col0Moves[1]?.to.row).toBe(5);
    });

    it('should generate new tiles at the top', () => {
      const grid: (Tile | null)[][] = [
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
      ];

      const engine = new GravityEngine();
      const result = engine.applyGravity(grid);

      expect(result.newTiles).toHaveLength(GRID_SIZE * GRID_SIZE);
    });

    it('should correctly calculate drop distance', () => {
      const grid: (Tile | null)[][] = [];
      for (let i = 0; i < GRID_SIZE; i++) {
        grid[i] = [null, null, null, null, null, null];
      }
      grid[0]![0] = { type: 0, special: SpecialType.NONE, position: { row: 0, col: 0 } };
      grid[2]![0] = { type: 1, special: SpecialType.NONE, position: { row: 2, col: 0 } };

      const engine = new GravityEngine();
      const result = engine.applyGravity(grid);

      // 列中有2个元素，row 0 应该下落 3 格到 row 4，row 2 应该下落 1 格到 row 5
      const col0Moves = result.movements.filter(m => m.to.col === 0 && !m.isNew);
      expect(col0Moves).toHaveLength(2);

      const firstTileMove = col0Moves.find(m => m.from.row === 0);
      expect(firstTileMove?.distance).toBe(4);
      expect(firstTileMove?.to.row).toBe(4);

      const secondTileMove = col0Moves.find(m => m.from.row === 2);
      expect(secondTileMove?.distance).toBe(3);
      expect(secondTileMove?.to.row).toBe(5);
    });

    it('should handle multiple columns independently', () => {
      const grid: (Tile | null)[][] = [];
      for (let i = 0; i < GRID_SIZE; i++) {
        grid[i] = [null, null, null, null, null, null];
      }
      grid[0]![0] = { type: 0, special: SpecialType.NONE, position: { row: 0, col: 0 } };
      grid[0]![1] = { type: 1, special: SpecialType.NONE, position: { row: 0, col: 1 } };
      grid[0]![2] = { type: 2, special: SpecialType.NONE, position: { row: 0, col: 2 } };

      const engine = new GravityEngine();
      const result = engine.applyGravity(grid);

      // 应该有3个现有元素下落
      const existingMoves = result.movements.filter(m => !m.isNew);
      expect(existingMoves).toHaveLength(3);

      // 每列底部应该有一个元素
      const col0Tile = existingMoves.find(m => m.to.col === 0);
      const col1Tile = existingMoves.find(m => m.to.col === 1);
      const col2Tile = existingMoves.find(m => m.to.col === 2);

      expect(col0Tile?.to.row).toBe(5);
      expect(col1Tile?.to.row).toBe(5);
      expect(col2Tile?.to.row).toBe(5);
    });

    it('should fill gaps between tiles', () => {
      const grid: (Tile | null)[][] = [];
      for (let i = 0; i < GRID_SIZE; i++) {
        grid[i] = [null, null, null, null, null, null];
      }
      grid[0]![0] = { type: 0, special: SpecialType.NONE, position: { row: 0, col: 0 } };
      grid[2]![0] = { type: 1, special: SpecialType.NONE, position: { row: 2, col: 0 } };
      grid[5]![0] = { type: 2, special: SpecialType.NONE, position: { row: 5, col: 0 } };

      const engine = new GravityEngine();
      const result = engine.applyGravity(grid);

      // 列中有3个元素，row 5 已经在底部不需要移动
      const col0Moves = result.movements.filter(m => m.to.col === 0 && !m.isNew);
      expect(col0Moves).toHaveLength(2);

      // 检查位置：row 0 -> row 3, row 2 -> row 4, row 5 -> row 5 (不动，不在movements里)
      const movesByFromRow = new Map(col0Moves.map(m => [m.from.row, m.to.row]));
      expect(movesByFromRow.get(0)).toBe(3);
      expect(movesByFromRow.get(2)).toBe(4);
    });
  });

  describe('extractColumn', () => {
    it('should extract a single column from grid', () => {
      const grid = createTestGrid([
        [0, 1, 2, 3, 4, 5],
        [1, 2, 3, 4, 5, 0],
        [2, 3, 4, 5, 0, 1],
        [3, 4, 5, 0, 1, 2],
        [4, 5, 0, 1, 2, 3],
        [5, 0, 1, 2, 3, 4],
      ]);

      const engine = new GravityEngine();
      const column = engine.extractColumn(grid, 0);

      expect(column).toHaveLength(6);
      expect(column[0]?.type).toBe(0);
      expect(column[1]?.type).toBe(1);
      expect(column[2]?.type).toBe(2);
      expect(column[3]?.type).toBe(3);
      expect(column[4]?.type).toBe(4);
      expect(column[5]?.type).toBe(5);
    });
  });
});
