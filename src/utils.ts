/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WordPuzzle, Player, BeastType } from './types';

// The 100 Standardized Chinese Character Disassembly Word Riddles Database
// Format: Riddle Content, Answer Character, Xinhua Dictionary 11th Edition Page Number
export const CHINESE_WORD_PUZZLES: WordPuzzle[] = [
  { id: 1, riddle: "十张口，一颗心（打一字）", answer: "思", page: 477 },
  { id: 2, riddle: "一加一，不等于二（打一字）", answer: "王", page: 483 },
  { id: 3, riddle: "天上有人（打一字）", answer: "会", page: 156 },
  { id: 4, riddle: "门里有人（打一字）", answer: "闪", page: 419 },
  { id: 5, riddle: "日月同辉（打一字）", answer: "明", page: 299 },
  { id: 6, riddle: "三口重叠（打一字）", answer: "品", page: 318 },
  { id: 7, riddle: "一人站立（打一字）", answer: "位", page: 557 },
  { id: 8, riddle: "土里藏口（打一字）", answer: "吉", page: 189 },
  { id: 9, riddle: "水边可走（打一字）", answer: "河", page: 169 },
  { id: 10, riddle: "草木丛生（打一字）", answer: "苗", page: 298 },
  { id: 11, riddle: "小小太阳（打一字）", answer: "日", page: 406 },
  { id: 12, riddle: "大大月亮（打一字）", answer: "月", page: 532 },
  { id: 13, riddle: "女子相伴（打一字）", answer: "好", page: 163 },
  { id: 14, riddle: "手在窗边（打一字）", answer: "护", page: 180 },
  { id: 15, riddle: "心田之上（打一字）", answer: "思", page: 477 },
  { id: 16, riddle: "一人挑大梁（打一字）", answer: "大", page: 80 },
  { id: 17, riddle: "旭日升空（打一字）", answer: "九", page: 202 },
  { id: 18, riddle: "半青半紫（打一字）", answer: "素", page: 481 },
  { id: 19, riddle: "双人同行（打一字）", answer: "从", page: 62 },
  { id: 20, riddle: "山下有石（打一字）", answer: "岩", page: 521 },
  { id: 21, riddle: "门里有耳（打一字）", answer: "闻", page: 518 },
  { id: 22, riddle: "大雨落田间（打一字）", answer: "雷", page: 248 },
  { id: 23, riddle: "口中有木（打一字）", answer: "困", page: 244 },
  { id: 24, riddle: "心上有秋（打一字）", answer: "愁", page: 57 },
  { id: 25, riddle: "水少一点（打一字）", answer: "冰", page: 22 },
  { id: 26, riddle: "十日相伴（打一字）", answer: "早", page: 537 },
  { id: 27, riddle: "草下藏虫（打一字）", answer: "茧", page: 200 },
  { id: 28, riddle: "木旁有目（打一字）", answer: "相", page: 492 },
  { id: 29, riddle: "云上有人（打一字）", answer: "会", page: 156 },
  { id: 30, riddle: "千里相逢（打一字）", answer: "重", page: 344 },
  { id: 31, riddle: "一人一张口（打一字）", answer: "合", page: 144 },
  { id: 32, riddle: "刀在口边（打一字）", answer: "叨", page: 66 },
  { id: 33, riddle: "木在日落时（打一字）", answer: "果", page: 134 },
  { id: 34, riddle: "白字加水（打一字）", answer: "泉", page: 398 },
  { id: 35, riddle: "古字加月（打一字）", answer: "胡", page: 172 },
  { id: 36, riddle: "寸土不离（打一字）", answer: "寺", page: 479 },
  { id: 37, riddle: "木口相对（打一字）", answer: "呆", page: 81 },
  { id: 38, riddle: "夕夕相连（打一字）", answer: "多", page: 104 },
  { id: 39, riddle: "又多一撇（打一字）", answer: "友", page: 524 },
  { id: 40, riddle: "米字出头（打一字）", answer: "来", page: 249 },
  { id: 41, riddle: "草下藏白（打一字）", answer: "百", page: 13 },
  { id: 42, riddle: "月在半空（打一字）", answer: "有", page: 525 },
  { id: 43, riddle: "十载苦心（打一字）", answer: "田", page: 491 },
  { id: 44, riddle: "言而有信（打一字）", answer: "人", page: 382 },
  { id: 45, riddle: "两点清水（打一字）", answer: "冰", page: 22 },
  { id: 46, riddle: "宝盖有玉（打一字）", answer: "宝", page: 14 },
  { id: 47, riddle: "衣旁一口（打一字）", answer: "衣", page: 511 },
  { id: 48, riddle: "欠了又欠（打一字）", answer: "欢", page: 161 },
  { id: 49, riddle: "心在月下（打一字）", answer: "悄", page: 322 },
  { id: 50, riddle: "言十合一（打一字）", answer: "计", page: 187 },
  { id: 51, riddle: "手遮日光（打一字）", answer: "晃", page: 176 },
  { id: 52, riddle: "四口齐心（打一字）", answer: "田", page: 491 },
  { id: 53, riddle: "人在草木中（打一字）", answer: "茶", page: 41 },
  { id: 54, riddle: "半丝半红（打一字）", answer: "红", page: 171 },
  { id: 55, riddle: "雨落横山（打一字）", answer: "雪", page: 482 },
  { id: 56, riddle: "风旁有木（打一字）", answer: "枫", page: 128 },
  { id: 57, riddle: "言旁青字（打一字）", answer: "请", page: 321 },
  { id: 58, riddle: "心藏青山（打一字）", answer: "情", page: 320 },
  { id: 59, riddle: "水畔青禾（打一字）", answer: "清", page: 319 },
  { id: 60, riddle: "女口相合（打一字）", answer: "如", page: 411 },
  { id: 61, riddle: "门外有方（打一字）", answer: "房", page: 117 },
  { id: 62, riddle: "草下有早（打一字）", answer: "草", page: 17 },
  { id: 63, riddle: "言兑相合（打一字）", answer: "说", page: 430 },
  { id: 64, riddle: "衣藏皮相（打一字）", answer: "被", page: 18 },
  { id: 65, riddle: "水走良途（打一字）", answer: "浪", page: 251 },
  { id: 66, riddle: "竹下有毛（打一字）", answer: "笔", page: 314 },
  { id: 67, riddle: "大者可也（打一字）", answer: "奇", page: 390 },
  { id: 68, riddle: "八口相聚（打一字）", answer: "只", page: 541 },
  { id: 69, riddle: "木公相伴（打一字）", answer: "松", page: 475 },
  { id: 70, riddle: "木母相依（打一字）", answer: "梅", page: 293 },
  { id: 71, riddle: "三日相连（打一字）", answer: "晶", page: 216 },
  { id: 72, riddle: "三石叠加（打一字）", answer: "磊", page: 254 },
  { id: 73, riddle: "三水汇聚（打一字）", answer: "淼", page: 297 },
  { id: 74, riddle: "双人夹土（打一字）", answer: "佳", page: 192 },
  { id: 75, riddle: "一点一横长（打一字）", answer: "广", page: 159 },
  { id: 76, riddle: "草下二人（打一字）", answer: "芙", page: 122 },
  { id: 77, riddle: "月下藏古（打一字）", answer: "胡", page: 172 },
  { id: 78, riddle: "言尽于心（打一字）", answer: "认", page: 402 },
  { id: 79, riddle: "手挽长河（打一字）", answer: "扛", page: 147 },
  { id: 80, riddle: "小大相合（打一字）", answer: "尖", page: 228 },
  { id: 81, riddle: "正反一直（打一字）", answer: "亚", page: 509 },
  { id: 82, riddle: "口中藏玉（打一字）", answer: "国", page: 143 },
  { id: 83, riddle: "十载丹心（打一字）", answer: "汁", page: 472 },
  { id: 84, riddle: "人随寸土（打一字）", answer: "付", page: 121 },
  { id: 85, riddle: "雨落田地（打一字）", answer: "雷", page: 248 },
  { id: 86, riddle: "古木参天（打一字）", answer: "枯", page: 243 },
  { id: 87, riddle: "双人十日（打一字）", answer: "徇", page: 509 },
  { id: 88, riddle: "日下平安（打一字）", answer: "晏", page: 510 },
  { id: 89, riddle: "金旁失色（打一字）", answer: "铁", page: 490 },
  { id: 90, riddle: "病中藏知（打一字）", answer: "痴", page: 46 },
  { id: 91, riddle: "木边长青（打一字）", answer: "析", page: 456 },
  { id: 92, riddle: "金童立人（打一字）", answer: "钟", page: 540 },
  { id: 93, riddle: "家门之内（打一字）", answer: "入", page: 413 },
  { id: 94, riddle: "千里相会（打一字）", answer: "重", page: 344 },
  { id: 95, riddle: "半丝半缕（打一字）", answer: "红", page: 171 },
  { id: 96, riddle: "水畔良木（打一字）", answer: "浪", page: 251 },
  { id: 97, riddle: "草藏田土（打一字）", answer: "苗", page: 298 },
  { id: 98, riddle: "心口合一（打一字）", answer: "思", page: 477 },
  { id: 99, riddle: "山石相连（打一字）", answer: "岩", page: 521 },
  { id: 100, riddle: "日月相伴（打一字）", answer: "明", page: 299 }
];

