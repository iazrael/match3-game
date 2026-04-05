/**
 * 游戏棋盘尺寸
 */
export const GRID_SIZE = 6;

/**
 * 元素类型
 */
export enum TileType {
  RED = 0,
  BLUE = 1,
  GREEN = 2,
  YELLOW = 3,
  PURPLE = 4,
  ORANGE = 5,
}

/**
 * 特殊元素类型
 */
export enum SpecialType {
  NONE = 'none',
  LINE_HORIZONTAL = 'line_horizontal',
  LINE_VERTICAL = 'line_vertical',
  AREA = 'area',
  RAINBOW = 'rainbow',
}

/**
 * 网格位置
 */
export interface GridPosition {
  row: number;
  col: number;
}

/**
 * 元素接口
 */
export interface Tile {
  type: TileType;
  special: SpecialType;
  position: GridPosition;
}

/**
 * 匹配结果
 */
export interface Match {
  tiles: Tile[];
  direction: 'horizontal' | 'vertical';
  length: number;
  startPos: GridPosition;
  endPos: GridPosition;
}

/**
 * 匹配模式类型
 */
export enum SpecialPattern {
  LINE_4_HORIZONTAL = 'line_4_horizontal',
  LINE_4_VERTICAL = 'line_4_vertical',
  LINE_5 = 'line_5',
  T_SHAPE = 't_shape',
  L_SHAPE = 'l_shape',
}

/**
 * 模式检测结果
 */
export interface PatternDetectionResult {
  pattern: SpecialPattern;
  centerTile: GridPosition;
  affectedTiles: GridPosition[];
}

/**
 * 交换结果
 */
export interface SwapResult {
  success: boolean;
  matches: Match[];
  specialCreations: SpecialCreation[];
  reason?: 'invalid_move' | 'no_match';
}

/**
 * 特殊元素创建信息
 */
export interface SpecialCreation {
  position: GridPosition;
  pattern: SpecialPattern;
  type: SpecialType;
}

/**
 * 移动结果
 */
export interface TileMovement {
  tile: Tile;
  from: GridPosition;
  to: GridPosition;
  distance: number;
  isNew?: boolean;
}

/**
 * 重力结果
 */
export interface GravityResult {
  movements: TileMovement[];
  newTiles: Tile[];
}
