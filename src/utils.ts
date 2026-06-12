/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WordPuzzle, Player, BeastType } from './types';

// The 100 Standardized Chinese Character Disassembly Word Riddles Database
// Format: Riddle Content, Answer Character, Xinhua Dictionary 11th Edition Page Number
export const CHINESE_WORD_PUZZLES: WordPuzzle[] = [
  { id: 1, riddle: "十一只口，一根竹签穿透（打一字）", answer: "吉", page: 202 },
  { id: 2, riddle: "一口咬掉牛尾巴（打一字）", answer: "告", page: 151 },
  { id: 3, riddle: "上边十一，下边二十，齐心合力（打一字）", answer: "喜", page: 521 },
  { id: 4, riddle: "人立在树木旁，安心靠着歇息（打一字）", answer: "休", page: 536 },
  { id: 5, riddle: "山字连着山，层层山峦叠出来（打一字）", answer: "出", page: 68 },
  { id: 6, riddle: "两个月亮并排走，朋友一生不放手（打一字）", answer: "朋", page: 373 },
  { id: 7, riddle: "十个太阳排排站，大火在底下烤（打一字）", answer: "焦", page: 227 },
  { id: 8, riddle: "两只手合在一起办事（打一字）", answer: "掰", page: 18 },
  { id: 9, riddle: "三人同行，人挨着人力量大（打一字）", answer: "众", page: 638 },
  { id: 10, riddle: "二人相随，一前一后暖洋洋（打一字）", answer: "从", page: 81 },
  { id: 11, riddle: "十张大口，连着一颗红心（打一字）", answer: "思", page: 462 },
  { id: 12, riddle: "四面墙壁紧紧闭，一个十字在中心（打一字）", answer: "田", page: 494 },
  { id: 13, riddle: "田字头上长出青青嫩草（打一字）", answer: "苗", page: 323 },
  { id: 14, riddle: "一月一日组合在一起，天地间一片光明（打一字）", answer: "明", page: 326 },
  { id: 15, riddle: "树木的根部上端砍上一刀作为记号（打一字）", answer: "本", page: 31 },
  { id: 16, riddle: "树木的最顶端梢处加上一个标示（打一字）", answer: "末", page: 320 },
  { id: 17, riddle: "门口站着一个高大威武的人（打一字）", answer: "闪", page: 440 },
  { id: 18, riddle: "大火把林子里的木头全烧焦了（打一字）", answer: "焚", page: 129 },
  { id: 19, riddle: "三个金字聚在一块闪闪发光（打一字）", answer: "鑫", page: 539 },
  { id: 20, riddle: "三个水滴聚集在一起，波涛汹涌（打一字）", answer: "淼", page: 328 },
  { id: 21, riddle: "三个土字层层相叠，变成高耸的小山丘（打一字）", answer: "垚", page: 572 },
  { id: 22, riddle: "小字长出了两只长长的犄角（打一字）", answer: "尖", page: 224 },
  { id: 23, riddle: "不正不正，歪着身子走路（打一字）", answer: "歪", page: 512 },
  { id: 24, riddle: "一横一竖穿过，立于人旁（打一字）", answer: "什", page: 451 },
  { id: 25, riddle: "手字旁边长着一张宽大的口（打一字）", answer: "扣", page: 258 },
  { id: 26, riddle: "在水池的旁边，立着一根高大木柱（打一字）", answer: "沐", page: 334 },
  { id: 27, riddle: "把门关上，里面还横着一把利木锁（打一字）", answer: "闲", page: 518 },
  { id: 28, riddle: "一字写得端，十字架上长一横（打一字）", answer: "干", page: 138 },
  { id: 29, riddle: "土上面再横着垫一块厚板砖（打一字）", answer: "王", page: 498 },
  { id: 30, riddle: "王座旁边落下一颗璀璨的明珠（打一字）", answer: "玉", page: 588 },
  { id: 31, riddle: "有水能起万丈波，有手可以推浪涛（打一字）", answer: "皮", page: 367 },
  { id: 32, riddle: "三个木字排排坐，森林茂密空气好（打一字）", answer: "森", page: 432 },
  { id: 33, riddle: "一字九横，六个直角，三个日子叠起来（打一字）", answer: "晶", page: 232 },
  { id: 34, riddle: "二十四小时跑坏了，旧屋变新房（打一字）", answer: "旧", page: 235 },
  { id: 35, riddle: "一飞冲天，张着嘴大声喊叫（打一字）", answer: "吴", page: 523 },
  { id: 36, riddle: "大字底下，还稳稳站着一个人（打一字）", answer: "夫", page: 125 },
  { id: 37, riddle: "大字头上，戴着一顶高顶帽子（打一字）", answer: "天", page: 480 },
  { id: 38, riddle: "人字底下卧着，像一把弯弯的尺子（打一字）", answer: "个", page: 147 },
  { id: 39, riddle: "有水便能洗个澡，有火便能烤个饼（打一字）", answer: "尧", page: 574 },
  { id: 40, riddle: "太阳刚刚从东边地平线上升起（打一字）", answer: "旦", page: 88 },
  { id: 41, riddle: "双手交叉，抱在胸口（打一字）", answer: "爻", page: 575 },
  { id: 42, riddle: "有手能拍手，有足能跑路，人来开会（打一字）", answer: "包", page: 21 },
  { id: 43, riddle: "大字肚里，多点一颗黑痣（打一字）", answer: "太", page: 482 },
  { id: 44, riddle: "木字头上，多横着重重一笔（打一字）", answer: "朱", page: 635 },
  { id: 45, riddle: "口字里面，还缩立着一个木字（打一字）", answer: "困", page: 265 },
  { id: 46, riddle: "一字真奇怪，人立在空框中不出来（打一字）", answer: "囚", page: 396 },
  { id: 47, riddle: "竹竿底下，安插着两个尖尖的木桩（打一字）", answer: "笨", page: 34 },
  { id: 48, riddle: "手字插進木头缝里，折断树枝（打一字）", answer: "折", page: 602 },
  { id: 49, riddle: "山岗旁边，还挺立着一个威武的人（打一字）", answer: "仙", page: 515 },
  { id: 50, riddle: "口里吐玉，金晃晃的价值连城（打一字）", answer: "国", page: 168 },
  { id: 51, riddle: "两点水旁，还卧躺着一个冬日（打一字）", answer: "冬", page: 104 },
  { id: 52, riddle: "门框里面，居然装进了一整个重日（打一字）", answer: "间", page: 218 },
  { id: 53, riddle: "一横一撇落，下面挂着一个大口（打一字）", answer: "石", page: 443 },
  { id: 54, riddle: "一字写得怪，下面站着两只并立脚（打一字）", answer: "并", page: 37 },
  { id: 55, riddle: "口里塞塞满，进驻了一个大兵（打一字）", answer: "园", page: 593 },
  { id: 56, riddle: "人立在屋顶，远望思念家乡（打一字）", answer: "舍", page: 438 },
  { id: 57, riddle: "一头落一尾，两边分成两个一字（打一字）", answer: "平", page: 369 },
  { id: 58, riddle: "手字在左侧，右侧贴着一个大巴掌（打一字）", answer: "把", page: 18 },
  { id: 59, riddle: "大水冲到地里，良田万顷化为水（打一字）", answer: "浪", page: 281 },
  { id: 60, riddle: "木字在左侧，右侧挂着一个风铃（打一字）", answer: "枫", page: 128 },
  { id: 61, riddle: "水滴溅到树上，木梢全湿透（打一字）", answer: "淋", page: 295 },
  { id: 62, riddle: "有心无力，空想一整天（打一字）", answer: "恏", page: 198 },
  { id: 63, riddle: "太阳照在大地上，土块成一团（打一字）", answer: "里", page: 293 },
  { id: 64, riddle: "半真半假，立在木头旁（打一字）", answer: "保", page: 20 },
  { id: 65, riddle: "日照竹竿，影子变成一个字（打一字）", answer: "算", page: 447 },
  { id: 66, riddle: "两口合一，日子过得甜滋滋（打一字）", answer: "吕", page: 312 },
  { id: 67, riddle: "人住屋中，上面立着尖尖塔（打一字）", answer: "合", page: 172 },
  { id: 68, riddle: "口含玉石，口下挂一颗大宝石（打一字）", answer: "莹", page: 591 },
  { id: 69, riddle: "大字踩在土堆上，扬眉吐气（打一字）", answer: "尘", page: 69 },
  { id: 70, riddle: "日落西山，水在两旁流（打一字）", answer: "汨", page: 325 },
  { id: 71, riddle: "人立在古板学者身旁（打一字）", answer: "估", page: 152 },
  { id: 72, riddle: "门内有一位英俊潇洒的公职人员（打一字）", answer: "闵", page: 326 },
  { id: 73, riddle: "一箭穿心，血滴落在草丛上（打一字）", answer: "芯", page: 540 },
  { id: 74, riddle: "双手合一，向上托举重物（打一字）", answer: "拿", page: 341 },
  { id: 75, riddle: "女子坐立在木椅旁（打一字）", answer: "婪", page: 280 },
  { id: 76, riddle: "水波荡漾在田地的另一侧（打一字）", answer: "潘", page: 362 },
  { id: 77, riddle: "口旁躺着一个正在打盹的人（打一字）", answer: "哈", page: 175 },
  { id: 78, riddle: "两日上下重叠，光照万物（打一字）", answer: "昌", page: 51 },
  { id: 79, riddle: "月影斜照在人旁，深夜思量（打一字）", answer: "俏", page: 391 },
  { id: 80, riddle: "日落之后，寸步不能挪移（打一字）", answer: "耐", page: 340 },
  { id: 81, riddle: "白白胖胖，立在大木旁边（打一字）", answer: "棉", page: 325 },
  { id: 82, riddle: "舌头碰到水，甘甜如泉涌（打一字）", answer: "活", page: 211 },
  { id: 83, riddle: "言语多温和，立在人旁边（打一字）", answer: "信", page: 528 },
  { id: 84, riddle: "田里立着一只大鼎，青铜铸就（打一字）", answer: "羁", page: 221 },
  { id: 85, riddle: "山头上长出一棵挺拔的翠柏（打一字）", answer: "岳", page: 585 },
  { id: 86, riddle: "水流急促地冲在石壁上（打一字）", answer: "泵", page: 34 },
  { id: 87, riddle: "古老时代，月亮挂在天空另一侧（打一字）", answer: "胡", page: 196 },
  { id: 88, riddle: "口字在上方，土字在下方（打一字）", answer: "呈", page: 59 },
  { id: 89, riddle: "有心做工，功德圆满（打一字）", answer: "恐", page: 260 },
  { id: 90, riddle: "一字怪异，木字在土中生存（打一字）", answer: "杜", page: 110 },
  { id: 91, riddle: "人立在金字旁，腰缠万贯（打一字）", answer: "铺", page: 381 },
  { id: 92, riddle: "口吃一刀，张大嘴说不出话（打一字）", answer: "召", page: 605 },
  { id: 93, riddle: "手字在一旁，用力捏弄物件（打一字）", answer: "捏", page: 349 },
  { id: 94, riddle: "日落树梢，林子里一片安详（打一字）", answer: "杳", page: 574 },
  { id: 95, riddle: "田间跑出一头矫健飞奔的牛（打一字）", answer: "甥", page: 449 },
  { id: 96, riddle: "人立在两把匕首旁，心怀戒备（打一字）", answer: "化", page: 205 },
  { id: 97, riddle: "大字顶着一根短木棍（打一字）", answer: "矢", page: 450 },
  { id: 98, riddle: "十只口合在一起，成了上古歌词（打一字）", answer: "古", page: 165 },
  { id: 99, riddle: "一根横木紧紧闩住双扇大门（打一字）", answer: "闩", page: 455 },
  { id: 100, riddle: "日出山岗，山头落一圈金辉（打一字）", answer: "岁", page: 485 }
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
    "召公 (奭)",
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