/**
 * Distribute standard player roles for 10 players based on game constraints:
 * - 7 Good (青铜器精灵): 龟, 羊, 牛, 猫头鹰 ×2, 猪, 虎
 * - 3 Undercovers (文创精灵)
 * Returns the fully randomized 10 players list.
 */
export function assignInitialRoles(userPlayerName: string): Player[] {
  // Randomly select one of the six possible beasts to be the double/twin beast
  const listAllBeasts: BeastType[] = ['龟', '羊', '牛', '猫头鹰', '猪', '虎'];
  const randomizedTwin = listAllBeasts[Math.floor(Math.random() * listAllBeasts.length)];

  // Construct assembly of 7 good beast roles including the chosen twin twice
  const goodBeasts: BeastType[] = [];
  listAllBeasts.forEach((v) => {
    goodBeasts.push(v);
    if (v === randomizedTwin) {
      goodBeasts.push(v);
    }
  });
  
  // Create 10 identities (7 good, 3 undercovers)
  const isGoodIndexList = [true, true, true, true, true, true, true, false, false, false];
  
  // Shuffle identities
  for (let i = isGoodIndexList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [isGoodIndexList[i], isGoodIndexList[j]] = [isGoodIndexList[j], isGoodIndexList[i]];
  }

  // Shuffle good beasts
  for (let i = goodBeasts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [goodBeasts[i], goodBeasts[j]] = [goodBeasts[j], goodBeasts[i]];
  }

  // Define representative names
  const playerNames = [
    userPlayerName,
    "姜尚 (子牙)",
    "妇好 (将军)",
    "姬发 (武王)",
    "周公 (旦)",
    "召公 (饰)",
    "微子 (启)",
    "箕子 (胥)",
    "比干 (少师)",
    "太甲 (太宗)"
  ];

  let beastIndex = 0;
  const players: Player[] = [];

  for (let i = 0; i < 10; i++) {
    const isGood = isGoodIndexList[i];
    const isUser = i === 0; // human user is index 0
    
    let beast: BeastType | null = null;
    let vessel: string | null = null;
    
    if (isGood) {
      beast = goodBeasts[beastIndex++];
      // Map to its fixed vessel
      vessel = getVesselByBeast(beast);
    }

    // Generate candidates lists (3 beasts: includes true if good, or a set of 3 if undercover target)
    const options = generateThreeCandidates(beast);

    players.push({
      id: i + 1,
      name: playerNames[i],
      isUser,
      isGood,
      beast,
      vessel,
      isEliminated: false,
      hasEnteredChamber: false,
      stampedBeasts: [],
      candidateOptions: options,
      finalFilledBeast: null,
      oracleBones: 0
    });
  }

  return players;
}

