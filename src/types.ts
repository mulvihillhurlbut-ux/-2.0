/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Beast identities for Good players
export type BeastType = '龟' | '羊' | '牛' | '猫头鹰' | '猪' | '虎';

// Corresponding ancient bronze vessels
export const BEAST_VESSEL: Record<BeastType, string> = {
  '龟': '青铜簋',
  '羊': '四羊方尊',
  '牛': '青铜牛尊',
  '猫头鹰': '妇好鸮尊',
  '猪': '豕形猪尊',
  '虎': '虎食人卣'
};

// Player structure in the Standalone simulation game
export interface Player {
  id: number;               // 1 to 10
  name: string;             // e.g. "玩家 1", "玩家 2", ...
  isUser: boolean;          // Is the human player?
  isGood: boolean;          // true: 好人 (青铜器精灵), false: 卧底 (文创精灵)
  beast: BeastType | null;  // For Good: one of the beasts. For Undercovers: null (or assigned for camouflage)
  vessel: string | null;    // For Good: corresponding bronze vessel. For Undercovers: null
  isEliminated: boolean;    // Has been guessed and eliminated by undercover?
  hasEnteredChamber: boolean; // Good players can only enter SECRET chamber once
  stampedBeasts: BeastType[]; // Which beasts are stamped/marked in their notes
  candidateOptions: BeastType[]; // Secret chamber result (3 candidates)
  finalFilledBeast: BeastType | null; // Final verification guess for Good survivors
  oracleBones: number;      // Individual oracle bones count
}

// Character disassembly word riddle
export interface WordPuzzle {
  id: number;
  riddle: string;      // 谜面 (拆字句式)
  answer: string;      // 谜底单个汉字
  page: number;        // 新华字典 11 版标准页码
}

// Game log message for the console logs
export interface GameEventLog {
  id: string;
  timestamp: string;  // e.g. 02:40
  sender: string;     // Player name or "系统" or "神兽"
  message: string;
  type: 'system' | 'good' | 'undercover' | 'totem_good' | 'totem_bad' | 'chat';
}

// Global game status
export interface NewGameState {
  players: Player[];
  userPlayer: Player;
  oracleBones: number;       // Collective bag of user's oracle bones
  elapsedSeconds: number;     // countdown from 600s (10 min)
  isCompleted: boolean;
  hasWon: boolean | null;
  activePuzzle: WordPuzzle | null;
  dictionaryQuery: string;    // User input character to search the dictionary
  dictionaryResultPage: number | null; // page returned with turn animate
  treasureChestCode: string; // page input for the bronze chests
  chestState: 'closed' | 'success' | 'fail' | 'empty'; // bronze chest state
  isLowAnimationMode: boolean; // toggle simplified animation for low spec
  activeTab: 'map' | 'puzzle' | 'chamber' | 'check' | 'final';
  bambooScrollNotes: Record<number, BeastType[]>; // Bamboo scroll stamps for players
  undercoverChatList: string[]; // Private messages between undercovers (visible if user is undercover)
}