// Fixed Zhou Dynasty bronze vessels mapping
export function getVesselByBeast(beast: BeastType): string {
  switch (beast) {
    case '龟': return '青铜簋';
    case '羊': return '四羊方尊';
    case '牛': return '青铜牛尊';
    case '猫头鹰': return '妇好鸮尊';
    case '猪': return '豕形猪尊';
    case '虎': return '虎食人卣';
  }
}

// Generate 3 unique candidate option stamps (must include the target's beast if not null)
export function generateThreeCandidates(beast: BeastType | null): BeastType[] {
  const allBeasts: BeastType[] = ['龟', '羊', '牛', '猫头鹰', '猪', '虎'];
  if (!beast) {
    // Undercovers don't have a true good identity, return 3 random ones
    const shuffled = [...allBeasts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  const result: BeastType[] = [beast];
  const filtering = allBeasts.filter(b => b !== beast);
  const shuffledOthers = filtering.sort(() => 0.5 - Math.random());
  
  result.push(shuffledOthers[0]);
  result.push(shuffledOthers[1]);

  // Re-shuffle so the true choice isn't always the first index!
  return result.sort(() => 0.5 - Math.random());
}

/**
 * Handles three player team check logic
 * Costs 1 Oracle bone, choose target beast, return if any of the three has it.
 * Special check for owl: counts either of the twin Owls!
 */
export function checkTeamPresence(
  selectedPlayers: Player[],
  queryBeast: BeastType
): boolean {
  return selectedPlayers.some(p => {
    if (!p.isGood || p.isEliminated) return false;
    // Cats are twins, so both have p.beast === '猫头鹰' which matches queryBeast
    return p.beast === queryBeast;
  });
}
