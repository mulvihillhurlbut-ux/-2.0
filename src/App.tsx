/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Shield,
  Skull,
  RefreshCw,
  Award,
  Sparkles,
  HelpCircle,
  Volume2,
  VolumeX,
  Compass,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  BookOpen,
  Lock,
  Unlock,
  MessageSquare,
  Users,
  Search,
  CheckSquare,
  Eye,
  EyeOff,
  Send,
  Sliders,
  Clock,
  Trash2,
  GripVertical,
  Database,
  Mic,
  MicOff
} from 'lucide-react';

import { Player, WordPuzzle, GameEventLog, NewGameState, BeastType, BEAST_VESSEL } from './types';
import { CHINESE_WORD_PUZZLES, assignInitialRoles, checkTeamPresence, getVesselByBeast } from './utils';
import { GlobalAudio } from './components/AudioSystem';
import { useVoiceChat } from './hooks/useVoiceChat';
import { VoiceCommunicator } from './components/VoiceCommunicator';

export default function App() {
  // Global Game Configuration Values
  const [userName, setUserName] = useState<string>('小贞人 (主角)');
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  // --- MULTIPLAYER CLIENT STATES ---
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>('');
  const [roomInputId, setRoomInputId] = useState<string>('');
  const [invitedRoomId, setInvitedRoomId] = useState<string | null>(null);
  const [hasModifiedName, setHasModifiedName] = useState<boolean>(false);
  const [lobbyPlayers, setLobbyPlayers] = useState<{ id: string; name: string; seatId: number | null; isHost: boolean }[]>([]);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [mySeatId, setMySeatId] = useState<number | null>(null);
  const [multiplayerError, setMultiplayerError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const isRemoteUpdateRef = useRef<boolean>(false);
  const [lobbyChatText, setLobbyChatText] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // WebRTC Client Voice Chat Engine
  const {
    isVoiceEnabled,
    isMuted,
    voiceError,
    toggleVoice,
    toggleMute,
    handleVoiceSignal
  } = useVoiceChat(socket, clientId, roomId, lobbyPlayers);
  
  // Game states
  const [players, setPlayers] = useState<Player[]>([]);

  // Dynamically identify which beast is the Twin (duplicated) in the current game session
  const twinBeast = useMemo<BeastType>(() => {
    if (!players || players.length === 0) return '猫头鹰';
    const counts: Record<string, number> = {} as any;
    players.forEach(p => {
      if (p.isGood && p.beast) {
        counts[p.beast] = (counts[p.beast] || 0) + 1;
      }
    });
    const found = Object.entries(counts).find(([_, c]) => c === 2);
    return found ? (found[0] as BeastType) : '猫头鹰';
  }, [players]);
  const localPlayer = useMemo<Player | undefined>(() => {
    if (isMultiplayer && mySeatId) {
      return players.find(p => p.id === mySeatId);
    }
    return players[0];
  }, [players, isMultiplayer, mySeatId]);

  // Bulletproof selector to find local player's ID in any state array directly, avoiding React stale closure traps
  const selectLocalPlayerId = useCallback((playerList: Player[]) => {
    if (isMultiplayer && mySeatId !== null && mySeatId !== undefined) {
      const match = playerList.find(p => p.id === mySeatId);
      if (match) return match.id;
    }
    const userMatch = playerList.find(p => p.isUser);
    if (userMatch) return userMatch.id;
    return playerList[0]?.id || 1;
  }, [isMultiplayer, mySeatId]);

  const oracleBones = localPlayer?.oracleBones || 0;
  const [isAltarActivated, setIsAltarActivated] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(1200); // 20 minutes (1200 seconds): 10m guess + 10m verify
  const [activeTab, setActiveTab] = useState<'map' | 'puzzle' | 'chamber' | 'check' | 'final'>('map');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean | null>(null);
  const [isLowAnimation, setIsLowAnimation] = useState<boolean>(false);
  const [logs, setLogs] = useState<GameEventLog[]>([]);
  
  // Audio control
  const [isAudioPromptOpen, setIsAudioPromptOpen] = useState<boolean>(true);
  const [muetAudio, setMuteAudio] = useState<boolean>(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [isBonesModalOpen, setIsBonesModalOpen] = useState<boolean>(false);
  const [isBondsGuideModalOpen, setIsBondsGuideModalOpen] = useState<boolean>(false);
  const [flippedPlayers, setFlippedPlayers] = useState<Record<number, boolean>>({});

  // Story background modal state and solemn narration speech control
  const [isStoryModalOpen, setIsStoryModalOpen] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const speechSequenceIdRef = useRef<number>(0);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll logs container to the latest entry when logs change but do NOT scroll the parent window/page
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs.length]);

  // Riddle box variables
  const [pickedPuzzle, setPickedPuzzle] = useState<WordPuzzle | null>(null);
  const [dictionaryQuery, setDictionaryQuery] = useState<string>('');
  const [isDictionaryFlipping, setIsDictionaryFlipping] = useState<boolean>(false);
  const [dictionaryPageResult, setDictionaryPageResult] = useState<number | null>(null);
  const [chestInputCode, setChestInputCode] = useState<string>('');
  const [chestState, setChestState] = useState<'closed' | 'success' | 'fail'>('closed');
  const [hasCollectedBone, setHasCollectedBone] = useState<boolean>(false);
  const [numPuzzlesSolved, setNumPuzzlesSolved] = useState<number>(0);
  const [recentlyClickedStamps, setRecentlyClickedStamps] = useState<Record<string, boolean>>({});
  const [showPreviewSacrifice, setShowPreviewSacrifice] = useState<boolean>(false);
  const [revealAllIdentities, setRevealAllIdentities] = useState<boolean>(false);
  const [assassinationResult, setAssassinationResult] = useState<{
    show: boolean;
    killerName: string;
    targetName: string;
    targetId: number;
    guessedBeast: BeastType;
    isSuccess: boolean;
    realBeast: BeastType;
  } | null>(null);

  // Beast Aura Burst animation states
  const [auraBurstPlayerId, setAuraBurstPlayerId] = useState<number | null>(null);
  const [auraBurstBeast, setAuraBurstBeast] = useState<BeastType | 'unknown'>('unknown');

  // Secret chamber state variables
  const [selectedChamberTargetId, setSelectedChamberTargetId] = useState<number>(2); // defaults to player 2
  const [chamberResultOptions, setChamberResultOptions] = useState<BeastType[]>([]);
  const [chamberEliminateTargetId, setChamberEliminateTargetId] = useState<number>(2);
  const [chamberEliminateGuessBeast, setChamberEliminateGuessBeast] = useState<BeastType>('龟');
  
  // Verification check team variables
  const [checkedPlayer1, setCheckedPlayer1] = useState<number>(1);
  const [checkedPlayer2, setCheckedPlayer2] = useState<number>(2);
  const [checkedPlayer3, setCheckedPlayer3] = useState<number>(3);
  const [checkedBeast, setCheckedBeast] = useState<BeastType>('龟');
  const [verificationFeedback, setVerificationFeedback] = useState<{
    show: boolean;
    hasBeast: boolean;
    teamNames: string[];
    beast: BeastType;
  } | null>(null);

  const [teamCheckHistory, setTeamCheckHistory] = useState<{
    playerIds: number[];
    beast: BeastType;
    hasBeast: boolean;
  }[]>([]);

  // Undercover communication scroll
  const [privateUndercoverMessages, setPrivateUndercoverMessages] = useState<string[]>([
    "姜子牙那个老狐狸一直在揣摩占词，要防范他！",
    "刚才姬发居然和微子走得很近，估计他们也在暗中通气。",
    "我们手里的甲骨很宝贵，只要猜准一个好人就去密室淘汰他！"
  ]);
  const [newCoverChatText, setNewCoverChatText] = useState<string>('');

  // Bamboo scroll player-beast marking notes (User's memory board)
  const [bambooScrollNotes, setBambooScrollNotes] = useState<Record<number, BeastType[]>>({});

  // Shang Zhou Current Events ticker message state
  const [shangZhouNews, setShangZhouNews] = useState<string>("青铜神坛已开启，请祭官破译字谜。");
  const [showNewsTicker, setShowNewsTicker] = useState<boolean>(true);
  const [showBondsMap, setShowBondsMap] = useState<boolean>(true);
  const [isBondsCollapsed, setIsBondsCollapsed] = useState<boolean>(false);
  const [selectedBeastInBonds, setSelectedBeastInBonds] = useState<BeastType | null>(null);
  const [trackedBeast, setTrackedBeast] = useState<BeastType | null>(null);

  // Exquisite Shang-Zhou floating progress toast notification list
  const [progressToasts, setProgressToasts] = useState<{
    id: string;
    title: string;
    description: string;
    oracleBones: number;
    unpairedCount: number;
    totalGood: number;
    solvedCount: number;
    showTime: string;
  }[]>([]);

  const derivedDeductions = useMemo(() => {
    const list: Record<number, {
      p: Player;
      chamberCandidates: BeastType[] | null;
      teamRuleOuts: BeastType[];
      allRuledOuts: BeastType[];
      remainingCandidates: BeastType[];
      confirmedBeast: BeastType | null;
    }> = {};

    const allBeastTypes: BeastType[] = ['龟', '羊', '牛', '猪', '虎', '猫头鹰'];

    players.forEach(p => {
      let chamberCandidates: BeastType[] | null = null;
      
      // If the player entered the chamber, their 3 candidates are officially verified information for the room
      if (p.hasEnteredChamber || p.id === localPlayer?.id) {
        chamberCandidates = p.candidateOptions;
      }

      const teamRuleOuts: BeastType[] = [];
      teamCheckHistory.forEach(check => {
        if (!check.hasBeast && check.playerIds.includes(p.id)) {
          if (!teamRuleOuts.includes(check.beast)) {
            teamRuleOuts.push(check.beast);
          }
        }
      });

      const allRuledOuts: BeastType[] = [];
      allBeastTypes.forEach(b => {
        if (chamberCandidates && !chamberCandidates.includes(b)) {
          allRuledOuts.push(b);
        } else if (teamRuleOuts.includes(b)) {
          allRuledOuts.push(b);
        }
      });

      const remainingCandidates = allBeastTypes.filter(b => !allRuledOuts.includes(b));
      const confirmedBeast = remainingCandidates.length === 1 ? remainingCandidates[0] : null;

      list[p.id] = {
        p,
        chamberCandidates,
        teamRuleOuts,
        allRuledOuts,
        remainingCandidates,
        confirmedBeast
      };
    });

    return list;
  }, [players, teamCheckHistory, localPlayer]);

  // Timeline storyline indicators
  const getTimelineStoryLine = () => {
    if (timeRemaining > 900) {
      return {
        title: "第一阶段[前篇]：钻火解谶 · 卜问乾坤",
        desc: "殷墟圣坛之上，青铜重器嗡鸣。十位灵修精灵按照契约就位（好人迷失、卧底知己）。当前处于首个【10分钟解谜猜谜阶段】。神秘之密室、组队验证神坛此刻均处于封印禁锢状态。请大祭司与各路精灵在「神书印.获取」处加紧破字谜赚取卜兆甲骨，储备灵能！"
      };
    } else if (timeRemaining > 600) {
      return {
        title: "第一阶段[后篇]：幽光浮动 · 精灵夜话",
        desc: "破旧竹书闪烁着幽冷金芒，文字迷雾层出不穷，卧底亦假意装扮掩护耳目，扰乱推导线索。唯有把握这一时辰解谜并囤积足量甲骨，才能在下一阶段进行真名大起底！大家加油答题！"
      };
    } else if (timeRemaining > 240) {
      return {
        title: "第二阶段[前篇]：神秘敞开 · 印章鸣响",
        desc: "至尊时刻！后个【10分钟验证阶段】正式鸣荒开启。信封神辉散去不再产生字谜。现在「神秘阁.印章」与「组队核.研契」完全解锁！所有精灵应当叩问密室探视自身的三神兽候选，或支付甲骨开展三人同队核验关系，抽丝剥茧断定罪属！"
      };
    } else if (timeRemaining > 0) {
      return {
        title: "第二阶段[后篇]：生死角逐 · 破晓血战",
        desc: "大荒时辰飞逝，剩余倒计时已所剩无遗！文创卧底们在黑暗中加急进行法身诅咒并企图射杀露出神藏的好人守护。大祭史神荒法台即将在20分钟终点全面唤醒。在这生死紧要关头尽快把竹简记录核实准确！"
      };
    } else {
      return {
        title: "终极阶段：二十日满 · 乾坤大合验",
        desc: "二十分钟总合大限时辰已鸣钟满布！诸天神象隐没，所有勘测法阵均化为冰封。最后的「终极验证合验台」已重光大开！好人守护大祭司必须速速登上合验台并对战局十格神位配比。一旦错漏，魔灵篡立社稷，赢者终局全归！"
      };
    }
  };

  // Dynamically computes 10+ options of context-relevant vague news or rumors
  const getShangZhouNews = (currentPlayers: Player[], notes: Record<number, BeastType[]>, bones: number) => {
    if (!currentPlayers || currentPlayers.length === 0) return ["青铜神坛已开启，请祭官破译字谜。"];
    
    const alivePlayers = currentPlayers.filter(p => !p.isEliminated);
    const aliveGoods = alivePlayers.filter(p => p.isGood);
    const aliveUndercovers = alivePlayers.filter(p => !p.isGood);
    
    const pool: string[] = [
      "大祭司传音：若发现有同伴被恶意诅咒，需高度警惕潜在的文创卧底！",
      "神庙密室四周阴风四起，青铜神光正全力对抗邪祟混入...",
      `当前青铜神坛上，有 ${aliveGoods.length} 位守护精灵在静候法身归位。`,
      `持有 ${bones} 枚卜兆甲骨，可通过【三人校验】进行神魄甄别。`,
      "古书简传言：妇好鸮尊代表上古战神之魄，见鸮尊如见妇好之灵。",
      "契纸上墨印闪烁，凡是确认无误的真灵，均将引发祭坛余温回响。",
      "甲骨文上的焦灼卜辞正泛起荧光，似乎暗示着神魄将定。",
      "听，那是殷墟古编钟的震颤，真理的回响已穿透数千年尘土。",
      "神兽雕像双目澄澈，真诚在左，伪饰在右，切勿自乱阵脚。"
    ];

    // Check how many of each beast has been stamped/marked in scroll notes
    const allMarkedBeasts = Object.values(notes).flat();
    const markedBeastCounts: Record<BeastType, number> = {} as any;
    allMarkedBeasts.forEach(b => {
      markedBeastCounts[b] = (markedBeastCounts[b] || 0) + 1;
    });

    (['龟', '羊', '牛', '猫头鹰', '猪', '虎'] as BeastType[]).forEach(beast => {
      if (markedBeastCounts[beast] && markedBeastCounts[beast] > 0) {
        pool.push(`神宿时态：有一尊【${beast}】灵兽在商周契典中已被悄然标记。`);
      }
    });

    // Check if there are any eliminated players
    const eliminatedPlayers = currentPlayers.filter(p => p.isEliminated);
    if (eliminatedPlayers.length > 0) {
      const lastElim = eliminatedPlayers[eliminatedPlayers.length - 1];
      pool.push(`祭礼异动：${lastElim.name} 突然遭遇了神兽法身的粉碎（淘汰）！`);
    } else {
      pool.push("吉兆回天：目前尚无任何一位守护重器遭遇邪灵之锤，重器完整。");
    }

    if (aliveUndercovers.length > 0) {
      pool.push(`警惕流言：祭坛之上隐隐潜伏着 ${aliveUndercovers.length} 名文创卧底，暗流涌动。`);
    }

    return pool;
  };

  // Sound triggering functions
  const handlePlayBell = (freq: number) => {
    if (!muetAudio) GlobalAudio.playBell(freq, 2.5);
  };
  const handlePlayDrum = () => {
    if (!muetAudio) GlobalAudio.playDrum(1.5);
  };
  const handlePlayWhoosh = () => {
    if (!muetAudio) GlobalAudio.playWhoosh();
  };
  const handlePlaySizzle = () => {
    if (!muetAudio) GlobalAudio.playSizzle(1200);
  };
  const handlePlayCrack = () => {
    if (!muetAudio) GlobalAudio.playCrack();
  };

  const triggerAuraBurst = (id: number, beast: BeastType | 'unknown') => {
    setAuraBurstPlayerId(id);
    setAuraBurstBeast(beast);
    handlePlayBell(beast === 'unknown' ? 300 : 455);
    setTimeout(() => {
      setAuraBurstPlayerId(null);
    }, 1600);
  };

  // Synthesize and speak text utilizing a standard narration voice with SSML parsing capabilities
  const speakStoryText = (textToSpeak: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      const currentSeq = ++speechSequenceIdRef.current;

      const parseSSML = (ssml: string) => {
        const parsedSegments: { text: string; delay: number; rate: number; pitch: number; volume: number }[] = [];
        let pitchVal = 1.0;
        let rateVal = 0.95;
        let volVal = 1.0;

        const prosodyMatch = ssml.match(/<prosody\s+([^>]+)>/i);
        if (prosodyMatch) {
          const attrs = prosodyMatch[1];
          const pitchM = attrs.match(/pitch="([^"]+)"/i);
          const rateM = attrs.match(/rate="([^"]+)"/i);
          const volumeM = attrs.match(/volume="([^"]+)"/i);

          if (pitchM) {
            if (pitchM[1].includes('-15%')) pitchVal = 0.85;
            else if (pitchM[1].includes('%')) {
              const num = parseFloat(pitchM[1]);
              pitchVal = 1.0 + (num / 100);
            } else pitchVal = parseFloat(pitchM[1]);
          }
          if (rateM) {
            rateVal = parseFloat(rateM[1]);
          }
          if (volumeM) {
            if (volumeM[1].includes('%')) volVal = parseFloat(volumeM[1]) / 100;
            else volVal = parseFloat(volumeM[1]);
          }
        }

        const rawContent = ssml.replace(/<speak>|<\/speak>|<voice[^>]*>|<\/voice>|<prosody[^>]*>|<\/prosody>/gi, '').trim();
        const parts = rawContent.split(/<pause\s+time="([^"]+)"[^>]*>/i);
        
        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            const cleanText = parts[i].replace(/<[^>]*>/g, '').trim();
            if (cleanText) {
              const delayVal = (i + 1 < parts.length) ? parseInt(parts[i+1]) : 0;
              parsedSegments.push({
                text: cleanText,
                delay: delayVal,
                pitch: pitchVal,
                rate: rateVal,
                volume: volVal
              });
            }
          }
        }
        return parsedSegments;
      };

      let segments: { text: string; delay: number; rate: number; pitch: number; volume: number }[] = [];

      if (textToSpeak.includes('<speak>')) {
        segments = parseSSML(textToSpeak);
      } else {
        segments = [{
          text: textToSpeak,
          delay: 0,
          rate: 0.95,
          pitch: 1.0,
          volume: 1.0
        }];
      }

      if (segments.length === 0) return;

      let idx = 0;
      const voices = window.speechSynthesis.getVoices();
      let chosenVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('ZH'));

      const speakStep = () => {
        if (speechSequenceIdRef.current !== currentSeq) {
          setIsSpeaking(false);
          return;
        }

        if (idx >= segments.length) {
          setIsSpeaking(false);
          return;
        }

        const seg = segments[idx];
        const utterance = new SpeechSynthesisUtterance(seg.text);
        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }

        utterance.pitch = seg.pitch;
        utterance.rate = seg.rate;
        utterance.volume = seg.volume;

        utterance.onstart = () => {
          if (speechSequenceIdRef.current === currentSeq) {
            setIsSpeaking(true);
          }
        };

        utterance.onend = () => {
          if (speechSequenceIdRef.current !== currentSeq) {
            setIsSpeaking(false);
            return;
          }
          if (seg.delay > 0) {
            setTimeout(() => {
              if (speechSequenceIdRef.current === currentSeq) {
                idx++;
                speakStep();
              }
            }, seg.delay);
          } else {
            idx++;
            speakStep();
          }
        };

        utterance.onerror = () => {
          if (speechSequenceIdRef.current === currentSeq) {
            setIsSpeaking(false);
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      speakStep();
    } catch (err) {
      console.warn('SpeechSynthesis error:', err);
    }
  };

  const handleStopStorySpeech = () => {
    speechSequenceIdRef.current++;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleToggleStorySpeech = () => {
    if (isSpeaking) {
      handleStopStorySpeech();
    } else {
      const fullTextToRead = `
<speak>
<voice name="male_deep">
<prosody pitch="-15%" rate="0.8" volume="80%">
<p>三千年前，殷商王朝鼎盛一时，匠工铸器、甲骨刻文，诞生了无数承载华夏文脉的青铜国宝与甲骨文字。</p>
<pause time="500ms"/>
龟、羊、牛、猫头鹰、猪、虎六大神兽青铜器物，沉睡千年，承载着殷商文明的古老记忆，化作青铜守护精灵，默默守护着殷墟文脉与千年文明瑰宝。
<pause time="800ms"/>
如今，河南安阳殷墟「殷商动物园」青铜国宝特展盛大启幕，跨越三千年时光，古老青铜精灵再度苏醒，奔赴这场跨越时空的文明重逢。
</prosody>
</voice>
</speak>
`;
      speakStoryText(fullTextToRead);
    }
  };

  // Setup the audio initial states
  useEffect(() => {
    if (!isAudioPromptOpen && !muetAudio) {
      GlobalAudio.startAmbient();
      GlobalAudio.startSacredMusic();
    }
    return () => {
      GlobalAudio.stopAmbient();
      GlobalAudio.stopSacredMusic();
    };
  }, [isAudioPromptOpen, muetAudio]);

  // Handle auto-triggering speech synthesis for story background on initial page mount/load
  useEffect(() => {
    let voiceChangeTimeout: any;
    
    const triggerAutoNarrate = () => {
      if (isStoryModalOpen) {
        const autoText = `
<speak>
<voice name="male_deep">
<prosody pitch="-15%" rate="0.8" volume="80%">
<p>三千年前，殷商王朝鼎盛一时，匠工铸器、甲骨刻文，诞生了无数承载华夏文脉的青铜国宝与甲骨文字。</p>
<pause time="500ms"/>
龟、羊、牛、猫头鹰、猪、虎六大神兽青铜器物，沉睡千年，承载着殷商文明的古老记忆，化作青铜守护精灵，默默守护着殷墟文脉与千年文明瑰宝。
<pause time="800ms"/>
如今，河南安阳殷墟「殷商动物园」青铜国宝特展盛大启幕，跨越三千年时光，古老青铜精灵再度苏醒，奔赴这场跨越时空的文明重逢。
</prosody>
</voice>
</speak>
`;
        speakStoryText(autoText);
      }
    };

    // First attempt
    triggerAutoNarrate();

    // Setup voice change bind
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Debounce to ensure steady voice load
        if (voiceChangeTimeout) clearTimeout(voiceChangeTimeout);
        voiceChangeTimeout = setTimeout(() => {
          if (isStoryModalOpen && !window.speechSynthesis.speaking) {
            triggerAutoNarrate();
          }
        }, 500);
      };
    }

    // Auto-play interactive workaround: browsers block autoplay before general action,
    // so we trigger the moment they click/tap anywhere for the first time while modal is visible!
    const handleGestureTrigger = () => {
      if (isStoryModalOpen && !window.speechSynthesis.speaking) {
        triggerAutoNarrate();
      }
      document.removeEventListener('click', handleGestureTrigger);
      document.removeEventListener('touchstart', handleGestureTrigger);
    };

    document.addEventListener('click', handleGestureTrigger);
    document.addEventListener('touchstart', handleGestureTrigger);

    return () => {
      if (voiceChangeTimeout) clearTimeout(voiceChangeTimeout);
      document.removeEventListener('click', handleGestureTrigger);
      document.removeEventListener('touchstart', handleGestureTrigger);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isStoryModalOpen]);

  // --- MULTIPLAYER CLIENT ENGINE ---

  // WebSocket message receiver
  const handleWebSocketMessage = useCallback((e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      console.log("[WS Client Received]", data);

      switch (data.type) {
        case 'joined':
          setClientId(data.clientId);
          setRoomId(data.roomId);
          setIsHost(data.isHost);
          setLobbyPlayers(data.lobbyPlayers || []);
          setMultiplayerError(null);
          break;

        case 'members_update':
          setLobbyPlayers(data.lobbyPlayers || []);
          break;

        case 'game_started':
          isRemoteUpdateRef.current = true;
          setMySeatId(data.seatId);
          if (data.lobbyPlayers) setLobbyPlayers(data.lobbyPlayers);
          setPlayers(data.gameState.players);
          setBambooScrollNotes(data.gameState.bambooScrollNotes);
          setLogs(data.gameState.logs);
          setTimeRemaining(data.gameState.timeRemaining);
          setIsCompleted(data.gameState.isCompleted);
          setHasWon(data.gameState.hasWon);
          setTrackedBeast(data.gameState.trackedBeast || null);
          if (data.gameState.teamCheckHistory) setTeamCheckHistory(data.gameState.teamCheckHistory);
          setIsStoryModalOpen(false); // skip story screen
          setHasStarted(true);
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 100);
          break;

        case 'game_update':
          isRemoteUpdateRef.current = true;
          if (data.gameState.players) setPlayers(data.gameState.players);
          if (data.gameState.bambooScrollNotes) setBambooScrollNotes(data.gameState.bambooScrollNotes);
          if (data.gameState.logs) setLogs(data.gameState.logs);
          if (data.gameState.timeRemaining !== undefined) setTimeRemaining(data.gameState.timeRemaining);
          if (data.gameState.isCompleted !== undefined) setIsCompleted(data.gameState.isCompleted);
          if (data.gameState.hasWon !== undefined) setHasWon(data.gameState.hasWon);
          if (data.gameState.trackedBeast !== undefined) setTrackedBeast(data.gameState.trackedBeast);
          if (data.gameState.teamCheckHistory) setTeamCheckHistory(data.gameState.teamCheckHistory);
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 100);
          break;

        case 'chat_message': {
          const nowStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          const newChatLog: GameEventLog = {
            id: 'ws_chat_' + Math.random().toString(36).substring(2, 6),
            timestamp: nowStr,
            sender: data.sender,
            message: data.text,
            type: data.senderType || 'system'
          };
          setLogs(prev => [...prev, newChatLog]);
          break;
        }

        case 'host_promoted':
          setIsHost(true);
          break;

        case 'voice_signal':
          handleVoiceSignal(data.senderId, data.signal);
          break;

        case 'error':
          setMultiplayerError(data.message);
          break;
      }
    } catch (err) {
      console.error('Error parsing WS client message:', err);
    }
  }, [userName, mySeatId, handleVoiceSignal]);

  // Connect helper
  const connectToMultiplayer = (roomCode: string) => {
    if (!roomCode) {
      setMultiplayerError('请输入 4 位神坛密码（房间号）！');
      return;
    }
    const cleanId = roomCode.toUpperCase().trim();
    setMultiplayerError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setSocket(ws);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        action: 'join_room',
        roomId: cleanId,
        name: userName
      }));
    };

    ws.onmessage = handleWebSocketMessage;

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setSocket(null);
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setMultiplayerError('连接圣坛失败，请确定服务器已绑定相应WebSocket');
      setSocket(null);
    };
  };

  // Launch MP Room (Host action)
  const startMultiplayerGame = () => {
    if (!isHost || !wsRef.current) return;

    // 1. Assign random initial roles from 10 slots
    const initialPlayers = assignInitialRoles(userName);

    // 2. Map connected room players into the first slots!
    // Fill other slots as AI players
    const finalPlayers = initialPlayers.map((p, idx) => {
      const roomPl = lobbyPlayers[idx];
      if (roomPl) {
        return {
          ...p,
          name: roomPl.name,
          isUser: false // set dynamically based on client's seatId
        };
      } else {
        return {
          ...p,
          isUser: false
        };
      }
    });

    const initBones = 0;
    const initNotes = Object.fromEntries(finalPlayers.map(p => [p.id, []]));
    const nowStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const initLogs: GameEventLog[] = [
      {
        id: 'start_sys',
        timestamp: nowStr,
        sender: '系统',
        message: `【古契天启】${userName} 唤醒了圣坛契约！共有 ${lobbyPlayers.length} 位祭官真人与 ${10 - lobbyPlayers.length} 位补位上古精灵开启对决！`,
        type: 'system'
      },
      {
        id: 'start_sys_2',
        timestamp: nowStr,
        sender: '系统',
        message: '规则前置：7名好人各自绑定商周青铜圣器。好人们迷失身份。3名卧底知道彼此。',
        type: 'system'
      }
    ];

    wsRef.current.send(JSON.stringify({
      action: 'start_game',
      initialGameState: {
        players: finalPlayers,
        bambooScrollNotes: initNotes,
        logs: initLogs,
        oracleBones: initBones,
        timeRemaining: 1200,
        isCompleted: false,
        hasWon: null,
        trackedBeast: null
      }
    }));
  };

  // Lobby/game client chat message
  const sendLobbyChat = (customText?: string, senderType: string = 'system') => {
    const textToSend = customText || lobbyChatText;
    if (!textToSend.trim() || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({
      action: 'chat',
      sender: userName,
      text: textToSend,
      type: senderType
    }));

    if (!customText) {
      setLobbyChatText('');
    }
  };

  // Auto synchronization of state changes
  useEffect(() => {
    if (!isMultiplayer || isRemoteUpdateRef.current) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const syncTimer = setTimeout(() => {
      wsRef.current?.send(JSON.stringify({
        action: 'sync_game',
        gameState: {
          players,
          bambooScrollNotes,
          logs,
          timeRemaining,
          isCompleted,
          hasWon,
          trackedBeast,
          teamCheckHistory
        }
      }));
    }, 150);

    return () => clearTimeout(syncTimer);
  }, [players, bambooScrollNotes, logs, timeRemaining, isCompleted, hasWon, trackedBeast, teamCheckHistory, isMultiplayer]);

  // Auto connect when roomId parameter is present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('roomId');
    if (urlRoomId) {
      const cleanId = urlRoomId.toUpperCase().trim();
      setIsMultiplayer(true);
      setRoomInputId(cleanId);
      setInvitedRoomId(cleanId);
    }
  }, []);



  // Tracks changes in oracleBones and numPuzzlesSolved to fire rich, highly polished progress notifications
  const prevOracleBonesRef = useRef<number>(oracleBones);
  const prevPuzzlesSolvedRef = useRef<number>(numPuzzlesSolved);

  useEffect(() => {
    if (!hasStarted) {
      prevOracleBonesRef.current = oracleBones;
      prevPuzzlesSolvedRef.current = numPuzzlesSolved;
      return;
    }

    const boneDiff = oracleBones - prevOracleBonesRef.current;
    const puzzleDiff = numPuzzlesSolved - prevPuzzlesSolvedRef.current;

    const goodPlayers = players.filter(p => p.isGood);
    const totalGood = goodPlayers.length;
    const pairedGood = goodPlayers.filter(p => p.finalFilledBeast).length;
    const unpairedCount = totalGood - pairedGood;

    if (boneDiff > 0 || puzzleDiff > 0) {
      // Trigger a toast details
      let title = "✨ 天机微露 · 本源归正";
      let description = "";

      if (puzzleDiff > 0 && boneDiff > 0) {
        description = `成功破译拆字法印，唤醒太古灵气！获得 1 枚「卜兆甲骨」(当前共持有 ${oracleBones} 枚)！`;
      } else if (puzzleDiff > 0) {
        description = `字谜玄机完美破解！解谶太古神言数已达 ${numPuzzlesSolved} 次！`;
      } else if (boneDiff > 0) {
        description = `神意降临！成功收集 1 枚「卜兆甲骨」(当前共持有 ${oracleBones} 枚)！`;
      }

      const id = `${Date.now()}-${Math.random()}`;
      const nowStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });

      setProgressToasts(prev => [
        ...prev,
        {
          id,
          title,
          description,
          oracleBones,
          unpairedCount,
          totalGood,
          solvedCount: numPuzzlesSolved,
          showTime: nowStr
        }
      ]);

      // Automatically dismiss this toast after 5 seconds
      setTimeout(() => {
        setProgressToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    }

    prevOracleBonesRef.current = oracleBones;
    prevPuzzlesSolvedRef.current = numPuzzlesSolved;
  }, [oracleBones, numPuzzlesSolved, hasStarted, players]);

  // Countdown timer clock
  useEffect(() => {
    if (!hasStarted || isCompleted) return;
    if (isMultiplayer && !isHost) return; // Keep countdown authoritative to host only!
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === 601) {
          addLog('系统', '【阶段转换】前十分钟「猜谜解谶」阶段顺利终结！神意信封不再刷新产出。当前正式入驻「后十分钟印章验证与组队考核」求索阶段！「神秘阁.印章」门扉与「组队核.研契」祭台已经全面解锁重放，请速速探查真隐藏法身！', 'system');
        }
        if (prev <= 1) {
          clearInterval(interval);
          addLog('系统', '【天命降临】整整 20 分钟（10分钟猜谜 + 10分钟验证）神龙大阵终极时辰宣告届满！所有印章与组队核验手段皆尽化为冰封，「终极验证合验台」已彻底复苏。胜败在此一举，好人们请登上大合验台并完成对全体十格神位配比最终大献祭！', 'system');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, isCompleted, isMultiplayer, isHost]);

  // Start a fresh Game
  const startNewGame = () => {
    // Generate fresh role cards
    const initialPlayers = assignInitialRoles(userName);
    setPlayers(initialPlayers);
    
    // Set bone counts and reset timers
    setIsAltarActivated(false);
    setTimeRemaining(1200);
    setIsCompleted(false);
    setHasWon(null);
    setPickedPuzzle(null);
    setChestState('closed');
    setDictionaryPageResult(null);
    setDictionaryQuery('');
    setHasCollectedBone(false);
    setNumPuzzlesSolved(0);
    setVerificationFeedback(null);
    setTeamCheckHistory([]);
    setNewCoverChatText('');
    setRevealAllIdentities(false);
    setAssassinationResult(null);
    setBambooScrollNotes(
      Object.fromEntries(initialPlayers.map(p => [p.id, []]))
    );

    // Initial logs
    const nowStr = "20:00";
    const initialLogs: GameEventLog[] = [
      {
        id: 'start_sys',
        timestamp: nowStr,
        sender: '系统',
        message: `殷商神坛大门洞开，${userName} 与其他 9 位商周豪杰齐入圣坛！20分钟神运契约限时已启动（前10分钟猜谜阶段，后10分钟叩探核验阶段，到期方能登上终极合验台判定胜负）！`,
        type: 'system'
      },
      {
        id: 'start_sys_2',
        timestamp: nowStr,
        sender: '系统',
        message: '规则前置：7名好人各自绑定商周青铜圣器。好人们迷失身份。3名卧底知道彼此。',
        type: 'system'
      }
    ];

    const userSelf = initialPlayers[0];
    if (!userSelf.isGood) {
      const undercovers = initialPlayers.filter(p => !p.isGood).map(p => p.name).join('、');
      initialLogs.push({
        id: 'start_secret_reveal',
        timestamp: nowStr,
        sender: '文创魔灵',
        message: `【卧底互知】你隶属于「文创精灵」卧底阵营！你的卧底队友是：${undercovers}。齐心协力把所有人踢出圣坛吧！`,
        type: 'undercover'
      });
    } else {
      initialLogs.push({
        id: 'start_good_reveal',
        timestamp: nowStr,
        sender: '内心独白',
        message: '“大风起兮，我似乎是一尊散落的圣灵。我需要找到真正的兄弟，将神兽法身各归其位...”',
        type: 'good'
      });
    }

    setLogs(initialLogs);
    setHasStarted(true);
    setActiveTab('map');
    handlePlayDrum();
  };

  // Countdown timer clock
  useEffect(() => {
    return; // Redundant timer deactivated to resolve desyncs
    if (!hasStarted || isCompleted) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === 601) {
          addLog('系统', '【阶段转换】前十分钟「猜谜解谶」阶段顺利终结！神意信封不再刷新产出。当前正式入驻「后十分钟印章验证与组队考核」求索阶段！「神秘阁.印章」门扉与「组队核.研契」祭台已经全面解锁重放，请速速探查真隐藏法身！', 'system');
        }
        if (prev <= 1) {
          clearInterval(interval);
          addLog('系统', '【天命降临】整整 20 分钟（10分钟猜谜 + 10分钟验证）神龙大阵终极时辰宣告届满！所有印章与组队核验手段皆尽化为冰封，「终极验证合验台」已彻底复苏。胜败在此一举，好人们请登上大合验台并完成对全体十格神位的配比最终大献祭！', 'system');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, isCompleted]);

  // Trigger transition or auto-deduction when time ends (timeRemaining === 0)
  useEffect(() => {
    if (!hasStarted || isCompleted) return;
    if (timeRemaining === 0) {
      if (localPlayer?.isGood) {
        // Protagonist is a good guy: force transition to final verification tab
        setActiveTab('final');
        addLog('系统', '【大合验启】20分钟时辰已毕！你作为商周大祭司（好人守护），古朴的「终极验证合验台」已在祭坛中央拔地而起。现在请你亲手为所有十格名位神图分分归正，确认献祭判定乾坤！', 'system');
      } else {
        // Protagonist is an undercover spy: auto deduction & end game!
        handleUndercoverAutoVerification();
      }
    }
  }, [timeRemaining, hasStarted, isCompleted, localPlayer]);

  // Shang Zhou News ticker update effect (Every 8 seconds dynamic logically vague updates)
  useEffect(() => {
    if (!hasStarted || isCompleted) return;
    if (timeRemaining % 8 === 0) {
      const newsPool = getShangZhouNews(players, bambooScrollNotes, oracleBones);
      const randomNews = newsPool[Math.floor(Math.random() * newsPool.length)];
      setShangZhouNews(randomNews);
    }
  }, [timeRemaining, hasStarted, isCompleted, players, bambooScrollNotes, oracleBones]);

  // Periodic simulated AI moves (every 22 seconds, a bot automatically makes a deduction or puzzle step)
  useEffect(() => {
    if (!hasStarted || isCompleted) return;

    const interval = setInterval(() => {
      executeOneRandomAIMove();
    }, 22000);

    return () => clearInterval(interval);
  }, [hasStarted, players, isCompleted, oracleBones]);

  const addLog = (sender: string, message: string, type: GameEventLog['type']) => {
    const min = Math.floor(timeRemaining / 60);
    const sec = timeRemaining % 60;
    const timeStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    
    setLogs(prev => [
      ...prev,
      {
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: timeStr,
        sender,
        message,
        type
      }
    ]);
  };

  // Formats time
  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Helper render function for stunning symmetrical neon line-art of beasts
  const renderBeastNeonIllustration = (beast: BeastType | 'unknown' | 'eliminated', isSelected?: boolean) => {
    const flashClass = isSelected ? 'totem-selected-flash' : '';
    if (beast === '猫头鹰') {
      return (
        <svg viewBox="0 0 100 100" className={`w-16 h-16 mx-auto text-yellow-400 bronze-svg-container ${flashClass}`}>
          <circle cx="35" cy="40" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" className="bronze-path-animate" />
          <circle cx="35" cy="40" r="5" fill="currentColor" className="bronze-fill-animate" />
          <circle cx="65" cy="40" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" className="bronze-path-animate delay-100" />
          <circle cx="65" cy="40" r="5" fill="currentColor" className="bronze-fill-animate delay-100" />
          <path d="M20,25 Q35,32 50,22 Q65,32 80,25" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="bronze-path-animate delay-200" />
          <polygon points="50,42 45,52 55,52" fill="currentColor" className="bronze-fill-animate delay-300" />
          <path d="M35,62 Q50,70 65,62" fill="none" stroke="currentColor" strokeWidth="1.5" className="bronze-path-animate delay-200" />
          <path d="M40,68 Q50,74 60,68" fill="none" stroke="currentColor" strokeWidth="1.5" className="bronze-path-animate delay-300" />
          <path d="M15,40 C10,60 20,80 30,85" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-400" />
          <path d="M85,40 C90,60 80,80 70,85" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-400" />
          <path d="M50,56 L50,88 M42,80 L50,88 L58,80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="bronze-path-animate delay-500" />
        </svg>
      );
    }
    if (beast === '龟') {
      return (
        <svg viewBox="0 0 100 100" className={`w-16 h-16 mx-auto text-teal-400 bronze-svg-container ${flashClass}`}>
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2.5" className="bronze-path-animate" />
          <polygon points="50,25 65,34 65,51 50,60 35,51 35,34" fill="none" stroke="currentColor" strokeWidth="1.5" className="bronze-path-animate delay-100" />
          <polygon points="50,60 65,69 65,80 50,88 35,80 35,69" fill="none" stroke="currentColor" strokeWidth="1.5" className="bronze-path-animate delay-200" />
          <line x1="50" y1="20" x2="50" y2="80" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-300" />
          <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-300" />
          <path d="M50,20 Q50,10 50,5 Q48,2 50,2 Q52,2 50,5" stroke="currentColor" strokeWidth="2" fill="none" className="bronze-path-animate delay-400" />
          <path d="M26,30 Q16,20 20,16" stroke="currentColor" strokeWidth="2" fill="none" className="bronze-path-animate delay-500" />
          <path d="M74,30 Q84,20 80,16" stroke="currentColor" strokeWidth="2" fill="none" className="bronze-path-animate delay-500" />
          <path d="M26,70 Q16,80 20,84" stroke="currentColor" strokeWidth="2" fill="none" className="bronze-path-animate delay-500" />
          <path d="M74,70 Q84,80 80,84" stroke="currentColor" strokeWidth="2" fill="none" className="bronze-path-animate delay-500" />
        </svg>
      );
    }
    if (beast === '羊') {
      return (
        <svg viewBox="0 0 100 100" className={`w-16 h-16 mx-auto text-amber-550 bronze-svg-container ${flashClass}`}>
          <path d="M25,35 C15,20 30,10 40,25 C45,32 35,40 30,35" fill="none" stroke="currentColor" strokeWidth="2.5" className="bronze-path-animate" />
          <path d="M75,35 C85,20 70,10 60,25 C55,32 65,40 70,35" fill="none" stroke="currentColor" strokeWidth="2.5" className="bronze-path-animate delay-100" />
          <polygon points="50,20 30,45 70,45" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-200" />
          <path d="M30,45 L50,85 L70,45" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-300" />
          <circle cx="40" cy="42" r="3" fill="currentColor" className="bronze-fill-animate delay-400" />
          <circle cx="60" cy="42" r="3" fill="currentColor" className="bronze-fill-animate delay-400" />
          <line x1="50" y1="40" x2="50" y2="75" stroke="currentColor" strokeWidth="1.5" className="bronze-path-animate delay-300" />
          <line x1="45" y1="75" x2="55" y2="75" stroke="currentColor" strokeWidth="1.5" className="bronze-path-animate delay-400" />
          <path d="M15,85 L85,85 M25,90 L75,90" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="bronze-path-animate delay-500" />
        </svg>
      );
    }
    if (beast === '牛') {
      return (
        <svg viewBox="0 0 100 100" className={`w-16 h-16 mx-auto text-emerald-400 bronze-svg-container ${flashClass}`}>
          <path d="M25,25 C10,15 25,50 35,45" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="bronze-path-animate" />
          <path d="M75,25 C90,15 75,50 65,45" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="bronze-path-animate delay-100" />
          <path d="M30,35 L70,35 L62,75 L50,85 L38,75 Z" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-200" />
          <circle cx="50" cy="65" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" className="bronze-path-animate delay-300" />
          <circle cx="46" cy="60" r="2" fill="currentColor" className="bronze-fill-animate delay-400" />
          <circle cx="54" cy="60" r="2" fill="currentColor" className="bronze-fill-animate delay-400" />
          <line x1="36" y1="45" x2="44" y2="50" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-300" />
          <line x1="64" y1="45" x2="56" y2="50" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-300" />
          <circle cx="40" cy="49" r="2" fill="currentColor" className="bronze-fill-animate delay-400" />
          <circle cx="60" cy="49" r="2" fill="currentColor" className="bronze-fill-animate delay-400" />
        </svg>
      );
    }
    if (beast === '猪') {
      return (
        <svg viewBox="0 0 100 100" className={`w-16 h-16 mx-auto text-orange-400 bronze-svg-container ${flashClass}`}>
          <ellipse cx="50" cy="50" rx="26" ry="24" fill="none" stroke="currentColor" strokeWidth="2.5" className="bronze-path-animate" />
          <path d="M27,33 C18,20 30,15 35,27" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-100" />
          <path d="M73,33 C82,20 70,15 65,27" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-100" />
          <ellipse cx="50" cy="56" rx="12" ry="7" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-200" />
          <circle cx="46" cy="56" r="2.5" fill="currentColor" className="bronze-fill-animate delay-300" />
          <circle cx="54" cy="56" r="2.5" fill="currentColor" className="bronze-fill-animate delay-300" />
          <polygon points="36,65 32,58 38,58" fill="currentColor" className="bronze-fill-animate delay-400" />
          <polygon points="64,65 68,58 62,58" fill="currentColor" className="bronze-fill-animate delay-400" />
          <circle cx="38" cy="44" r="3" fill="currentColor" className="bronze-fill-animate delay-350" />
          <circle cx="62" cy="44" r="3" fill="currentColor" className="bronze-fill-animate delay-350" />
        </svg>
      );
    }
    if (beast === '虎') {
      return (
        <svg viewBox="0 0 100 100" className={`w-16 h-16 mx-auto text-red-500 bronze-svg-container ${flashClass}`}>
          <path d="M25,35 L35,25 L65,25 L75,35 L70,75 L50,85 L30,75 Z" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate" />
          <path d="M20,25 Q15,10 30,18" fill="none" stroke="currentColor" strokeWidth="2.5" className="bronze-path-animate delay-100" />
          <path d="M80,25 Q85,10 70,18" fill="none" stroke="currentColor" strokeWidth="2.5" className="bronze-path-animate delay-100" />
          <path d="M42,32 L58,32 M42,40 L58,40 M42,48 L58,48 M50,30 L50,50" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-200" />
          <path d="M35,62 L40,56 L45,62 M65,62 L60,56 L55,62" stroke="currentColor" strokeWidth="2" fill="none" className="bronze-path-animate delay-300" />
          <circle cx="38" cy="46" r="3" fill="currentColor" className="bronze-fill-animate delay-400" />
          <circle cx="62" cy="46" r="3" fill="currentColor" className="bronze-fill-animate delay-400" />
          <path d="M32,44 C34,42 42,44 42,44" stroke="currentColor" strokeWidth="2.5" fill="none" className="bronze-path-animate delay-300" />
          <path d="M68,44 C66,42 58,44 58,44" stroke="currentColor" strokeWidth="2.5" fill="none" className="bronze-path-animate delay-300" />
        </svg>
      );
    }
    if (beast === 'eliminated') {
      return (
        <svg viewBox="0 0 100 100" className={`w-16 h-16 mx-auto text-rose-600/80 bronze-svg-container animate-pulse ${flashClass}`}>
          <path d="M30,35 C30,20 70,20 70,35 C70,55 60,65 58,75 L42,75 C40,65 30,55 30,35 Z" fill="none" stroke="currentColor" strokeWidth="2.5" className="bronze-path-animate" />
          <ellipse cx="42" cy="45" rx="5" ry="7" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-100" />
          <ellipse cx="58" cy="45" rx="5" ry="7" fill="none" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-100" />
          <path d="M46,65 L54,65 L50,57 Z" fill="currentColor" className="bronze-fill-animate delay-200" />
          <line x1="45" y1="72" x2="45" y2="78" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-300" />
          <line x1="50" y1="72" x2="50" y2="78" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-300" />
          <line x1="55" y1="72" x2="55" y2="78" stroke="currentColor" strokeWidth="2" className="bronze-path-animate delay-300" />
        </svg>
      );
    }
    // Unknown default (mysterious sparkles)
    return (
      <svg viewBox="0 0 100 100" className={`w-16 h-16 mx-auto text-stone-605/75 bronze-svg-container animate-pulse ${flashClass}`}>
        <path d="M35,35 Q50,15 65,30 Q65,45 50,50 L50,65" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" className="bronze-path-animate" />
        <circle cx="50" cy="78" r="4.5" fill="currentColor" className="bronze-fill-animate delay-200" />
      </svg>
    );
  };

  // Triggering the Word Puzzle letter pickup
  const handlePickupEnvelope = () => {
    if (timeRemaining <= 600) {
      alert("⚠️ 【猜谜阶段已结束】解谶拆字字谜的 10 分钟已届满！当前处于第二阶段的「印章验证与组队考核（倒计时间少于 10:00）」，旧谜已经封存，新法印不复刷新。请尽管前往进行神秘阁印记探测和三人队形验证！");
      return;
    }
    
    // Select random puzzle from 100 library
    const randIdx = Math.floor(Math.random() * CHINESE_WORD_PUZZLES.length);
    const puzzle = CHINESE_WORD_PUZZLES[randIdx];
    
    setPickedPuzzle(puzzle);
    setDictionaryQuery('');
    setDictionaryPageResult(null);
    setChestInputCode('');
    setChestState('closed');
    setHasCollectedBone(false);
    
    handlePlayWhoosh();
    addLog('系统', `主通道显现一个青绿色竹简书卷信封 [编号 #${puzzle.id}]！点击开始破解拆字法印！`, 'system');
  };

  // Search guessed word in Xinhua standard dictionary
  const handleSearchDictionary = () => {
    if (!pickedPuzzle) return;
    if (!dictionaryQuery.trim()) {
      alert("请输入你的谜底汉字拼版！");
      return;
    }

    setIsDictionaryFlipping(true);
    handlePlayCrack(); // simulated paper shuffling

    setTimeout(() => {
      setIsDictionaryFlipping(false);
      // Check query matches standard Xinhua page mapping from database
      const userGuess = dictionaryQuery.trim();
      const lookResult = CHINESE_WORD_PUZZLES.find(p => p.answer === userGuess);

      if (lookResult) {
        setDictionaryPageResult(lookResult.page);
        // Hint standard book opening sound / bell
        handlePlayBell(660);
      } else {
        // Fallback: generate pseudorandom page if they put something weird,
        // but it won't correct unlock unless it is exact
        const hash = userGuess.charCodeAt(0) % 550 + 10;
        setDictionaryPageResult(hash);
      }
    }, 1200);
  };

  // Unlock bronze treasure chest with page number code
  const handleUnlockChest = () => {
    if (!pickedPuzzle) return;
    const cleanIn = chestInputCode.trim();

    if (!cleanIn) {
      alert("请输入宝箱上的标准锁孔编号（即新华字典标准页码）！");
      return;
    }

    if (parseInt(cleanIn) === pickedPuzzle.page) {
      // Success! Lock burst animation
      setChestState('success');
      setIsAltarActivated(true);
      setNumPuzzlesSolved(prev => prev + 1);
      
      // Auto-collect bone immediately to guarantee accuracy - no click required!
      setPlayers(prev => {
        const targetId = selectLocalPlayerId(prev);
        return prev.map((p) => {
          if (p.id === targetId) return { ...p, oracleBones: p.oracleBones + 1 };
          return p;
        });
      });
      setHasCollectedBone(true);

      handlePlayBell(440);
      handlePlayBell(880);
      handlePlayBell(1200);
      addLog('系统', `恭喜！输入解密页码 ${cleanIn} [正确]：古铜锁迸裂，宝箱向两侧缓缓展开，1 枚温润的「卜兆甲骨」已自动存入行囊！并且唤醒并激活了殷商祭坛！`, 'system');
    } else {
      // Failed - box stays closed and envelope burns out
      setChestState('fail');
      handlePlaySizzle();
      addLog('系统', `解密页码 ${cleanIn} [错误]：宝箱锁芯震抖，升起一阵青烟，本次解谜作废已销毁。`, 'system');
    }
  };

  // User clicks floating bone to put into bag
  const handleCollectFloatingBone = () => {
    if (hasCollectedBone || chestState !== 'success') return;
    
    setPlayers(prev => {
      const targetId = selectLocalPlayerId(prev);
      return prev.map((p) => {
        if (p.id === targetId) return { ...p, oracleBones: p.oracleBones + 1 };
        return p;
      });
    });
    setIsAltarActivated(true);
    setHasCollectedBone(true);
    addLog('系统', `获得核心道具：手掌拂过，收集 1 枚温润的「卜兆甲骨」并放入自己行囊中！`, 'system');
    handlePlayBell(1200);
  };

  // Good User enters sacred chamber (Exactly once)
  const handleUserGoodEnterChamber = () => {
    const userSelf = localPlayer || players[0];
    if (userSelf.hasEnteredChamber) {
      alert("神兽雕像双目紧闭：好人精灵一生仅可接受一次密室洗礼，你已经进入过此处！");
      return;
    }

    handlePlaySizzle();
    
    // Spits out the 3 pre-generated option candidates
    setChamberResultOptions(userSelf.candidateOptions);
    
    // Set player marker entered
    setPlayers(prev => prev.map((p) => {
      if (p.id === userSelf.id) return { ...p, hasEnteredChamber: true };
      return p;
    }));

    addLog('神兽雕像 (温和)', `“贞人啊，你拂去神象上的铜绿，法力回荡，你真实的守护法身为以下三者之一：【${userSelf.candidateOptions.join('、')}】。”`, 'totem_good');
    setShangZhouNews(`【契典传薪】：大祭司【${userSelf.name}】（你）登入神灵密室叩问，获取了 3 选 1 真灵印章候选！`);
  };

  // Undercover User inquiries totem regarding target Good playercandidate beasts
  const handleUserUndercoverInquireChamber = () => {
    const userSelf = localPlayer || players[0];
    if (userSelf.isGood) return;

    if (userSelf.hasEnteredChamber) {
      alert("神兽雕像双目紧闭：卧底精灵一生也仅可入密室探查一次，你已经进入过此处！");
      return;
    }

    const target = players.find(p => p.id === selectedChamberTargetId);
    if (!target) return;

    if (!target.isGood) {
      alert("不可探查卧底队友！神兽冷峻的火焰照在干枯的器皿上，泛出青泥。");
      return;
    }

    if (target.isEliminated) {
      alert("此目标精灵已被淘汰旁观！");
      return;
    }

    handlePlayBell(200);
    setChamberResultOptions(target.candidateOptions);

    // Set player marker entered
    setPlayers(prev => prev.map((p) => {
      if (p.id === userSelf.id) return { ...p, hasEnteredChamber: true };
      return p;
    }));

    addLog('神兽雕像 (冷峻)', `“文创窥探者，黑水滴落。你的唯一一次密室探查完成──你挑选的目标：${target.name} 对应的守护图腾已被解析为三选一：【${target.candidateOptions.join('、')}】。”`, 'totem_bad');
    setShangZhouNews(`【诡影暗探】：有无名诡雾入侵密殿扣问！ ${userSelf.name} 对 ${target.name} 完成了 3 选 1 神魂印章刺探！`);
  };

  // Undercover User attempts elimination by guessing player beast in sacred chamber
  const handleUserUndercoverEliminateGuess = () => {
    const userSelf = localPlayer || players[0];
    if (userSelf.isGood) return;

    if (!isAltarActivated) {
      alert("⚠️ 殷商祭坛尚未激活！你必须在「解谶法印」面板成功破解至少 1 个汉字拆字谜并起出甲骨，才能唤醒神兽法术进行淘汰验证！");
      return;
    }

    const target = players.find(p => p.id === chamberEliminateTargetId);
    if (!target) return;

    if (target.isEliminated) {
      alert("该目标玩家已经被淘汰！");
      return;
    }

    if (!target.isGood) {
      alert("不可攻击卧底队友！");
      return;
    }

    handlePlayDrum();

    if (target.beast === chamberEliminateGuessBeast) {
      // Correct! Target Good player is eliminated immediately
      setPlayers(prev => prev.map(p => {
        if (p.id === target.id) return { ...p, isEliminated: true };
        return p;
      }));
      handlePlaySizzle();
      
      addLog('系统特报', `【重大伤亡】天雷怒击！卧底 ${userSelf.name} 来无影去无踪（暗杀不消耗甲骨），准确戳破了 ${target.name} 的神兽法身：其真实身份确是 ──【${chamberEliminateGuessBeast}（对应${getVesselByBeast(chamberEliminateGuessBeast)}）】！${target.name} 被淘汰出局！`, 'system');
      setShangZhouNews(`【大荒之痛】：守护之星【${target.name}】（ID: #${target.id}）被破译真身，惨遭神雷天谴，已陨落淘汰！其真身法宝为【${chamberEliminateGuessBeast}】！`);
      
      setAssassinationResult({
        show: true,
        killerName: userSelf.name,
        targetName: target.name,
        targetId: target.id,
        guessedBeast: chamberEliminateGuessBeast,
        isSuccess: true,
        realBeast: target.beast,
      });
    } else {
      // Wrong guess
      addLog('神兽雕像 (冷峻)', `【诅咒落空】密室迷雾翻腾，由于猜测失准，你的淘汰暗杀由于灵力不匹配失败了！${target.name} 并非【${chamberEliminateGuessBeast}】。卧底行动不消耗甲骨。`, 'totem_bad');
      
      setAssassinationResult({
        show: true,
        killerName: userSelf.name,
        targetName: target.name,
        targetId: target.id,
        guessedBeast: chamberEliminateGuessBeast,
        isSuccess: false,
        realBeast: target.beast,
      });
    }
  };

  // Execute Three Player Core team check
  const handleExecuteTeamCheck = () => {
    if (!isAltarActivated) {
      alert("⚠️ 殷商祭坛尚未激活！你必须在「解谶法印」面板成功破解至少 1 个汉字拆字谜并起出甲骨，以灵气唤醒圣坛后，才能开始发起三人行身份校验！");
      return;
    }

    if (oracleBones < 1) {
      alert("你的甲骨数量不足以发起组队核验！请去解谜字谜获取甲骨。");
      return;
    }

    if (checkedPlayer1 === checkedPlayer2 || checkedPlayer1 === checkedPlayer3 || checkedPlayer2 === checkedPlayer3) {
      alert("组队必须选择 3 位不同的不重复玩家！");
      return;
    }

    const p1 = players.find(p => p.id === checkedPlayer1);
    const p2 = players.find(p => p.id === checkedPlayer2);
    const p3 = players.find(p => p.id === checkedPlayer3);

    if (!p1 || !p2 || !p3) return;

    if (p1.isEliminated || p2.isEliminated || p3.isEliminated) {
      alert("队伍中选了已被淘汰的精灵，请重新选择存活精灵组队！");
      return;
    }

    // Deduct 1 bone
    setPlayers(prev => {
      const targetId = selectLocalPlayerId(prev);
      return prev.map((p) => {
        if (p.id === targetId) return { ...p, oracleBones: Math.max(0, p.oracleBones - 1) };
        return p;
      });
    });
    handlePlayCrack();

    const team = [p1, p2, p3];
    const presence = checkTeamPresence(team, checkedBeast);

    setVerificationFeedback({
      show: true,
      hasBeast: presence,
      teamNames: [p1.name, p2.name, p3.name],
      beast: checkedBeast
    });

    setTeamCheckHistory(prev => [
      ...prev,
      {
        playerIds: [p1.id, p2.id, p3.id],
        beast: checkedBeast,
        hasBeast: presence
      }
    ]);

    addLog('神坛系统', `【三人行校验】消耗 1 甲骨，调查队伍：${p1.name}、${p2.name}、${p3.name}中是否含有【${checkedBeast}】。核验回响：【${presence ? '有' : '无'}】该动物。`, 'system');
    setShangZhouNews(`【三人大合】：你引导 ${p1.name}、${p2.name} 与 ${p3.name} 开展上古印章联合核验（排查 ${checkedBeast}）。回响之光发出警告：【${presence ? '真印显赫 (有)' : '迷蒙无感 (无)'}】！`);
  };

  // Final submit state trigger
  const handleFinalVerifySubmission = () => {
    // SECURITY GUARD: Undercover player cannot activate ultimate verification!
    if (localPlayer && !localPlayer.isGood) {
      addLog('神坛系统', '【神坛御令】非青铜守护精灵（卧底）无法启动终极乾坤大合验！', 'system');
      return;
    }

    // Check survivors count
    const livingGoods = players.filter(p => p.isGood && !p.isEliminated);
    const livingBads = players.filter(p => !p.isGood && !p.isEliminated);
    const totalGood = players.filter(p => p.isGood).length;

    // Rule updated: 好人被淘汰不影响胜利！只要最后填报的所有好人神兽身份判定全部正确即可。

    // Check if any bad players mixed in the altar list?
    // In ultimate verification, any undercover active or filled is incorrect as we require "全员集齐线索精准填报自身神兽"
    // Let's check each of the 7 good players and their final Filled choice
    let hasMistake = false;
    
    players.forEach(p => {
      if (p.isGood) {
        // If they left it blank or guessed wrong
        if (p.finalFilledBeast !== p.beast) {
          hasMistake = true;
        }
      }
    });

    if (hasMistake) {
      setHasWon(false);
      setIsCompleted(true);
      handlePlayDefeat();
    } else {
      setHasWon(true);
      setIsCompleted(true);
      handlePlayVictory();
    }
  };

  const handlePlayVictory = () => {
    if (!muetAudio) GlobalAudio.playVictoryCeremony();
  };

  const handlePlayDefeat = () => {
    if (!muetAudio) GlobalAudio.playDefeatCeremony();
  };

  // Automated deduction and verification when a spy/undercover protagonist's game concludes at 20 min limit
  const handleUndercoverAutoVerification = () => {
    addLog('神龙起驾', '🔮【天命契约自检】20分钟时辰已毕！由于你是【文创卧底】，至高法天大合验开启。系统现在代替神坛图腾，自动聚合全场所有线索和已知推断进行大合验判定！', 'system');

    const updatedPlayers = players.map(p => {
      if (!p.isGood) return p;

      const candidates = p.candidateOptions && p.candidateOptions.length > 0
        ? p.candidateOptions
        : (['龟', '羊', '牛', '猫头鹰', '猪', '虎'] as BeastType[]);

      let successProb = 0.34;
      if (numPuzzlesSolved >= 3) successProb += 0.25;
      else if (numPuzzlesSolved >= 1) successProb += 0.15;

      const hasTeamCheck = teamCheckHistory.some(h => h.playerIds.includes(p.id));
      if (hasTeamCheck) successProb += 0.35;

      if (p.hasEnteredChamber) successProb += 0.15;

      successProb = Math.min(0.95, Math.max(0.1, successProb));

      const isSuccess = Math.random() < successProb;
      let deduced: BeastType;
      if (isSuccess && p.beast) {
        deduced = p.beast;
      } else {
        const wrongCandidates = candidates.filter(c => c !== p.beast);
        if (wrongCandidates.length > 0) {
          deduced = wrongCandidates[Math.floor(Math.random() * wrongCandidates.length)];
        } else {
          const wrongAll = (['龟', '羊', '牛', '猫头鹰', '猪', '虎'] as BeastType[]).filter(c => c !== p.beast);
          deduced = wrongAll[Math.floor(Math.random() * wrongAll.length)];
        }
      }

      return { ...p, finalFilledBeast: deduced };
    });

    let correctCount = 0;
    let totalGood = 0;

    updatedPlayers.forEach(p => {
      if (p.isGood) {
        totalGood++;
        const isCorrect = p.finalFilledBeast === p.beast;
        if (isCorrect) correctCount++;

        const candidateStr = p.candidateOptions && p.candidateOptions.length > 0
          ? p.candidateOptions.join('、')
          : '未探明';

        addLog(
          '契约天鉴',
          `🔍 洞悉精灵【${p.name}】（名位 ID: #${p.id}）：探得候选为 [${candidateStr}]。系统占卜推断其真正的法身图腾为【${p.finalFilledBeast}】（实际为【${p.beast}】）。结果：【${isCorrect ? '契合正确 ✓' : '对位差错 ✗'}】。`,
          isCorrect ? 'system' : 'undercover'
        );
      }
    });

    const finalWon = correctCount === totalGood;

    setPlayers(updatedPlayers);
    setHasWon(finalWon);
    setIsCompleted(true);

    if (finalWon) {
      addLog('大荒结局', `🏆 【大吉 · 乾坤安定】大祭司图腾大盘查圆满！系统汇总判断十格名位全部精准！${correctCount}/${totalGood} 正确，青铜神兽光华万丈，文创卧底篡天终告破产！`, 'system');
      if (!muetAudio) GlobalAudio.playVictoryCeremony();
    } else {
      addLog('大荒结局', `💀 【大凶 · 社稷蒙尘】大盘查汇总推论出现漏洞（只有 ${correctCount}/${totalGood} 人名位得到完美拨正，存在对位错漏）！太荒重炉崩碎，文创卧底篡位大捷！`, 'undercover');
      if (!muetAudio) GlobalAudio.playDefeatCeremony();
    }
  };

  // Run AI simulation single turn manually or on ticker
  const executeOneRandomAIMove = () => {
    if (isCompleted || !hasStarted) return;

    // Find all living bots (excluding user player 1)
    const activeBots = players.filter(p => !p.isUser && !p.isEliminated);
    if (activeBots.length === 0) return;

    // Pick a random bot
    const bot = activeBots[Math.floor(Math.random() * activeBots.length)];

    if (bot.isGood) {
      // Good bot behavior
      if (timeRemaining > 600) {
        // Only puzzle solving and chatting are allowed!
        const coin = Math.random();
        if (coin < 0.6) {
          setPlayers(prev => prev.map(p => p.id === bot.id ? { ...p, oracleBones: p.oracleBones + 1 } : p));
          addLog(bot.name, `在游廊深处捡到了一个古简，翻阅新华词典释读了拆字字谜，为自己斩获了 1 枚「甲骨」！`, 'good');
          handlePlayBell(520);
        } else {
          const phrases = [
            "各位贞人，我们要多破解信封字谜，甲骨消耗很快！",
            `千万不要把【${twinBeast}】的双生子搞错了，核验时有两个【${twinBeast}】存在！`,
            "大家抓紧时间把字谜做起来，首个 10 分钟倒计时一完（计时器少于 10:00）就可以去神秘阁验证啦。"
          ];
          addLog(bot.name, phrases[Math.floor(Math.random() * phrases.length)], 'chat');
        }
      } else {
        // timeRemaining === 0 -> Mystery Chamber & Team actions are open
        const coin = Math.random();
        if (!bot.hasEnteredChamber) {
          // Enter secret chamber first (STAMP VERIFICATION)
          setPlayers(prev => prev.map(p => {
            if (p.id === bot.id) {
              return { ...p, hasEnteredChamber: true };
            }
            return p;
          }));
          addLog(bot.name, `进入神兽密室拜问了雕像，拿到了自己的3选1法身候选，并完成了印章验证，记录入了自己的竹简日志里。`, 'good');
          setShangZhouNews(`【契典传薪】：守护精灵【${bot.name}】进入神秘古室叩问雕像，获取了 3 选 1 神印候选！`);
        } else if (coin < 0.65 && bot.oracleBones >= 1 && isAltarActivated) {
          // Starts team verification (only AFTER entering chamber)!
          const otherSurvivors = players.filter(p => p.id !== bot.id && !p.isEliminated);
          if (otherSurvivors.length >= 2) {
            const s1 = otherSurvivors[0];
            const s2 = otherSurvivors[1];
            const queryBeasts: BeastType[] = ['龟', '羊', '牛', '猫头鹰', '猪', '虎'];
            const qBeast = queryBeasts[Math.floor(Math.random() * queryBeasts.length)];
            
            setPlayers(prev => prev.map(p => p.id === bot.id ? { ...p, oracleBones: p.oracleBones - 1 } : p));
            const hasIt = checkTeamPresence([bot, s1, s2], qBeast);

            setTeamCheckHistory(prev => [
              ...prev,
              {
                playerIds: [bot.id, s1.id, s2.id],
                beast: qBeast,
                hasBeast: hasIt
              }
            ]);
            
            addLog(bot.name, `发起了三人行核验关系（耗费自持1甲骨）：我、${s1.name}与${s2.name}这一队3人中是否含神兽【${qBeast}】？印章鸣响：【${hasIt ? '有' : '无'}】。`, 'good');
            handlePlayCrack();
            setShangZhouNews(`【三人大合】：${bot.name} 引领 ${s1.name} 与 ${s2.name} 进行三人行印章校验（调查 ${qBeast} 契誓）。吉凶音律回响：【${hasIt ? '印信交辉 (有)' : '阒无回应 (无)'}】！`);
          }
        } else {
          const phrases = [
            "我刚才做完印章验证了！你们做完了吗？",
            "大家可以看下我的竹简记录，我已经印章校验完毕了。",
            "卧底还在暗算我们，大家抓紧时间把自己在终极验证台的图腾填填看。"
          ];
          addLog(bot.name, phrases[Math.floor(Math.random() * phrases.length)], 'chat');
        }
      }
    } else {
      // Undercover bot behavior (文创卧底)
      if (timeRemaining > 600) {
        // Can post private undercover chats or public fake chats
        const privatePhrases = [
          `嘘！好人们正在卖力解字谜为我们打工呢。`,
          "等首个 10 分钟倒计时一罢，咱们就可以去密室印章套他们的话了！",
          "我们要把错误的信息发上公频，干扰他们的验证判断！"
        ];
        const pMsg = privatePhrases[Math.floor(Math.random() * privatePhrases.length)];
        setPrivateUndercoverMessages(prev => [...prev, `${bot.name}悄悄说：${pMsg}`]);

        const publicLies = [
          "这谜题字义很简单，字典查到页码后抓紧去开箱，我多跑两圈神道探探信封。",
          "我也在收集甲骨，大家加油解出真页码！"
        ];
        addLog(bot.name, `(公共发言)：“${publicLies[Math.floor(Math.random() * publicLies.length)]}”`, 'chat');
      } else {
        // After timeRemaining <= 600, Undercover bot can probe or guess kill!
        const coin = Math.random();
        if (!bot.hasEnteredChamber) {
          // Must probe (stamp verification) first!
          const livingGoods = players.filter(p => p.isGood && !p.isEliminated);
          if (livingGoods.length > 0) {
            const target = livingGoods[Math.floor(Math.random() * livingGoods.length)];
            setPlayers(prev => prev.map(p => {
              if (p.id === bot.id) {
                return { ...p, hasEnteredChamber: true };
              }
              return p;
            }));
            addLog(bot.name, `悄步穿行进入了神兽密室，神圣 Totem 吐出烟雾，完成了他的印章探测验证，暴露了 ${target.name} 的候选三兽法身！`, 'undercover');
            setPrivateUndercoverMessages(prev => [
              ...prev,
              `${bot.name}悄悄说：我已经使用我仅有的一次探查权完成印章验证，偷看到 ${target.name} 的候选三兽是：${target.candidateOptions.join('、')}！方便我们下一步精密射杀！`
            ]);
            setShangZhouNews(`【鬼祟阴影】：卧底 ${bot.name} 携密印探秘神兽密殿，私下里对 ${target.name} 的法身契合度完成了监测！`);
          }
        } else if (coin < 0.6 && isAltarActivated) {
          // Attempt a Guess & Eliminate attempt on a random living Good player
          const livingGoods = players.filter(p => p.isGood && !p.isEliminated);
          if (livingGoods.length > 0) {
            const target = livingGoods[Math.floor(Math.random() * livingGoods.length)];
            const beastsPool: BeastType[] = ['龟', '羊', '牛', '猫头鹰', '猪', '虎'];
            const isProbed = Math.random() > 0.4;
            const chosenBeast = isProbed && target.beast ? target.beast : beastsPool[Math.floor(Math.random() * beastsPool.length)];
            
            handlePlayDrum();

            if (target.beast === chosenBeast) {
              setPlayers(prev => prev.map(p => {
                if (p.id === target.id) return { ...p, isEliminated: true };
                return p;
              }));
              addLog('系统警示', `【致命袭击】天雷怒劈！卧底 ${bot.name} 暗运密法淘汰好人（暗杀不消耗甲骨），准确戳破了 ${target.name} 的真身守护 ── 其正是【${chosenBeast}】！${target.name} 被淘汰！`, 'system');
              setShangZhouNews(`【大荒之痛】：生命之灵【${target.name}】由于真实法核被卧底 ${bot.name} 精确射手刺破，于神罚雷劫中被淘汰出局！其真实法身为【${chosenBeast}】！`);
              
              setAssassinationResult({
                show: true,
                killerName: bot.name,
                targetName: target.name,
                targetId: target.id,
                guessedBeast: chosenBeast,
                isSuccess: true,
                realBeast: target.beast,
              });
            } else {
              addLog('大殿幽影', `暗室烛台闪烁，卧底 ${bot.name} 的淘汰被谜底之雾弹开，由于猜测失准失败了，且卧底淘汰并不消耗甲骨。`, 'totem_bad');
              
              setAssassinationResult({
                show: true,
                killerName: bot.name,
                targetName: target.name,
                targetId: target.id,
                guessedBeast: chosenBeast,
                isSuccess: false,
                realBeast: target.beast,
              });
            }
          }
        } else {
          const privatePhrases = [
            `我知道好人们也在暗中推演，大家别在站队填报时露出了马脚。`,
            "等他们终局校验出错时，就是我们文创魔灵夺取铜鼎的大捷！",
            "看他们解字谜真好笑，咱们多误导误导他们。"
          ];
          const pMsg = privatePhrases[Math.floor(Math.random() * privatePhrases.length)];
          setPrivateUndercoverMessages(prev => [...prev, `${bot.name}悄悄说：${pMsg}`]);
        }
      }
    }
  };

  // Add / remove stamps to bamboo scrolls for helper
  const handleToggleBambooStamp = (playerId: number, beast: BeastType) => {
    let isAdding = false;
    setBambooScrollNotes(prev => {
      const current = prev[playerId] || [];
      isAdding = !current.includes(beast);
      const updated = isAdding
        ? [...current, beast]
        : current.filter(b => b !== beast);
      return { ...prev, [playerId]: updated };
    });
    
    // Set clicked state for feedback pulse/shimmer animation
    const key = `${playerId}-${beast}`;
    setRecentlyClickedStamps(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setRecentlyClickedStamps(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }, 600);

    // Play structural sound
    handlePlayCrack();

    // Tiny physical vibration feedback on successful stamp or erase
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(isAdding ? 25 : 15);
    }

    // Broadcast stamp result to Shang Zhou News Ticker
    const actor = players.find(p => p.id === playerId);
    const actorName = actor ? actor.name : `席位 #${playerId}`;
    const stampNews = isAdding
      ? `【契印播报】：${actorName} 契书上成功加盖【${beast}】法印，神位名位已初露端倪！`
      : `【契印播报】：${actorName} 契书上的【${beast}】法印已被抹除，祭坛命格在重新对位...`;
    setShangZhouNews(stampNews);
  };

  // Automatically compile and sync all verified facts/clues into the bamboo scroll notes
  const handleAutoSyncAllVerifiedCluesToScroll = () => {
    setBambooScrollNotes(prev => {
      const next = { ...prev };
      players.forEach(p => {
        const deduction = derivedDeductions[p.id];
        if (deduction) {
          if (deduction.confirmedBeast) {
            next[p.id] = [deduction.confirmedBeast];
          } else if (deduction.chamberCandidates) {
            next[p.id] = deduction.remainingCandidates;
          } else if (deduction.allRuledOuts.length > 0) {
            const currentNotes = prev[p.id] || [];
            next[p.id] = currentNotes.filter(b => !deduction.allRuledOuts.includes(b));
          }
        }
      });
      return next;
    });
    
    handlePlayCrack();

    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate([30, 50, 30]); // double-tap vibration for heavy action
    }
    
    addLog('神卷天启', '🔮【全场真言同步】已成功聚合全场已知候选、三人行检验、淘汰排除等线索，自动洗净及刻印至竹简手记！', 'system');
  };

  // Change individual survival good player filled guess
  const handleUpdatePlayerFinalGuess = (playerId: number, beast: BeastType | null) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return { ...p, finalFilledBeast: beast };
      }
      return p;
    }));
    handlePlayWhoosh();
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between py-4 select-none relative overflow-x-hidden font-sans">
      
      {/* CUSTOM AMBIENT STYLES FOR CORE COVENANT INTERACTIONS */}
      <style>{`
        @keyframes streamGlow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-stream-glow {
          background-size: 300% 300%;
          animation: streamGlow 4s linear infinite;
        }

        @keyframes particleFloat {
          0% {
            transform: translateY(0) translateX(var(--x-offset, 0px)) scale(0.5);
            opacity: 0;
          }
          15% {
            opacity: var(--max-opacity, 0.6);
          }
          85% {
            opacity: var(--max-opacity, 0.6);
          }
          100% {
            transform: translateY(-130px) translateX(calc(var(--x-offset, 0px) + var(--drift, 10px))) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes totemRipple {
          0% {
            transform: scale(0.96);
            opacity: 0.9;
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6);
          }
          50% {
            opacity: 0.35;
            box-shadow: 0 0 0 8px rgba(245, 158, 11, 0.4);
          }
          100% {
            transform: scale(1.18);
            opacity: 0;
            box-shadow: 0 0 0 16px rgba(245, 158, 11, 0);
          }
        }
        .animate-totem-ripple {
          animation: totemRipple 1.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
      `}</style>

      {/* EXQUISITE SHANG-ZHOU ASTRO CHEMICAL PROGRESS OVERLAY FLOTATION */}
      <div id="progress-toasts-portal" className="fixed top-24 right-4 md:right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        <AnimatePresence>
          {progressToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.9, y: 10, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="pointer-events-auto bg-stone-950/95 border-2 border-amber-500/40 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.85),_0_0_20px_rgba(245,158,11,0.15)] backdrop-blur-md relative overflow-hidden flex flex-col space-y-2 max-w-[340px]"
            >
              {/* Top ambient gold accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />
              
              <div className="flex items-start space-x-3">
                <div className="p-1 px-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 mt-0.5 shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-serif font-black text-amber-300 tracking-wide">
                      {toast.title}
                    </h4>
                    <span className="text-[8px] font-mono text-stone-500 shrink-0">{toast.showTime}</span>
                  </div>
                  <p className="text-[10px] text-stone-300 mt-1 leading-relaxed">
                    {toast.description}
                  </p>
                </div>
              </div>

              {/* Real-time remaining progress dashboard info */}
              <div className="border-t border-stone-900/60 pt-2.5 mt-1 grid grid-cols-2 gap-2 text-center">
                <div className="bg-stone-900/40 border border-stone-850 p-1.5 rounded-xl flex flex-col justify-center">
                  <span className="text-[8px] text-stone-400 uppercase tracking-wider block font-sans">
                    🔑 剩余待指引神位
                  </span>
                  <strong className="text-md font-sans text-amber-400/95 font-black mt-0.5 whitespace-nowrap">
                    {toast.unpairedCount} <span className="text-[9px] font-normal text-stone-500">/ {toast.totalGood || 7} 位</span>
                  </strong>
                </div>

                <div className="bg-stone-900/40 border border-stone-850 p-1.5 rounded-xl flex flex-col justify-center">
                  <span className="text-[8px] text-stone-400 uppercase tracking-wider block font-sans">
                    🎒 行囊持有甲骨
                  </span>
                  <strong className="text-md font-sans text-teal-400 font-extrabold mt-0.5 whitespace-nowrap">
                    {toast.oracleBones} <span className="text-[9px] font-normal text-stone-500">枚</span>
                  </strong>
                </div>
              </div>

              <div className="text-[8.5px] text-center text-stone-500 block leading-tight font-sans italic pt-0.5 border-t border-stone-900/40">
                破译字谜或拾得古简可获取甲骨，助推三人行核验
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* SHANG-DYNASTY SACRED ALTAR AMBIENT DESIGN */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.14] pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1599733589046-9b8308b5b50d?auto=format&fit=crop&q=80&w=1200')`, // bronze design patterns texture
        }}
      />
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-stone-950 via-teal-980/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-stone-950 via-amber-950/5 to-transparent pointer-events-none" />

      {/* RITUAL POPUP AUDIO INVITATION */}
      {isAudioPromptOpen && (
        <div className="z-50 sticky top-0 max-w-full bg-gradient-to-r from-amber-950/90 via-stone-900/95 to-amber-950/90 border-b border-amber-500/30 py-3 px-4 flex flex-col md:flex-row items-center justify-between text-xs space-y-2 md:space-y-0 text-center md:text-left backdrop-blur-md">
          <div className="flex items-center space-x-2 text-amber-200">
            <Volume2 className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
            <span className="font-sans font-medium">
              欢迎来到《青铜器守护·甲骨狼人杀》！本游戏包含精心合成的**古编钟、法祭盘、炎烧竹谱**物理声效，建议开启音乐支持体验！
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setIsAudioPromptOpen(false);
                setMuteAudio(false);
                GlobalAudio.startAmbient();
                GlobalAudio.startSacredMusic();
              }}
              className="px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold tracking-wider text-[11px] transition duration-200 cursor-pointer shadow-lg"
            >
              聆听颂歌 (Play)
            </button>
            <button
              onClick={() => {
                setIsAudioPromptOpen(false);
                setMuteAudio(true);
              }}
              className="px-3 py-1.5 rounded-full border border-stone-700 hover:bg-stone-800 text-stone-400 text-[11px] transition cursor-pointer"
            >
              静音祭祀 (Mute)
            </button>
          </div>
        </div>
      )}

      {/* CORE CONTAINER */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 relative z-10 flex-1 flex flex-col justify-between space-y-5">
        
        {/* UPPER STATUS BAR */}
        <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md pt-3 pb-3.5 -mx-4 px-4 md:-mx-6 md:px-6 border-b border-amber-500/15 flex flex-col lg:flex-row items-center justify-between gap-4">
          
          <div className="text-center lg:text-left flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <div className="flex items-center justify-center lg:justify-start space-x-2">
                <span className="text-amber-500/40 font-mono text-lg tracking-wider">𐊃 𐊆 𐊂</span>
                <h1 className="text-xl md:text-2xl font-bold font-sans tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 drop-shadow-[0_2px_4px_rgba(217,119,6,0.4)]">
                  青铜器守护·甲骨狼人杀
                </h1>
              </div>
              <p className="text-[10px] font-mono text-amber-500/60 mt-0.5 tracking-wider uppercase">
                Yin-Xu Bronze Deity Covenant & Xinhua Decipherer · 线上高保真单机版
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 self-center">
              <button
                type="button"
                onClick={() => {
                  setIsRulesModalOpen(true);
                  handlePlayWhoosh();
                }}
                className="px-4 py-1.5 rounded-xl border border-amber-500/30 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 hover:text-amber-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition duration-200 cursor-pointer shadow-md"
                title="查阅详细的阵营、神兽图腾绑定关系与核验解谜秘法"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>📜 游戏规则手册</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsBondsGuideModalOpen(true);
                  handlePlayWhoosh();
                }}
                className="px-4 py-1.5 rounded-xl border border-amber-500/30 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 hover:text-amber-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition duration-200 cursor-pointer shadow-md"
                title="查阅六大古老神兽图腾与其宿命羁绊共鸣"
              >
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>🏮 神兽图腾与羁绊</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsBonesModalOpen(true);
                  handlePlayWhoosh();
                }}
                className="px-4 py-1.5 rounded-xl border border-amber-500/30 bg-amber-950/40 hover:bg-amber-900/40 text-stone-300 hover:text-amber-205 font-bold text-xs flex items-center justify-center space-x-1.5 transition duration-200 cursor-pointer shadow-md"
                title="查看各贞人英杰实时持有的卜兆甲骨数"
              >
                <Database className="w-4 h-4 text-amber-500" />
                <span>🦴 甲骨持有榜</span>
              </button>
            </div>
          </div>

          {/* LOWER HEADER CONTROLS */}
          {hasStarted && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* TIMELINE TIMER */}
              <div className="flex items-center space-x-2 bg-stone-900/90 border border-stone-800 px-3 py-1.5 rounded-xl">
                <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="font-mono text-sm font-semibold tracking-wider text-amber-400">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-[9px] text-stone-300 border-l border-stone-800 pl-2 font-bold font-sans">
                  {timeRemaining > 600 ? '第一期：解谶 (M1)' : timeRemaining > 0 ? '第二期：验证 (M2)' : '圆满：大合验 (GM)'}
                </span>
                {timeRemaining > 600 && (
                  <button
                    onClick={() => {
                      if (confirm("确定要直接结束前 10 分钟猜谜阶段，提前开启「10分钟印章验证与组队阶段」吗？")) {
                        setTimeRemaining(600);
                        addLog('大祭司', '【提前跨越】祭司行使秘契符章，宣告前10分钟猜谜阶段提前终结！第二阶段「10分钟印章验证期」开启，神秘阁与组队阵法自迷雾中解放！', 'system');
                        handlePlayBell(880);
                      }
                    }}
                    className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-505/30 text-amber-300 transition text-[9px] font-bold cursor-pointer border border-amber-500/25 animate-pulse"
                    title="提前结束猜谜阶段进入验证阶段"
                  >
                    ⏩ 进验证期
                  </button>
                )}
                {timeRemaining <= 600 && timeRemaining > 0 && (
                  <button
                    onClick={() => {
                      if (confirm("确定要提前度过 10 分钟验证阶段，直接让 20 分钟满额时辰归零，唤醒并登临终极校验合验台吗？")) {
                        setTimeRemaining(0);
                        addLog('大祭司', '【大荒归零】大祭司催发二十极祭契，太荒时辰归零！搜查探底结束，天地灵柱大开，终极契约校验之台在圣光中冉冉飞升！', 'system');
                        handlePlayBell(880);
                      }
                    }}
                    className="ml-2 px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-505/30 text-rose-300 transition text-[9px] font-bold cursor-pointer border border-rose-500/25 animate-pulse"
                    title="提前让20分钟大限归零，登临大合验"
                  >
                    ⏩ 进大合验
                  </button>
                )}
              </div>

              {/* ORACLE BONES BAG */}
              <div className="flex items-center space-x-2 bg-stone-950 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-sans text-xs text-stone-300">持有甲骨:</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {oracleBones} 枚
                </span>
              </div>

              {/* FORCE RESET */}
              <button
                onClick={() => {
                  if (confirm("确定要放弃本局，重开新局吗？")) {
                    startNewGame();
                  }
                }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-stone-900 border border-rose-950 text-rose-400 hover:bg-rose-950/20 transition text-[11px] font-bold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新发盘</span>
              </button>

              {/* RECALL FLOATING PANELS */}
              {(!showNewsTicker || !showBondsMap) && (
                <button
                  onClick={() => {
                    setShowNewsTicker(true);
                    setShowBondsMap(true);
                    setIsBondsCollapsed(false);
                    handlePlayWhoosh();
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-amber-950/20 border border-amber-950 text-amber-400 hover:text-amber-300 transition text-[10px] font-bold cursor-pointer"
                  title="重新显示下方的时事与神兽图谱面板"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>召回时事与图谱</span>
                </button>
              )}
            </div>
          )}
        </header>

        {/* RECRUIT NAMES / START SCREEN IF NOT STARTED */}
        {!hasStarted ? (
          <div className="flex-1 max-w-xl mx-auto w-full bg-stone-900/80 border border-amber-500/20 p-6 rounded-3xl shadow-2xl backdrop-blur-md my-auto flex flex-col justify-between space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-400/40 flex items-center justify-center mx-auto mb-2 animate-pulse-slow">
                <Flame className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-lg font-bold text-amber-200 font-sans tracking-wide">
                殷墟古镜 · 神灵契约大厅
              </h2>
              <p className="text-xs text-stone-400 leading-relaxed max-w-sm mx-auto font-sans">
                点击下方选择契局的博弈形制：选择人机练习守护天命，或是邀请凡人同伴开启真人对决。
              </p>
            </div>

            {/* SELECTION TABS */}
            <div className="flex border border-stone-800 p-1 rounded-2xl bg-black/40">
              <button
                type="button"
                onClick={() => {
                  setIsMultiplayer(false);
                  setRoomId('');
                  setMySeatId(null);
                  if (wsRef.current) wsRef.current.close();
                  setSocket(null);
                }}
                className={`flex-1 py-2 text-center text-xs font-bold font-sans transition-all duration-300 rounded-xl cursor-pointer ${
                  !isMultiplayer
                    ? 'bg-amber-600 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🔮 单人降临练习 (VS Bots)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMultiplayer(true);
                }}
                className={`flex-1 py-2 text-center text-xs font-bold font-sans transition-all duration-300 rounded-xl cursor-pointer ${
                  isMultiplayer
                    ? 'bg-amber-600 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                👥 神仙联机大厅 (Multiplayer)
              </button>
            </div>

            {/* CONFIG/LOBBY INTERFACE */}
            <div className="space-y-4 border-t border-stone-800 pt-4 flex-1 flex flex-col justify-between">
              
              {!roomId ? (
                // NOT YET IN A ROOM - SHOW START SCREEN INPUTS / INVITE CARDS
                <div className="space-y-3">
                  {invitedRoomId ? (
                    // Dedicated Invitation Interface (Forces name change + Join button inside)
                    <div className="space-y-4 text-left">
                      <div className="space-y-4 bg-amber-950/15 border border-amber-500/20 p-4 rounded-2xl relative">
                        <span className="absolute top-2 right-2 text-[8px] font-mono text-amber-500/40">
                          INVITATION ACTIVE
                        </span>
                        <div className="space-y-1 text-left">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300">
                            <span className="animate-ping w-2 h-2 rounded-full bg-amber-400" />
                            <span>🔮 仙友受邀之约 · 房间 #{invitedRoomId}</span>
                          </div>
                          <p className="text-stone-300 text-xxs leading-normal font-sans">
                            你受到了好友的博弈邀请。应天命之契，<strong>请先在下方输入你的贞人化名/祭司专属名字，然后点击加入</strong>：
                          </p>
                        </div>

                        {/* Explicit name input nested inside invite card */}
                        <div className="space-y-1.5 text-left bg-stone-950/70 p-3 rounded-xl border border-stone-850">
                          <label className="text-[10px] font-mono text-amber-550/60 uppercase tracking-widest block font-bold">
                            ✍️ 贞人专属名号 (Name):
                          </label>
                          <input
                            type="text"
                            maxLength={12}
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="请输入你想用的新名字（非空）"
                            className="w-full bg-stone-950 border-2 border-amber-500/35 focus:border-amber-400 px-3 py-2 text-stone-200 text-xs rounded-lg focus:outline-none text-center font-bold"
                          />
                        </div>

                        {userName.trim() === '小贞人 (主角)' ? (
                          <div className="text-[10px] text-red-400 font-bold bg-red-950/20 border border-red-900/30 px-3 py-2 rounded-xl animate-pulse text-left font-sans leading-tight">
                            ⚠️ 默认名「小贞人 (主角)」不可直接使用。请改成新化名（如：安阳大祭司、卜卦高人 等）！
                          </div>
                        ) : userName.trim() === '' ? (
                          <div className="text-[10px] text-red-400 font-bold bg-red-950/20 border border-red-900/30 px-3 py-2 rounded-xl text-left font-sans leading-tight">
                            ⚠️ 名字不可为空，请输入。
                          </div>
                        ) : (
                          <div className="text-[10px] text-teal-400 font-bold bg-teal-950/25 border border-teal-900/40 px-3 py-2 rounded-xl text-left font-sans leading-tight">
                            ✓ 名号已就绪！你将以仙尊【{userName}】的大号加入大荒神殿！
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={userName.trim() === '' || userName.trim() === '小贞人 (主角)'}
                          onClick={() => {
                            connectToMultiplayer(invitedRoomId);
                            setInvitedRoomId(null);
                          }}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs transition duration-200 cursor-pointer flex items-center justify-center space-x-2 border ${
                            (userName.trim() === '' || userName.trim() === '小贞人 (主角)')
                              ? 'bg-stone-900 text-stone-500 border-stone-850 cursor-not-allowed opacity-60'
                              : 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-stone-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                          }`}
                        >
                          <span>🚪 确立名号 · 加入房间</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInvitedRoomId(null);
                            setRoomInputId('');
                            setIsMultiplayer(false);
                          }}
                          className="w-full py-1 text-center text-[10px] text-stone-500 hover:text-stone-300 transition"
                        >
                          ✕ 拒绝该邀请，玩单人模式
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Normal non-invited interface
                    <>
                      <div className="space-y-1.5 text-left">
                        <label className="text-xxs font-mono text-amber-500/60 uppercase tracking-widest block font-bold">
                          输入你的祭司化名:
                        </label>
                        <input
                          type="text"
                          maxLength={12}
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          placeholder="如：小贞人 (主角)"
                          className="w-full bg-stone-950 border border-stone-800 px-4 py-2 text-stone-200 text-xs rounded-xl focus:outline-none focus:border-amber-500/50"
                        />
                      </div>

                      {!isMultiplayer ? (
                        // OFFLINE GAME INFO
                        <div className="bg-black/40 rounded-xl p-3 text-[11px] text-stone-400 leading-relaxed font-sans space-y-2">
                          <div>💥 <strong className="text-amber-400 font-medium">生存大挑战：</strong>7名好人在游戏中可能随时被卧底识破淘汰。但任何好人被淘汰不影响好人胜利，最终契约大合验只需要把所有好人神兽身份判定填报正确即可！</div>
                          <div>🕯️ <strong className="text-amber-400 font-medium">卜骨解谜法：</strong>在规定时间（10分）内去破解汉字拆字谜，检索新华词典，解开古器宝箱获取甲骨。</div>
                        </div>
                      ) : (
                        // MULTIPLAYER ROOM SETUP (WHEN NO ACTIVE INVITATION)
                        <div className="space-y-4 text-left">
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xxs font-mono text-amber-500/60 uppercase tracking-widest block font-bold">
                                输入 4 位神坛密码/房号 (Room Code):
                              </label>
                              <input
                                type="text"
                                maxLength={4}
                                value={roomInputId}
                                onChange={(e) => setRoomInputId(e.target.value.toUpperCase())}
                                placeholder="如：XY99"
                                className="w-full bg-stone-950 border border-stone-850 px-4 py-2 text-stone-200 text-xs rounded-xl focus:outline-none focus:border-amber-500/50 uppercase tracking-widest font-mono text-center text-sm"
                              />
                            </div>
                            {multiplayerError && (
                              <p className="text-xxs text-red-400 bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-900/35 leading-tight font-serif">
                                ⚠️ {multiplayerError}
                              </p>
                            )}
                            <p className="text-xxs text-stone-500 leading-normal">
                              * 填入任意4位代码。若该神仙席位未创，将自动为你建立并设你为司仪；若已经开启，你将直接合契加入。
                            </p>
                            
                            <button
                              type="button"
                              onClick={() => connectToMultiplayer(roomInputId)}
                              className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition cursor-pointer"
                            >
                              🚪 通灵合契 · 进入/创建神坛 Room
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                // INSIDE MULTIPLAYER LOBBY
                      <div className="space-y-4">
                        <div className="flex items-center justify-between bg-amber-950/30 border border-amber-500/20 px-3 py-2 rounded-xl">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xxs font-mono text-amber-300">天启连通中 ── 房间密钥:</span>
                          </div>
                          <span className="font-mono text-xs font-black text-amber-400 bg-stone-950 px-2.5 py-0.5 rounded border border-amber-500/20">
                            {roomId}
                          </span>
                        </div>

                        {/* 复制邀请链接 (Copy Invite Link) */}
                        <div className="flex flex-col space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              const inviteUrl = `${window.location.origin}${window.location.pathname}?roomId=${roomId}`;
                              navigator.clipboard.writeText(inviteUrl).then(() => {
                                setCopySuccess(true);
                                setTimeout(() => setCopySuccess(false), 3000);
                              }).catch((err) => {
                                console.error('Failed to copy', err);
                              });
                            }}
                            className="w-full py-2 bg-gradient-to-r from-amber-600/10 to-amber-700/25 hover:from-amber-600/20 hover:to-amber-700/35 border border-amber-500/35 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-xxs font-bold rounded-xl transition duration-150 cursor-pointer flex items-center justify-center space-x-2 shadow-sm"
                          >
                            <span>🔗 复制神坛邀请链接 (Copy Invite Link)</span>
                          </button>
                          {copySuccess && (
                            <div className="text-[10px] text-teal-400 text-center font-bold animate-pulse bg-teal-950/20 py-1 rounded border border-teal-900/30">
                              ✓ 契约链接已复制成功！快发给仙友来合卦吧！
                            </div>
                          )}
                        </div>

                        {multiplayerError && (
                          <p className="text-xxs text-red-400 bg-red-950/20 px-3 py-1 rounded">
                            ⚠️ {multiplayerError}
                          </p>
                        )}

                        <div className="space-y-2">
                          <span className="text-xxs text-stone-400/90 font-bold block uppercase tracking-wider">
                            当前已合契祭主席位 ({lobbyPlayers.length} / 10人):
                          </span>
                          <div className="bg-black/30 rounded-xl max-h-[140px] overflow-y-auto p-2 border border-stone-850 space-y-1.5 custom-scrollbar text-xxs">
                            {lobbyPlayers.map((player, index) => (
                              <div key={player.id} className="flex items-center justify-between bg-stone-900/40 p-2 rounded-lg border border-stone-850/60">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs">🧙‍♂️</span>
                                  <span className="text-stone-200 font-bold">{player.name}</span>
                                  {player.id === clientId && (
                                    <span className="text-[7.5px] bg-stone-950 text-amber-500 px-1 rounded font-mono border border-amber-500/15">
                                      你
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-stone-500 font-mono">第 {index + 1} 尊席</span>
                                  {player.isHost ? (
                                    <span className="text-[7.5px] bg-amber-500/10 text-amber-400 border border-amber-400/30 px-1 py-0.2 rounded font-bold">
                                      👑 司仪/契主
                                    </span>
                                  ) : (
                                    <span className="text-[7.5px] bg-stone-950 text-stone-500 px-1 rounded">
                                      在线待命
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {lobbyPlayers.length < 10 && (
                              <div className="text-center py-1 text-[9px] text-stone-550 border border-dashed border-stone-850 rounded-lg select-none">
                                * 联机人数不足 10 人时，开始后会自动由 AI 商周精灵补位
                              </div>
                            )}
                          </div>
                        </div>

                        {/* LOBBY INTERACTIVE CHAT BOX */}
                        <div className="space-y-1.5 bg-black/45 p-2 rounded-xl border border-stone-850">
                          <span className="text-[8px] font-mono text-stone-500 uppercase block select-none">
                            💬 神坛待机密谈 (Type and press chat to communicate before game start):
                          </span>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              maxLength={40}
                              value={lobbyChatText}
                              onChange={(e) => setLobbyChatText(e.target.value)}
                              placeholder="在神殿中通灵私谈..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  sendLobbyChat(undefined, 'system');
                                }
                              }}
                              className="flex-1 bg-stone-950 border border-stone-800 text-stone-300 text-xxs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-500/30"
                            />
                            <button
                              type="button"
                              onClick={() => sendLobbyChat(undefined, 'system')}
                              className="px-3 bg-stone-900 border border-stone-800 text-amber-500 hover:text-amber-400 hover:bg-stone-850 rounded-lg text-xxs font-bold transition cursor-pointer"
                            >
                              通灵发声
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

              {/* ACTION ACCENT BUTTON */}
              <div className="pt-4">
                {!isMultiplayer ? (
                  <button
                    onClick={startNewGame}
                    className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 text-stone-950 font-extrabold text-sm tracking-widest transition duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-orange-950/40"
                  >
                    开启商周乾坤局 (Start Standalone Game)
                  </button>
                ) : (
                  roomId && (
                    isHost ? (
                      <button
                        onClick={startMultiplayerGame}
                        className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 text-stone-950 font-extrabold text-sm tracking-widest transition duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-orange-950/40 animate-pulse"
                      >
                        🌟 司仪执礼 · 开启神明联机契约!
                      </button>
                    ) : (
                      <div className="w-full py-3 rounded-full bg-stone-950 border border-stone-800 text-stone-400 text-center text-xs font-bold font-serif flex items-center justify-center space-x-2 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        <span>等待司仪/房主开启卜卦契印仪式...</span>
                      </div>
                    )
                  )
                )}
              </div>

            </div>
        ) : (
          /* PLAYABLE CONTENT PLATFORM */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
            
            {/* LEFT AREA: NAVIGATION TABS & ACTUAL WORKSPACE (SPAN 8) */}
            <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
              
              {/* TOP STORYLINE DISPLAY BASED ON TIMELINE & LOGS */}
              <section className="bg-stone-900/60 border border-stone-800/80 p-3.5 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 blur-xl rounded-full pointer-events-none" />
                <div className="space-y-1 text-center md:text-left z-10">
                  <div className="flex items-center justify-center md:justify-start space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-[10px] text-amber-400 font-mono font-semibold tracking-wider uppercase">
                      占占进行时: {getTimelineStoryLine().title}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-normal max-w-xl">
                    {getTimelineStoryLine().desc}
                  </p>
                </div>
                
                {/* ADVANCE COUNTER BUTTON FOR QUICK SIMULATION AND PLAYTESTING */}
                <button
                  onClick={() => {
                    executeOneRandomAIMove();
                    handlePlayDrum();
                  }}
                  className="px-3 py-1.5 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-600/30 text-amber-300 hover:text-amber-100 rounded-xl text-[10px] font-bold duration-200 shrink-0 cursor-pointer"
                  title="让AI补位古人执行一轮随机行为，可加速战局"
                >
                  🚀 推进AI行动一位 Step AI
                </button>
              </section>

              {/* NAVIGATION TABS SELECTOR */}
              <nav className="flex justify-around items-center gap-1.5 p-1 bg-stone-900/90 border border-stone-800 rounded-2xl md:p-2 shrink-0">
                <button
                  onClick={() => {
                    setActiveTab('map');
                    handlePlayWhoosh();
                  }}
                  className={`flex-1 py-1.5 text-[10px] md:text-xxs uppercase tracking-wider font-bold transition rounded-xl flex items-center justify-center space-x-1 duration-200 cursor-pointer ${
                    activeTab === 'map' ? 'bg-amber-600 border border-amber-400 text-stone-950' : 'text-stone-400 hover:bg-stone-850 hover:text-stone-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>主圣坛.人杰</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('puzzle');
                    handlePlayWhoosh();
                  }}
                  className={`flex-1 py-1.5 text-[10px] md:text-xxs uppercase tracking-wider font-bold transition rounded-xl flex items-center justify-center space-x-1 duration-200 cursor-pointer ${
                    activeTab === 'puzzle' ? 'bg-amber-600 border border-amber-400 text-stone-950' : 'text-stone-400 hover:bg-stone-850 hover:text-stone-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>神书印.获取</span>
                </button>

                 <button
                  onClick={() => {
                    if (timeRemaining > 600) {
                      alert("⚠️ 神秘阁大门尚未开启！必须在前 10 分钟猜谜阶段结束后（计时器降回 10:00 以内），才允许进入神秘阁进行扣问与印章检测！");
                      return;
                    }
                    setActiveTab('chamber');
                    handlePlayWhoosh();
                  }}
                  className={`flex-1 py-1.5 text-[10px] md:text-xxs uppercase tracking-wider font-bold transition rounded-xl flex items-center justify-center space-x-1 duration-200 cursor-pointer ${
                    activeTab === 'chamber' ? 'bg-amber-600 border border-amber-400 text-stone-950' : 'text-stone-400 hover:bg-stone-850 hover:text-stone-200'
                  } ${timeRemaining > 600 ? 'opacity-50 cursor-not-allowed font-medium' : ''}`}
                >
                  {timeRemaining > 600 ? <Lock className="w-3.5 h-3.5 text-stone-500" /> : <Compass className="w-3.5 h-3.5" />}
                  <span>{timeRemaining > 600 ? '神秘阁 [锁]' : '神密阁.印章'}</span>
                </button>

                <button
                  onClick={() => {
                    if (timeRemaining > 600) {
                      alert("⚠️ 组队核验祭坛尚未开启！必须先在前 10 分钟猜谜期结束后（倒计时少于 10:00）且自身完成神秘阁中的印章探测后，才能开始三人组合验！");
                      return;
                    }
                    if (!localPlayer?.hasEnteredChamber) {
                      alert("⚠️ 誓言不配！你必须先去「神秘阁.印章」拜叩图腾雕像，确认你的法身印记候选后，才能进行三人组队关系核验！");
                      return;
                    }
                    setActiveTab('check');
                    handlePlayWhoosh();
                  }}
                  className={`flex-1 py-1.5 text-[10px] md:text-xxs uppercase tracking-wider font-bold transition rounded-xl flex items-center justify-center space-x-1 duration-200 cursor-pointer ${
                    activeTab === 'check' ? 'bg-amber-600 border border-amber-400 text-stone-950' : 'text-stone-400 hover:bg-stone-850 hover:text-stone-200'
                  } ${(!localPlayer?.hasEnteredChamber || timeRemaining > 600) ? 'opacity-50 cursor-not-allowed font-medium' : ''}`}
                >
                  {(!localPlayer?.hasEnteredChamber || timeRemaining > 600) ? <Lock className="w-3.5 h-3.5 text-stone-500" /> : <Users className="w-3.5 h-3.5" />}
                  <span>{(!localPlayer?.hasEnteredChamber || timeRemaining > 600) ? '组队核验 [锁]' : '组队核.研契'}</span>
                </button>

                <button
                  onClick={() => {
                    if (timeRemaining > 0) {
                      alert(`⚠️ 终极校验尚未能唤醒！\n必须等整整 20 分钟满额神契倒数时辰归于 00:00 彻底结束后，大献祭终极合验台才允许真正开启填报与乾坤判定。请在此前抓紧验证推导伙伴候选！(限时还剩 ${formatTime(timeRemaining)})`);
                      return;
                    }
                    setActiveTab('final');
                    handlePlayWhoosh();
                  }}
                  className={`flex-1 py-1.5 text-[10px] md:text-xxs uppercase tracking-wider font-bold transition rounded-xl flex items-center justify-center space-x-1 duration-200 cursor-pointer ${
                    activeTab === 'final' 
                      ? (!localPlayer?.isGood ? 'bg-rose-950 border border-rose-800 text-rose-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-amber-600 border border-amber-400 text-stone-950')
                      : 'text-stone-400 hover:bg-stone-850 hover:text-stone-200'
                  } ${timeRemaining > 0 ? 'opacity-50 cursor-not-allowed font-medium' : ''}`}
                >
                  {timeRemaining > 0 ? (
                    <Lock className="w-3.5 h-3.5 text-stone-500" />
                  ) : !localPlayer?.isGood ? (
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <CheckSquare className="w-3.5 h-3.5" />
                  )}
                  <span>{timeRemaining > 0 ? '终核台 [未届]' : !localPlayer?.isGood ? '卧底禁域' : '终合校验.归'}</span>
                </button>
              </nav>

              {/* MAIN CONTENT SPACE BASED ON ACTIVE TAB */}
              <div className="flex-1 bg-black/40 border border-amber-900/20 rounded-2xl p-4 md:p-5 flex flex-col justify-between min-h-[460px] relative">
                
                {/* 1. MAP TAB: 10 PLAYERS LIST & THE DRAMA ACTION CONTROLS */}
                {activeTab === 'map' && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                        <h3 className="text-xs font-bold font-sans text-stone-200 tracking-wider">
                          🏰 圣坛英杰席位（共 10 位精灵，活存一览）
                        </h3>
                        <div className="flex items-center space-x-2">
                          <button
                            id="btn-reveal-all-identities"
                            onClick={() => {
                              setRevealAllIdentities(prev => !prev);
                              handlePlayCrack();
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-xxs font-extrabold tracking-wider transition-all cursor-pointer flex items-center space-x-1 ${
                              revealAllIdentities
                                ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse'
                                : 'bg-stone-900 hover:bg-stone-850 border-stone-800 text-stone-300 shadow-md'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{revealAllIdentities ? '🔮 一键合上卡牌' : '🔮 一键翻开全部卡牌'}</span>
                          </button>
                          <p className="text-[10px] text-stone-500 font-mono hidden sm:block">
                            主法坛席位布局
                          </p>
                        </div>
                      </div>

                      {/* ACTIVE TRACKING HUD BAR */}
                      {trackedBeast && (
                        <div className="flex items-center justify-between bg-amber-950/40 border border-amber-500/35 p-2 px-3 rounded-2xl mb-4 text-xs shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                          <div className="flex items-center space-x-2">
                            <span className="animate-pulse text-amber-500 text-sm">✦</span>
                            <span className="text-stone-300 font-sans">图腾高亮追踪中：正在强光标记在竹简中刻印了【<strong className="text-amber-400 font-serif font-black text-sm">{trackedBeast}</strong>】的玩家法器席位</span>
                          </div>
                          <button
                            onClick={() => {
                              setTrackedBeast(null);
                              handlePlayWhoosh();
                            }}
                            className="text-stone-300 hover:text-red-400 bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800 hover:border-red-500/40 cursor-pointer transition text-xxs font-mono"
                          >
                            ✕ 撤销高亮追踪
                          </button>
                        </div>
                      )}

                      {/* PLAYERS GRID CARDS */}
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                        {players.map((p) => {
                          const isUser = p.isUser;
                          const showUndercoverIdentity = !localPlayer?.isGood && !p.isGood; // Undercovers can see teammates!
                          const isFlipped = revealAllIdentities || flippedPlayers[p.id];
                          const isTracked = trackedBeast && (bambooScrollNotes[p.id] || []).includes(trackedBeast);

                          return (
                            <div key={p.id} className={`perspective-1000 w-full h-[225px] select-none group transition-all duration-300 ${isTracked ? 'scale-[1.04] ring-2 ring-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.5)] rounded-2xl z-20' : ''}`}>
                              <div className={`relative w-full h-full duration-500 preserve-3d transition-transform ${isFlipped ? 'rotateY-180' : ''}`}>
                                
                                {/* CARD FRONT - FACE DOWN (UNFLIPPED - Image 1 STYLE) */}
                                <div className={`absolute inset-0 backface-hidden flex flex-col justify-between p-3 rounded-2xl border bg-stone-950/95 shadow-[0_4px_20px_rgba(0,0,0,0.65)] duration-300 overflow-hidden ${isFlipped ? 'pointer-events-none' : 'pointer-events-auto'} ${isTracked ? 'border-amber-400 bg-amber-955/20' : 'border-amber-500/25 hover:border-amber-500/60'}`}>
                                  {/* Blueprint Grid Mesh Lines */}
                                  <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(217,119,6,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(217,119,6,0.15)_1px,transparent_1px)] bg-[size:10px_10px]" />
                                  <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-black/80 to-black" />
                                  
                                  {/* Subtle coordinate dot details */}
                                  <span className="absolute top-1 text-[7px] font-mono text-amber-500/30 left-2 select-none">
                                    DECIPHER CODE #{p.id.toString().padStart(2, '0')}
                                  </span>
                                  <span className="absolute top-1 text-[7px] font-mono text-amber-500/30 right-2 select-none">
                                    Ψ-X: 3000
                                  </span>

                                  {/* Title block */}
                                  <div className="flex items-center justify-between z-10">
                                    <span className={`text-[9px] font-serif font-semibold tracking-widest px-1.5 py-0.5 rounded border ${isTracked ? 'text-amber-400 bg-amber-950 border-amber-400 animate-pulse' : 'text-amber-500/80 bg-amber-950/40 border-amber-500/15'}`}>
                                      {isTracked ? '🎯 契印对齐追踪' : '祭坛秘钥'}
                                    </span>
                                    <HelpCircle className="w-3.5 h-3.5 text-stone-600 hover:text-amber-400 cursor-help transition" title="点击下方翻开即可查看神祇候选，极富商周神秘烙印" />
                                  </div>

                                  {/* Large Central Trident symbol */}
                                  <div className="z-10 flex flex-col items-center justify-center space-y-1 py-1">
                                    <svg viewBox="0 0 100 100" className="w-12 h-12 text-amber-500/60 group-hover:text-amber-400 group-hover:scale-105 duration-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                                      <path d="M50,15 L50,85 M25,40 Q50,60 75,40 M30,25 L30,55 M70,25 L70,55" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                      <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                                    </svg>
                                    <span className="text-[8px] font-mono tracking-widest font-semibold text-stone-500/80 block select-none uppercase mt-1">
                                      殷商卜辞御封
                                    </span>
                                  </div>

                                  {/* Button to flip card */}
                                  <button
                                    onClick={() => {
                                      setFlippedPlayers(prev => ({ ...prev, [p.id]: true }));
                                      handlePlayWhoosh();
                                      
                                      // Determine visible beast for the aura burst animation
                                      let vBeast: BeastType | 'unknown' = 'unknown';
                                      if (isCompleted) {
                                        vBeast = p.beast || 'unknown';
                                      } else if (p.isUser || p.id === localPlayer?.id) {
                                        vBeast = p.beast || 'unknown';
                                      } else if (!localPlayer?.isGood) {
                                        if (!p.isGood) {
                                          vBeast = p.beast || 'unknown';
                                        } else {
                                          const markedBeasts = bambooScrollNotes[p.id] || [];
                                          if (markedBeasts.length === 1) {
                                            vBeast = markedBeasts[0];
                                          }
                                        }
                                      } else {
                                        const markedBeasts = bambooScrollNotes[p.id] || [];
                                        if (markedBeasts.length === 1) {
                                          vBeast = markedBeasts[0];
                                        }
                                      }
                                      triggerAuraBurst(p.id, vBeast);
                                    }}
                                    className="w-full z-20 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-200 border border-amber-500/35 hover:border-amber-400 text-xxs font-extrabold tracking-wider transition-all duration-200 cursor-pointer shadow-lg active:scale-95"
                                  >
                                    👁 翻开祭坛身份卡
                                  </button>
                                </div>

                                {/* CARD BACK - FACE UP (FLIPPED - DETAILED NEON ROLE DETAIL / DECIPHER STATUS) */}
                                <div className={`absolute inset-0 backface-hidden rotateY-180 rounded-2xl overflow-hidden p-[1.5px] shadow-[0_0_20px_rgba(245,158,11,0.6)] ${isFlipped ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                                  {/* Dynamic Flowing Stream-light Gradient */}
                                  <div className="absolute inset-x-[-50%] inset-y-[-50%] animate-stream-glow bg-[linear-gradient(90deg,#f59e0b,#10b981,#3b82f6,#ef4444,#f59e0b)] pointer-events-none z-0 opacity-90 rounded-2xl" />
                                  
                                  {/* Inner Container representing the actual card body */}
                                  <div className="absolute inset-[1.5px] rounded-[14px] bg-gradient-to-b from-stone-900 via-stone-950 to-black p-3 flex flex-col justify-between z-10 overflow-hidden">
                                    {/* Background radial glow */}
                                    <div className="absolute inset-0 bg-radial from-amber-500/5 via-transparent to-transparent pointer-events-none z-0" />

                                    {/* Subtle Floating Particles in Back Cover Background */}
                                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
                                      {[...Array(6)].map((_, i) => {
                                        const xDel = (i * 17) % 90;
                                        const delay = i * 0.7;
                                        const size = 1.5 + (i % 3);
                                        const duration = 4.5 + (i % 4);
                                        const maxOp = 0.3 + (i % 3) * 0.15;
                                        return (
                                          <div
                                            key={i}
                                            className="absolute bottom-0 rounded-full bg-amber-400"
                                            style={{
                                              left: `${xDel}%`,
                                              width: `${size}px`,
                                              height: `${size}px`,
                                              animation: `particleFloat ${duration}s infinite linear`,
                                              animationDelay: `${delay}s`,
                                              '--x-offset': `${(i % 2 === 0 ? 8 : -8)}px`,
                                              '--drift': `${(i % 3) * 6 - 9}px`,
                                              '--max-opacity': maxOp,
                                            } as React.CSSProperties}
                                          />
                                        );
                                      })}
                                    </div>

                                    {/* Header section of Flipped card */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between z-10 border-b border-stone-800/60 pb-1.5 shrink-0 gap-1.5 sm:gap-2 w-full">
                                      <div className="flex flex-col text-left min-w-0 w-full sm:w-auto">
                                        <span 
                                          className={`text-[10px] font-bold leading-tight truncate text-ellipsis overflow-hidden block ${isUser ? 'text-amber-300' : 'text-stone-200'}`} 
                                          title={p.name}
                                          style={{ wordBreak: 'break-word' }}
                                        >
                                          {p.name}
                                        </span>
                                        <span className="text-[6.5px] text-stone-500 font-mono truncate text-ellipsis overflow-hidden block">
                                          POSITION #{p.id.toString().padStart(2, '0')}
                                        </span>
                                      </div>

                                      {/* Identity tags or True beast marker when known to player! */}
                                      <div className="text-left sm:text-right min-w-0 w-full sm:w-auto" style={{ wordBreak: 'break-word' }}>
                                        {p.isEliminated ? (
                                          <span 
                                            className="text-[7.5px] bg-red-950 text-red-400 font-bold px-1 py-0.5 rounded border border-red-500/20 inline-block max-w-full truncate text-ellipsis"
                                            style={{ wordBreak: 'break-word' }}
                                          >
                                            已淘汰亡星
                                          </span>
                                        ) : isCompleted ? (
                                          <span 
                                            className={`text-[7.5px] font-bold px-1 py-0.5 rounded border inline-block max-w-full truncate text-ellipsis ${
                                              p.isGood ? 'bg-teal-950 text-teal-300 border-teal-500/30' : 'bg-rose-950 text-rose-300 border-rose-500/30'
                                            }`}
                                            style={{ wordBreak: 'break-word' }}
                                          >
                                            {p.isGood ? '青铜守护' : '文创卧底'}
                                          </span>
                                        ) : (p.isUser || p.id === localPlayer?.id) ? (
                                          localPlayer?.isGood ? (
                                            <span 
                                              className="text-[7.5px] bg-black/40 text-stone-500 border border-stone-850 px-1 py-0.5 rounded inline-block max-w-full truncate text-ellipsis font-bold"
                                              style={{ wordBreak: 'break-word' }}
                                            >
                                              待考星格 (你 - 身份未知)
                                            </span>
                                          ) : (
                                            <span 
                                              className="text-[7.5px] bg-rose-950 text-rose-300 border border-rose-500/30 px-1 py-0.5 rounded inline-block max-w-full truncate text-ellipsis font-bold"
                                              style={{ wordBreak: 'break-word' }}
                                            >
                                              文创卧底 (你)
                                            </span>
                                          )
                                        ) : !localPlayer?.isGood ? (
                                          <span 
                                            className={`text-[7.5px] font-bold px-1 py-0.5 rounded border inline-block max-w-full truncate text-ellipsis ${
                                              p.isGood ? 'bg-stone-900 border-stone-800 text-stone-400' : 'bg-rose-950 text-rose-300 border-rose-500/30'
                                            }`}
                                            style={{ wordBreak: 'break-word' }}
                                          >
                                            {!p.isGood ? '文创卧底队友' : '待考青铜精灵'}
                                          </span>
                                        ) : (
                                          <span 
                                            className="text-[7px] bg-black/40 text-stone-500 border border-stone-850 px-1 py-0.5 rounded inline-block max-w-full truncate text-ellipsis"
                                            style={{ wordBreak: 'break-word' }}
                                          >
                                            待考星格 (身份未知)
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Inner Central Space: Show Neon Beast Art or Status Graphic */}
                                    <div className="flex-1 flex flex-col justify-center items-center py-1.5 relative z-10">
                                      {p.isEliminated ? (
                                        <div className="text-center">
                                          {renderBeastNeonIllustration('eliminated')}
                                          <span className="text-[7px] mt-0.5 text-red-500/80 font-bold block max-w-max mx-auto px-1 py-0.2 rounded border border-red-550/20">
                                            【魂散商周】
                                          </span>
                                        </div>
                                      ) : (
                                        /* Living scenarios */
                                        <div className="text-center w-full">
                                          {(() => {
                                            let visibleBeast: BeastType | 'unknown' = 'unknown';
                                            
                                            if (isCompleted) {
                                              visibleBeast = p.beast || 'unknown';
                                            } else if (p.isUser || p.id === localPlayer?.id) {
                                              if (localPlayer?.isGood) {
                                                const markedBeasts = bambooScrollNotes[p.id] || [];
                                                if (markedBeasts.length === 1) {
                                                  visibleBeast = markedBeasts[0];
                                                } else {
                                                  visibleBeast = 'unknown';
                                                }
                                              } else {
                                                visibleBeast = p.beast || 'unknown';
                                              }
                                            } else if (!localPlayer?.isGood) {
                                              if (!p.isGood) {
                                                visibleBeast = p.beast || 'unknown';
                                              } else {
                                                const markedBeasts = bambooScrollNotes[p.id] || [];
                                                if (markedBeasts.length === 1) {
                                                  visibleBeast = markedBeasts[0];
                                                }
                                              }
                                            } else {
                                              const markedBeasts = bambooScrollNotes[p.id] || [];
                                              if (markedBeasts.length === 1) {
                                                visibleBeast = markedBeasts[0];
                                              }
                                            }

                                            return (
                                              <div className="flex flex-col items-center justify-center">
                                                {renderBeastNeonIllustration(visibleBeast)}
                                                <span className="text-[7.5px] text-amber-500/80 mt-0.5 block select-none px-1 uppercase font-serif max-w-xs overflow-hidden text-center truncate">
                                                  {visibleBeast === 'unknown' ? '神魄深锁·待查' : `${visibleBeast} · ${getVesselByBeast(visibleBeast as BeastType)}`}
                                                </span>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>

                                    {/* Stamps Annotation controls directly inside the flipped card */}
                                    <div className="border-t border-stone-800/80 pt-1 z-10 shrink-0">
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[7px] text-amber-500/85 font-mono uppercase font-bold tracking-wider">
                                          标记法印契约 (Stamp Memo)
                                        </span>
                                      </div>

                                      {/* The beast selector buttons on card */}
                                      <div className="flex justify-between gap-0.5">
                                        {(['龟', '羊', '牛', '猫头鹰', '猪', '虎'] as BeastType[]).map((beastSymbol) => {
                                          const notes = bambooScrollNotes[p.id] || [];
                                          const isStamped = notes.includes(beastSymbol);
                                          
                                          // Calculate count of this beast across all players
                                          let pinCount = 0;
                                          players.forEach(pl => {
                                            const plNotes = bambooScrollNotes[pl.id] || [];
                                            if (plNotes.includes(beastSymbol)) {
                                              pinCount++;
                                            }
                                          });
                                          const limit = beastSymbol === twinBeast ? 2 : 1;
                                          const isBeastOverflow = pinCount > limit;

                                          let buttonStyle = 'bg-stone-950 text-stone-500 hover:text-stone-300 border-stone-900';
                                          if (isStamped) {
                                            if (isBeastOverflow) {
                                              buttonStyle = 'bg-red-950 text-red-400 font-bold border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.73)] animate-pulse';
                                            } else {
                                              buttonStyle = 'bg-amber-600 text-stone-950 font-black border-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]';
                                            }
                                          }

                                          return (
                                            <button
                                              key={beastSymbol}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleBambooStamp(p.id, beastSymbol);
                                              }}
                                              className={`flex-1 py-0.5 rounded text-[8.5px] text-center border font-mono transition-all duration-100 cursor-pointer ${buttonStyle} ${recentlyClickedStamps[`${p.id}-${beastSymbol}`] ? 'animate-stamp-shimmer-pulse' : ''}`}
                                              title={isBeastOverflow ? `[超额警告] ${beastSymbol}已标 ${pinCount} 人 (限 ${limit} 尊)` : `契约标记可标注 ${beastSymbol}`}
                                            >
                                              <span key={isStamped ? 'stamped' : 'unstamped'} className="inline-block animate-stamp-pop">
                                                {beastSymbol}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {/* Fold card back button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFlippedPlayers(prev => ({ ...prev, [p.id]: false }));
                                          handlePlayWhoosh();
                                        }}
                                        className="w-full mt-1.5 py-0.5 rounded bg-stone-900 hover:bg-stone-850 text-stone-500 hover:text-amber-300 text-[7px] font-bold uppercase transition duration-150 border border-stone-850 cursor-pointer"
                                      >
                                        👁 复归秘封 Box Back
                                      </button>
                                    </div>

                                  </div>
                                </div>

                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* INTERACTIVE CAULDRON & RETRIEVING CHIPPED ORACLE BONE SECTION */}
                    <div className="border-t border-stone-800/60 pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      
                      {/* BRONZE CAULDRON WITH FLOATING CHARACTERS */}
                      <div className="md:col-span-6 bg-stone-950/40 border border-stone-900 p-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 relative overflow-hidden">
                        <div className="space-y-1 text-center md:text-left z-10">
                          <span className="text-[10px] text-teal-400/90 font-serif font-bold tracking-wider block">
                            🍵 灵鼎焚香 · 风生符字
                          </span>
                          <p className="text-[9.5px] text-stone-400 max-w-sm leading-relaxed">
                            圣坛青铜重鼎正在升腾，卜辞法印凝结。好人们集齐线索需全员契合，若你已解出线索，可在翻开卡片下方打孔标记。
                          </p>
                        </div>

                        {/* HIGH-QUALITY ANIMATION FOR CAULDRON */}
                        <div className="relative h-20 w-44 flex justify-center items-end shrink-0 select-none">
                          {/* FLOATING SPARKLE RUNES */}
                          {['虎', '凶', '贞', '龙', '豕', '象', '鼎', '吉', '卜', '瑞', '契', '占'].map((char, index) => (
                            <motion.span
                              key={index}
                              initial={{ y: 20, x: (index - 5.5) * 11, opacity: 0, scale: 0.8 }}
                              animate={{
                                y: [-10, -95],
                                opacity: [0, 1, 1, 0],
                                scale: [0.8, 1.25, 0.85],
                              }}
                              transition={{
                                duration: 4.5 + (index % 3) * 1.5,
                                repeat: Infinity,
                                delay: index * 0.7,
                                ease: "easeOut"
                              }}
                              className="absolute text-amber-500/80 font-bold font-serif text-[10px] drop-shadow-[0_0_6px_rgba(245,158,11,0.85)] pointer-events-none"
                            >
                              {char}
                            </motion.span>
                          ))}
                          
                          {/* THE ACTUAL BRONZE TRIPOD DING SVG */}
                          <div className="z-10 relative">
                            <svg viewBox="0 0 120 80" className="w-20 h-14 text-emerald-600/70 drop-shadow-[0_0_10px_rgba(16,185,129,0.35)]">
                              <path d="M20,25 Q20,10 30,10 L35,10 Q25,20 25,25 Z" fill="currentColor" />
                              <path d="M100,25 Q100,10 90,10 L85,10 Q95,20 95,25 Z" fill="currentColor" />
                              <rect x="25" y="25" width="70" height="35" rx="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
                              <rect x="30" y="30" width="60" height="25" rx="4" className="fill-stone-950/95" />
                              <path d="M35,60 Q35,80 30,80 L35,80 Q40,75 40,60" fill="currentColor" />
                              <path d="M60,60 L60,80 L65,80 Q62,75 60,60" fill="currentColor" />
                              <path d="M85,60 Q85,80 90,80 L85,80 Q80,75 80,60" fill="currentColor" />
                              <circle cx="45" cy="42" r="2.5" fill="currentColor" className="animate-pulse" />
                              <circle cx="75" cy="42" r="2.5" fill="currentColor" className="animate-pulse" />
                              <line x1="45" y1="48" x2="75" y2="48" stroke="currentColor" strokeWidth="1" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* QUICK REDIRECTION & BONE STATUS CARD (Image 1 STYLE) */}
                      <div className="md:col-span-6 bg-stone-950/80 border-2 border-stone-850 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-inner relative overflow-hidden">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            <span className="text-stone-300 font-bold text-[10.5px]">甲骨卜占 02</span>
                            <span className="text-[7.5px] bg-amber-900/30 text-amber-400 border border-amber-600/20 px-1 rounded uppercase">未占·封存中</span>
                          </div>
                          <p className="text-[9px] text-stone-400 italic">
                            “龟腹甲裂痕深锁，巫待钻灼开兆，得受契文字...”
                          </p>
                          <span className="text-[8px] text-stone-500 font-mono block mt-1">背包甲骨数量：{oracleBones} 枚</span>
                        </div>

                        {/* REDIRECT TO GUESSING GAME ENVELOPE BUTTON */}
                        <button
                          onClick={() => {
                            setActiveTab('puzzle');
                            handlePlayWhoosh();
                          }}
                          className="px-4 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-700 hover:from-amber-400 hover:scale-[1.03] text-stone-950 font-black text-xxs tracking-wider duration-200 cursor-pointer shadow-md shadow-orange-950/50 flex flex-col items-center shrink-0"
                        >
                          <span>🔥 灼烧龟甲</span>
                          <span className="text-[7px] opacity-75 font-normal mt-0.5">(钻火求卜)</span>
                        </button>
                      </div>

                    </div>
                  </div>
                )}

                {/* 2. PUZZLE TAB: ENVELOPE CHARACTER DISASSEMBLY & KEYPAD CHESTS */}
                {activeTab === 'puzzle' && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2">
                        <div className="space-y-0.5">
                          <h3 className="text-xs font-bold font-sans text-stone-200 tracking-wider flex items-center space-x-1.5">
                            <BookOpen className="w-4 h-4 text-amber-500" />
                            <span>书房神道信封字谜解密（获取甲骨唯一法路）</span>
                          </h3>
                        </div>
                        <span className="text-[10px] bg-amber-950/40 text-amber-500 border border-amber-600/20 px-1.5 py-0.2 rounded">
                          限时 10 分钟 · 不掺杂游戏神职
                        </span>
                      </div>

                      {/* NO ENVELOPE PICKED */}
                      {!pickedPuzzle ? (
                        <div className="py-12 text-center space-y-4 max-w-md mx-auto">
                          <div className="w-16 h-16 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto text-amber-500 animate-pulse">
                            ✉️
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-stone-300">前方神道漂浮着未知的蜡封信信封...</h4>
                            <p className="text-[11px] text-stone-500">
                              信封内全部为小学生拆字字谜，解开新华字典11版拼版页码即可崩溃青铜锁，取出漂浮的甲骨核心道具。
                            </p>
                          </div>
                          <button
                            onClick={handlePickupEnvelope}
                            className="px-5 py-2 rounded-full bg-gradient-to-r from-teal-600 to-teal-800 text-stone-100 font-bold text-xs transition border border-teal-500 hover:scale-105 cursor-pointer shadow-lg"
                          >
                            🖐️ 伸手拾取随机古书信封 (Pick Envelope)
                          </button>
                        </div>
                      ) : (
                        /* PUZZLE DECRYPT INTERACTION GRID */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                          
                          {/* LEFT PANEL: HEAVY CARVED PUZZLE SHEET */}
                          <div className="bg-stone-950/80 border border-amber-900/30 p-4 rounded-xl flex flex-col justify-between space-y-3 relative overflow-hidden">
                            <span className="absolute top-1 right-2 text-[9px] font-mono text-stone-700">书信封号 #{pickedPuzzle.id}</span>
                            <div className="space-y-2">
                              <span className="text-[9px] font-mono text-amber-500/60 uppercase tracking-widest block">
                                【拆字封印谜面】
                              </span>
                              <div className="bg-black/60 p-3 rounded border border-amber-950 text-amber-200 text-xs font-mono font-medium leading-relaxed tracking-wider">
                                {pickedPuzzle.riddle}
                              </div>
                            </div>

                            {/* GUESS CHARACTER DICTIONARY FORM */}
                            <div className="space-y-2 border-t border-stone-900 pt-3">
                              <label className="text-[9px] text-stone-400 block">
                                🌲 请在下方尝试汉字并翻开字典：
                              </label>
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  maxLength={1}
                                  value={dictionaryQuery}
                                  onChange={(e) => setDictionaryQuery(e.target.value)}
                                  placeholder="输单汉字"
                                  className="w-20 bg-black border border-stone-800 text-center text-stone-100 text-sm font-bold rounded focus:outline-none focus:border-amber-500"
                                />
                                <button
                                  onClick={handleSearchDictionary}
                                  disabled={isDictionaryFlipping}
                                  className="flex-1 py-1 px-3 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-amber-400 hover:text-amber-300 font-bold rounded transition text-xxs flex items-center justify-center space-x-1.5 cursor-pointer"
                                >
                                  <Search className="w-3.5 h-3.5" />
                                  <span>{isDictionaryFlipping ? '正在查新华字典...' : '查阅新华字典11版 (Query)'}</span>
                                </button>
                              </div>
                            </div>

                            {/* DICTIONARY TURN BOOK PAGE ANIMATION ELEMENT */}
                            <div className="bg-stone-900/60 p-2 text-center rounded border border-stone-800">
                              {isDictionaryFlipping ? (
                                <span className="text-[10px] text-teal-400 font-mono animate-pulse">
                                  📖 标准纸页飞速翻动动画一闪而过... 28%, 64%, 99%...
                                </span>
                              ) : dictionaryPageResult !== null ? (
                                <div className="space-y-0.5">
                                  <span className="text-[9px] text-stone-500">《新华字典 11 版》显示标准页码</span>
                                  <div className="text-sm font-black text-teal-400 font-mono">
                                    第 ───【 {dictionaryPageResult} 】─── 页
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-stone-500 font-mono">
                                  字典静置于旁，请在输入汉字后翻页查看页数。
                                </span>
                              )}
                            </div>
                          </div>

                          {/* RIGHT PANEL: BRONZE UNLOCKED CHEST WITH Floating elements */}
                          <div className="bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                            <span className="text-[9px] font-mono text-amber-500/60 uppercase tracking-widest block">
                              【青铜御宝锁扣宝箱】
                            </span>

                            {chestState === 'closed' && (
                              <div className="text-center py-6 space-y-3">
                                <div className="w-12 h-12 bg-stone-950 rounded-full border border-stone-800 flex items-center justify-center mx-auto text-amber-400">
                                  <Lock className="w-5 h-5" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] text-stone-400 block">
                                    输入对应标准数字页码代码开启宝箱:
                                  </label>
                                  <div className="flex justify-center space-x-2 max-w-xs mx-auto">
                                    <input
                                      type="number"
                                      pattern="[0-9]*"
                                      placeholder="输入页数"
                                      value={chestInputCode}
                                      onChange={(e) => setChestInputCode(e.target.value)}
                                      className="w-24 bg-black border border-stone-800 text-center text-stone-100 text-xs font-bold rounded focus:outline-none"
                                    />
                                    <button
                                      onClick={handleUnlockChest}
                                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xxs transition duration-200 rounded cursor-pointer"
                                    >
                                      转起铜锁 (Unlock)
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* SUCCESS: GOLD FLOATING BONE ANIMATION */}
                            {chestState === 'success' && (
                              <div className="text-center py-4 space-y-3 relative">
                                <div className="absolute inset-0 bg-amber-500/5 rounded blur-xl pointer-events-none" />
                                <div className="space-y-1 z-10 relative">
                                  <span className="text-[9px] text-amber-400 font-bold animate-bounce block">
                                    🔓 锁扣崩裂！箱盖向两侧翻褶展开！
                                  </span>
                                  <h4 className="text-[11px] text-stone-300">温润白光盈盈泛起，一枚古篆甲骨浮游在空...</h4>
                                </div>

                                {!hasCollectedBone ? (
                                  <div 
                                    onClick={handleCollectFloatingBone}
                                    className="w-14 h-18 bg-radial from-amber-200 via-yellow-100 to-amber-700/40 rounded-xl border-2 border-amber-300 flex flex-col items-center justify-center mx-auto cursor-pointer animate-pulse-slow shadow-2xl hover:scale-110 active:scale-95 duration-300"
                                    title="点击收集此块浮空骨片放入行囊！"
                                  >
                                    <span className="text-xl">𐊃</span>
                                    <span className="text-[7px] text-stone-900 font-bold uppercase mt-0.5 animate-bounce">Click</span>
                                  </div>
                                ) : (
                                  <div className="text-teal-400 text-xs font-bold py-4 block flex items-center justify-center space-x-1">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>甲骨已安全收入背包</span>
                                  </div>
                                )}

                                <p className="text-[9px] text-stone-500 leading-normal">
                                  收集甲骨后点击下方「继续探寻信纸」销毁本简，以便捡取下一本神道卷契。
                                </p>
                              </div>
                            )}

                            {/* FAILURE BOX */}
                            {chestState === 'fail' && (
                              <div className="text-center py-6 space-y-2">
                                <div className="w-12 h-12 bg-red-950/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-500 animate-pulse">
                                  <Trash2 className="w-5 h-5" />
                                </div>
                                <h4 className="text-xs font-bold text-red-400">本次解密败裂，卜辞已化为碎渣</h4>
                                <p className="text-[10px] text-stone-500">
                                  页码输入错误致使锁孔自闭销毁，请继续寻找灵气刷新下一个信封挑战。
                                </p>
                              </div>
                            )}

                            {/* DISCARD / REFresh BUTTON */}
                            <div className="border-t border-stone-950 pt-2 flex space-x-2">
                              <button
                                onClick={() => setPickedPuzzle(null)}
                                className="w-full py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-300 transition text-[10px] font-bold rounded cursor-pointer"
                              >
                                🗑️ 扔掉该信/换领下一个信封 (Discard)
                              </button>
                            </div>
                          </div>

                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* 3. CHAMBER TAB: SECRED CHAMBER STAMPS CANDIDATE SYSTEMS */}
                {activeTab === 'chamber' && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    {!isAltarActivated ? (
                      <div className="bg-stone-950/80 backdrop-blur-sm border border-amber-500/10 p-6 rounded-2xl text-center space-y-4 py-12 my-auto flex flex-col items-center justify-center">
                        <div className="w-14 h-14 bg-stone-900 border border-amber-500/25 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-sm font-serif font-bold text-amber-400 tracking-wider">
                            🔮 殷商神兽密室尚未开启！
                          </h3>
                          <p className="text-xxs text-stone-400 leading-relaxed max-w-sm mx-auto">
                            由于上古大阵封印，探查之法未通。贞人或团队尚未在<span className="text-amber-300 font-bold">「解谶法印」 (Word Puzzle)</span> 中成功解开任何文创字谜。
                          </p>
                          <p className="text-[10px] text-stone-500 leading-relaxed max-w-sm mx-auto">
                            必须由你在「解谶法印」页面破解至少 1 个汉字折字谜匣以收取第一枚「卜兆甲骨」，方能借圣道灵气回响解密门扉，开启图腾密室！
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('puzzle')}
                          className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 text-stone-950 text-xxs font-black tracking-widest rounded-full transition cursor-pointer shadow-lg"
                        >
                          立即前往解谶字谜 ➔
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2">
                            <h3 className="text-xs font-bold font-sans text-stone-200 tracking-wider flex items-center space-x-1.5">
                              <Compass className="w-4 h-4 text-amber-500 animate-spin" />
                              <span>神圣神兽密室（无消耗，好人和卧底分执两种交互规范）</span>
                            </h3>
                            <span className="text-[10px] bg-indigo-950/50 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded">
                              单局好人进 1 次 / 卧底进 1 次
                            </span>
                          </div>

                          {/* USER IS GOOD GROUP */}
                          {localPlayer?.isGood ? (
                            <div className="space-y-4">
                              <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800 leading-relaxed text-xxs text-stone-400 flex items-start space-x-3">
                                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-stone-200">好人密室法则：</strong>
                                  你一生仅可入密室一次。雕像会对你显现慈悲，吐出3枚神兽动物印章，其中一尊【必为你真实的守护精灵】。
                                  你可点击这些印章，盖印在你自己的竹简卡契笔记中留存比对，绝无扣错的顾虑！
                                </div>
                              </div>

                              <div className="flex flex-col items-center justify-center p-6 bg-stone-950 rounded-xl border border-amber-900/10 text-center space-y-4">
                                {!localPlayer?.hasEnteredChamber ? (
                                  <button
                                    onClick={handleUserGoodEnterChamber}
                                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-800 text-stone-950 font-extrabold text-xs transition duration-300 hover:scale-[1.03] shadow-lg shadow-orange-950/30 cursor-pointer"
                                  >
                                    🔔 踏入神圣密室并叩问雕仙 (Enter Chamber)
                                  </button>
                                ) : (
                                  <div className="space-y-4 w-full">
                                    <span className="text-[10px] text-amber-500 font-mono block animate-pulse">
                                      ☀️ 雕像口中轰然翻滚落下了 3 尊青铜印章：
                                    </span>
                                    
                                    {/* 3 CANDIDATE STAMPS ANIMATION */}
                                    <div className="flex justify-center space-x-3">
                                      {chamberResultOptions.map((beast, idx) => {
                                        const isSelfStamped = (bambooScrollNotes[localPlayer?.id || 1] || []).includes(beast);
                                        return (
                                          <button
                                            key={idx}
                                            onClick={() => {
                                              // Stamp on themselves
                                              handleToggleBambooStamp(localPlayer?.id || 1, beast);
                                            }}
                                            className={`px-4 py-2 bg-gradient-to-b from-stone-900 to-stone-950 border border-amber-600/30 hover:border-teal-400 hover:bg-stone-900 rounded-xl flex flex-col items-center justify-between text-center min-w-20 transition-all duration-100 hover:scale-105 active:scale-95 cursor-pointer shadow ${recentlyClickedStamps[`${localPlayer?.id || 1}-${beast}`] ? 'animate-stamp-shimmer-pulse' : ''}`}
                                          >
                                            <span key={isSelfStamped ? 'stamped' : 'unstamped'} className="text-xs text-amber-400 font-bold block animate-stamp-pop">{beast}</span>
                                            <span className="text-[8px] text-stone-500 mt-1 block uppercase">{isSelfStamped ? '已刻印' : '盖印 Click'}</span>
                                          </button>
                                        );
                                      })}
                                    </div>

                                    <p className="text-[10px] text-stone-400 leading-normal max-w-md mx-auto">
                                      These stamps have been marked as options one of three for your survival. Clicking stamp logs it in Bamboo notes at player#1 grid!
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* USER IS UNDERCOVER GROUP */
                            <div className="space-y-4">
                              <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800 leading-relaxed text-xxs text-stone-400 flex items-start space-x-3">
                                <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-red-400">卧底密室法典（专属）：</strong>
                                  1. 卧底每人也只能进入密室探查一次，指选任何一个存活的好人探其候选三兽法身印章。
                                  2. 【淘汰验证（致命攻击）】：当你确认了某名好人的确切神兽时，你可以选他 + 填报他绑定神兽（不消耗甲骨，亦无需自备脑力外之甲骨）。匹配正确则那名好人当场直接淘汰（被天雷劈散）；错误不会扣除任何甲骨，亦无其他惩罚。
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* PANEL A: PATH PROBING */}
                                <div className="bg-stone-950 p-4 rounded-xl border border-stone-900 space-y-3">
                                  <span className="text-[9px] font-mono text-amber-500 block uppercase">
                                    🔍 探查好人守护三选一候选范围：
                                  </span>
                                  
                                  {!localPlayer?.hasEnteredChamber ? (
                                    <div className="flex space-x-2">
                                      <select
                                        id="chamber-target-sel"
                                        value={selectedChamberTargetId}
                                        onChange={(e) => setSelectedChamberTargetId(parseInt(e.target.value))}
                                        className="flex-1 bg-stone-900 text-stone-200 border border-stone-800 p-2 text-xs rounded"
                                      >
                                        {players.filter(p => !p.isUser).map(p => (
                                          <option key={p.id} value={p.id}>{p.name} (席位 #{p.id} {p.isEliminated ? '已除' : '存活'})</option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={handleUserUndercoverInquireChamber}
                                        className="px-4 py-1 bg-teal-600 hover:bg-teal-500 text-stone-950 font-bold text-xxs rounded transition cursor-pointer"
                                      >
                                        拜问 Totem (Probe)
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="text-center p-3 bg-stone-900/50 rounded border border-stone-800 text-stone-400 text-xxs font-sans">
                                      🔒 密室拜问图腾机会已使用过（每人限1次）。
                                    </div>
                                  )}

                                  {/* PROBIDED CHOSEN CANDIDATE STAMPS DISP */}
                                  {chamberResultOptions.length > 0 && (
                                    <div className="p-3 bg-black/60 rounded border border-amber-950/20 text-center">
                                      <span className="text-[9px] text-stone-500 block">该神魂候选印章滚溢落桌（三选一范围）：</span>
                                      <div className="flex justify-center space-x-2 mt-2">
                                        {chamberResultOptions.map((b, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-stone-900 border border-stone-800 text-amber-400 font-bold text-xs rounded">
                                            {b}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* PANEL B: ELIMINATION DEADLY GUESS */}
                                <div className="bg-stone-950 p-4 rounded-xl border-2 border-red-950 space-y-3">
                                  <span className="text-[9px] font-mono text-red-500 block uppercase font-bold">
                                    💀 卧底无痕暗杀（不消耗甲骨）：
                                  </span>

                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-xxs">
                                      <div>
                                        <label className="text-stone-500 block mb-1">选择淘汰目标：</label>
                                        <select
                                          value={chamberEliminateTargetId}
                                          onChange={(e) => setChamberEliminateTargetId(parseInt(e.target.value))}
                                          className="w-full bg-stone-900 text-stone-200 border border-stone-800 p-1.5 rounded"
                                        >
                                          {players.filter(p => !p.isUser && !p.isEliminated).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-stone-500 block mb-1">猜测神兽核心：</label>
                                        <select
                                          value={chamberEliminateGuessBeast}
                                          onChange={(e) => setChamberEliminateGuessBeast(e.target.value as BeastType)}
                                          className="w-full bg-stone-900 text-stone-200 border border-stone-800 p-1.5 rounded"
                                        >
                                          {(['龟', '羊', '牛', '猫头鹰', '猪', '虎'] as BeastType[]).map(b => (
                                            <option key={b} value={b}>{b} ({getVesselByBeast(b)})</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    <button
                                      onClick={handleUserUndercoverEliminateGuess}
                                      className="w-full py-2 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 border border-red-500/30 text-stone-100 font-bold text-xs rounded shadow transition cursor-pointer"
                                    >
                                      🔥 发动天雷淘汰诅咒 (Guess Kill)
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 4. TEAM VERIFICATION TAB */}
                {activeTab === 'check' && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    {!isAltarActivated ? (
                      <div className="bg-stone-950/80 backdrop-blur-sm border border-amber-500/10 p-6 rounded-2xl text-center space-y-4 py-12 my-auto flex flex-col items-center justify-center">
                        <div className="w-14 h-14 bg-stone-900 border border-amber-500/25 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-sm font-serif font-bold text-amber-400 tracking-wider">
                            🔮 殷商核心祭坛尚未激活！
                          </h3>
                          <p className="text-xxs text-stone-400 leading-relaxed max-w-sm mx-auto">
                            由于上古大阵封印，贞人或团队尚未在<span className="text-amber-300 font-bold">「解谶法印」 (Word Puzzle)</span> 中成功破解任何一个汉字字谜并开启宝箱。
                          </p>
                          <p className="text-[10px] text-stone-500 leading-relaxed max-w-sm mx-auto">
                            必须由你在「解谶法印」页面破解至少 1 个汉字折子谜盒以收取你的第一枚「卜兆甲骨」，方可借通玄灵机唤醒这神圣校验阵盘！
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveTab('puzzle')}
                          className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 text-stone-950 text-xxs font-black tracking-widest rounded-full transition cursor-pointer shadow-lg"
                        >
                          立即前往解谶字谜 ➔
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2">
                            <h3 className="text-xs font-bold font-sans text-stone-200 tracking-wider flex items-center space-x-1.5">
                              <Users className="w-4 h-4 text-amber-500" />
                              <span>三人组队身份核验台（1 甲骨 = 3人组队核验一次）</span>
                            </h3>
                            <span className="text-[10px] bg-teal-950 text-teal-400 px-2 py-0.5 rounded border border-teal-500/10">
                              任意玩家（你或AI）均可发起核准
                            </span>
                          </div>

                          <div className="bg-stone-950 p-4 rounded-xl border border-stone-900 space-y-4">
                            <div className="bg-stone-900/40 p-3 rounded text-xxs text-stone-400 leading-normal flex items-start space-x-2">
                              <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                              <span>
                                <strong>核验规则：</strong>输入提问神兽，系统反馈队伍中有或无。双生的【{twinBeast}】如果队伍里有任意一只（或者两只），统一仅报“有{twinBeast}”，绝不暴露具体数量。
                              </span>
                            </div>

                            {/* PICK 3 SELECTORS FOR LIVING SURVIVORS */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="text-stone-500 text-xxs block mb-1">队员 01</label>
                                <select
                                  value={checkedPlayer1}
                                  onChange={(e) => setCheckedPlayer1(parseInt(e.target.value))}
                                  className="w-full bg-stone-900 text-stone-200 border border-stone-800 p-2 text-xs rounded"
                                >
                                  {players.filter(p => !p.isEliminated).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} #{p.id}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-stone-500 text-xxs block mb-1">队员 02</label>
                                <select
                                  value={checkedPlayer2}
                                  onChange={(e) => setCheckedPlayer2(parseInt(e.target.value))}
                                  className="w-full bg-stone-900 text-stone-200 border border-stone-800 p-2 text-xs rounded"
                                >
                                  {players.filter(p => !p.isEliminated).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} #{p.id}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-stone-500 text-xxs block mb-1">队员 03</label>
                                <select
                                  value={checkedPlayer3}
                                  onChange={(e) => setCheckedPlayer3(parseInt(e.target.value))}
                                  className="w-full bg-stone-900 text-stone-200 border border-stone-800 p-2 text-xs rounded"
                                >
                                  {players.filter(p => !p.isEliminated).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} #{p.id}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* BEAST TO SELECT QUERY */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-900 pt-3">
                              <div className="flex items-center space-x-2">
                                <span className="text-xxs text-stone-400">提问神魂图腾是:</span>
                                <div className="flex space-x-1">
                                  {(['龟', '羊', '牛', '猫头鹰', '猪', '虎'] as BeastType[]).map(b => (
                                    <button
                                      key={b}
                                      type="button"
                                      onClick={() => setCheckedBeast(b)}
                                      className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                                        checkedBeast === b
                                          ? 'bg-amber-600 text-stone-950 font-bold'
                                          : 'bg-stone-905 border border-stone-800 text-stone-300'
                                      }`}
                                    >
                                      {b}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <button
                                onClick={handleExecuteTeamCheck}
                                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 text-stone-950 font-extrabold text-xs transition duration-200 cursor-pointer shadow"
                              >
                                🔮 消耗1甲骨执行核验 (Check Team)
                              </button>
                            </div>

                            {/* DISPLAY RITUAL FEEDBACK BLOCK */}
                            {verificationFeedback && (
                              <div className="p-4 rounded-xl bg-gradient-to-r from-stone-905 to-slate-900 text-center border-l-4 border-amber-500 relative overflow-hidden">
                                <div className="absolute top-1 right-2 text-[8px] font-mono text-stone-700">神印契典</div>
                                <span className="text-stone-500 text-[10px] block font-sans">
                                  三人核验盘：【 {verificationFeedback.teamNames.join('、')} 】
                                </span>
                                <div className="mt-2 flex items-center justify-center space-x-3 text-sm">
                                  <span className="text-stone-300 text-xs">追问神兽 【{verificationFeedback.beast}】：</span>
                                  {verificationFeedback.hasBeast ? (
                                    <span className="px-3 py-1 rounded bg-teal-900/30 text-teal-400 border border-teal-500/30 font-bold">
                                      📜 本组【有】该动物 Presence
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 rounded bg-red-950/30 text-red-400 border border-red-500/30 font-bold">
                                      ❌ 本组【无】该动物 Absence
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 5. ULTIMATE VERIFICATION TAB */}
                {activeTab === 'final' && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2">
                        <h3 className="text-xs font-bold font-sans text-stone-200 tracking-wider flex items-center space-x-1.5">
                          <CheckSquare className="w-5 h-5 text-amber-500" />
                          <span>终极验证台契约填报（需所有好人精灵身份配对填报全对）</span>
                        </h3>
                        <span className="text-[10px] bg-red-950 text-red-400 px-2.0 py-0.5 rounded border border-red-500/20 uppercase tracking-widest block font-bold">
                          差错一人即卧底大捷
                        </span>
                      </div>

                      {!localPlayer?.isGood ? (
                        <div className="bg-stone-950 p-6 rounded-xl border border-rose-500/30 space-y-4 flex flex-col items-center justify-center text-center py-10">
                          <div className="w-16 h-16 rounded-full bg-rose-950/40 border border-rose-500/40 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            <Lock className="w-8 h-8 text-rose-500 animate-pulse" />
                          </div>
                          <h4 className="text-sm font-bold text-rose-400 font-sans tracking-widest uppercase">
                            ── ⚠️ 神坛御令 · 卧底禁域 ──
                          </h4>
                          <p className="text-xs text-stone-300 max-w-md leading-relaxed">
                            你当前的星灵格位为 <span className="text-rose-400 font-bold font-sans">文创卧底</span>。
                            「终极验证合验台」是守护圣灵重整魂脉、回归青铜法器法座的祭祀圣地，<span className="text-amber-400 font-semibold">只有真正的青铜守护者（好人阵营）</span> 才有执掌并启动合验契约的威仪。
                          </p>
                          <div className="bg-stone-900/60 p-4 rounded-lg border border-stone-850 max-w-md text-[11px] text-stone-400 space-y-2.5 text-left leading-relaxed">
                            <span className="font-bold text-stone-300 block border-b border-stone-800 pb-1 flex items-center space-x-1">
                              <span>✦ 卧底阻截与蒙蔽策略指南</span>
                            </span>
                            <p>1. <strong className="text-rose-400 font-medium">绝不可篡夺合验：</strong> 卧底被禁止在终合校验台进行填报和最终献祭（杜绝了卧底直接提交破坏游戏的无趣情况）。</p>
                            <p>2. <strong className="text-rose-400 font-medium">混淆迷雾：</strong> 在【组队核验】和幽谧的【密室拷问】中对好人们投下疑云、混淆其最终各精灵与青铜簋/妇好鸮尊的配对。</p>
                            <p>3. <strong className="text-rose-400 font-medium">同伙会盟：</strong> 观察左下角的“暗议古简”，与同僚文创卧底密切商酌。在时限耗尽或将好人误导驱逐时，你便彻底主宰神坛风雷，篡夺青铜重器！</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-stone-950 p-4 rounded-xl border-2 border-amber-600/20 space-y-4">
                          {/* REAL-TIME PROGRESS INSTRUMENT */}
                          {(() => {
                            const goodPlayers = players.filter(p => p.isGood);
                            const pairedGoodCount = goodPlayers.filter(p => p.finalFilledBeast).length;
                            const totalGoodCount = goodPlayers.length;
                            const progressPercentage = totalGoodCount > 0 ? Math.round((pairedGoodCount / totalGoodCount) * 100) : 0;
                            const unpairedGoodPlayers = goodPlayers.filter(p => !p.finalFilledBeast);

                            return (
                              <div className="relative group bg-stone-900/60 rounded-xl border border-amber-500/30 p-3.5 flex flex-col space-y-2 transition-all hover:bg-stone-900 hover:border-amber-500/50">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-serif font-black text-amber-400 tracking-wider flex items-center space-x-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                    <span>圣灵名位归正仪 (Ritual Alignment Progress)</span>
                                  </span>
                                  <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-500/20">
                                    {pairedGoodCount} / {totalGoodCount} ({progressPercentage}%)
                                  </span>
                                </div>

                                {/* PROGRESS BAR */}
                                <div className="w-full bg-stone-950 rounded-full h-2.5 overflow-hidden border border-stone-800">
                                  <div 
                                    className="bg-gradient-to-r from-amber-500 to-teal-400 h-full rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-stone-500">
                                  <span>已填配对 / 总需归依名位</span>
                                  <span className="text-amber-500/80 cursor-help flex items-center space-x-1 font-sans">
                                    <span>悬停(Hover)查看未配对精灵</span>
                                    <Info className="w-3 h-3 text-amber-500" />
                                  </span>
                                </div>

                                {/* TOOLTIP ON HOVER */}
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-stone-950 border-2 border-amber-500/40 rounded-lg p-3 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none scale-95 group-hover:scale-100">
                                  <div className="text-xxs font-bold text-amber-400 border-b border-stone-850 pb-1.5 mb-1.5 uppercase tracking-wider font-serif">
                                    🏮 待指引归正之守护精灵 (Unpaired Good Guardians)
                                  </div>
                                  {unpairedGoodPlayers.length > 0 ? (
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {unpairedGoodPlayers.map(p => (
                                        <div key={p.id} className="flex items-center justify-between text-stone-300 font-mono text-xxs bg-stone-900/40 px-2 py-1 rounded">
                                          <span>{p.name} <span className="text-stone-500 text-[9px]">(ID: #{p.id})</span></span>
                                          <span className="text-rose-400 text-[10px] font-bold">未对位</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-teal-400 font-bold font-mono text-xxs text-center py-1">
                                      ✓ 所有守护精灵已全部认领配对！
                                    </div>
                                  )}
                                  <div className="text-[8px] text-stone-500 pt-1.5 mt-1.5 border-t border-stone-850 text-right">
                                    请在下方下拉菜单中，分别为星位归纳对应神图
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="bg-stone-900/40 p-3 rounded text-xxs text-stone-400 leading-normal flex items-start space-x-2">
                            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-stone-300">终局胜负决定书：</strong>
                              好人要想获得胜利，必须确保【所有好人精灵的神兽身份在终极验证台全部配对填报正确】。
                              即使期间有部分好人精灵不幸被卧底淘汰牺牲，也不影响好人们的最终胜负，只要在这里填报全对即可！
                              下面请为战局上所有的精灵（含生还和已陨落的成员）分配合适的神兽归属：
                            </div>
                          </div>

                          {/* GOOD SURVIVORS GUESSING FILLERS PANEL */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {players.map(p => (
                              <div 
                                key={p.id} 
                                className={`p-2.5 rounded border flex items-center justify-between transition-all duration-300 ${
                                  p.finalFilledBeast 
                                    ? 'bg-amber-950/20 border-amber-500/50 animate-final-filled-glow-pulse shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/20' 
                                    : p.isEliminated 
                                      ? 'bg-stone-900/30 border-stone-900/40 opacity-75' 
                                      : 'bg-stone-900/60 border-stone-800'
                                }`}
                              >
                                <div className="space-y-0.5 text-left">
                                  <span className="text-xs font-bold text-stone-200">
                                    {p.name} (#{p.id})
                                    {p.isEliminated && (
                                      <span className="text-[10px] text-rose-500 font-normal ml-1 bg-rose-950/20 px-1 py-0.5 rounded border border-rose-500/10">已陨落</span>
                                    )}
                                  </span>
                                  <div className="text-[9px] text-stone-500">
                                    {isCompleted ? (
                                      p.isGood ? (p.isUser ? '青铜守护 (你)' : '青铜守护') : (p.isUser ? '文创卧底 (你)' : '文创卧底')
                                    ) : (p.isUser) ? (
                                      localPlayer?.isGood ? '待考星格 (你 - 身份未知)' : '文创卧底 (你)'
                                    ) : !localPlayer?.isGood ? (
                                      p.isUser ? '文创卧底 (你)' : p.isGood ? '待考青铜精灵' : '文创卧底队友'
                                    ) : (
                                      '待考星格 (身份未知)'
                                    )}
                                  </div>
                                </div>

                                {/* Guess beast dropdown selection */}
                                <select
                                  value={p.finalFilledBeast || ''}
                                  onChange={(e) => {
                                    const val = e.target.value ? (e.target.value as BeastType) : null;
                                    handleUpdatePlayerFinalGuess(p.id, val);
                                  }}
                                  className="bg-black text-stone-200 text-xs p-1.5 rounded border border-stone-800 max-w-36 focus:outline-none"
                                >
                                  <option value="">点击配对</option>
                                  {(['龟', '羊', '牛', '猫头鹰', '猪', '虎'] as BeastType[]).map(b => (
                                    <option key={b} value={b}>{b} ({getVesselByBeast(b)})</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>

                          {/* SUBMIT & PREVIEW ACTION ROW */}
                          <div className="border-t border-stone-900 pt-4 flex flex-col items-center space-y-3.5">
                            <div className="flex flex-wrap items-center justify-center gap-3">
                              {/* Preview Sacrifice button */}
                              <button
                                type="button"
                                onClick={() => setShowPreviewSacrifice(prev => !prev)}
                                className={`px-5 py-2.5 rounded-lg border text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center space-x-1.5 ${
                                  showPreviewSacrifice 
                                    ? 'bg-teal-950 border-teal-500/50 text-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.25)]' 
                                    : 'bg-stone-900 hover:bg-stone-850 border-stone-800 hover:border-stone-700 text-stone-300'
                                }`}
                              >
                                {showPreviewSacrifice ? (
                                  <>
                                    <EyeOff className="w-4 h-4 text-teal-400" />
                                    <span>收起预览献祭 (Hide Preview)</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4 text-amber-500 animate-pulse" />
                                    <span>👁️ 预览献祭神契 (Preview Sacrifice)</span>
                                  </>
                                )}
                              </button>

                              {/* Submit button */}
                              <button
                                onClick={handleFinalVerifySubmission}
                                className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-700 text-stone-950 font-black text-xs tracking-widest hover:scale-105 transition shadow-xl cursor-pointer"
                              >
                                🏛️ 开始乾坤大合验 ── 确认献祭 (Submit Verification)
                              </button>
                            </div>

                            {/* PREVIEW CONTAINER */}
                            <AnimatePresence>
                              {showPreviewSacrifice && (
                                <motion.div
                                  initial={{ opacity: 0, y: -8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -8 }}
                                  className="w-full max-w-lg bg-stone-950/90 border border-amber-500/30 rounded-xl p-4 text-left space-y-3 shadow-inner"
                                >
                                  <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                                    <h4 className="text-xs font-serif font-black text-amber-400 tracking-wider flex items-center space-x-1.5">
                                      <span>🔮 献祭神印对位预览清单 (Sacrificial Alignment Preview)</span>
                                    </h4>
                                    <span className="text-[10px] text-stone-500 font-mono">
                                      已填配对率: {Math.round((players.filter(p => p.finalFilledBeast).length / players.length) * 100)}%
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xxs font-mono text-stone-400 max-h-48 overflow-y-auto pr-1">
                                    {players.map(p => {
                                      const isFilled = !!p.finalFilledBeast;
                                      return (
                                        <div 
                                          key={p.id} 
                                          className={`flex items-center justify-between p-2 rounded border ${
                                            isFilled 
                                              ? 'bg-amber-950/20 border-amber-500/30' 
                                              : 'bg-stone-900/40 border-stone-850 opacity-60'
                                          }`}
                                        >
                                          <div className="flex flex-col">
                                            <span className="font-bold text-stone-300">{p.name} <span className="text-stone-500 font-normal">#{p.id}</span></span>
                                            <span className="text-[8px] text-stone-500">
                                              {p.isEliminated ? '已陨落' : '在世生存'}
                                            </span>
                                          </div>
                                          <div className="text-right">
                                            {isFilled ? (
                                              <span className="text-amber-400 font-black">
                                                {p.finalFilledBeast} <span className="text-[8px] text-stone-400 font-normal">({getVesselByBeast(p.finalFilledBeast!)})</span>
                                              </span>
                                            ) : (
                                              <span className="text-rose-400/80 italic">待指引配对</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="text-[10px] text-stone-400 leading-normal bg-stone-900/40 p-2 rounded border border-stone-850">
                                    💡 <strong className="text-stone-300">祭官提示：</strong>
                                    在进行大合验之前，确保每个精灵法身都和你的推理精确吻合。如有误区可在上方一并修正。
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* END STATE DRAMATIC DISPLAY CARD BANNER */}
                <AnimatePresence>
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="absolute inset-4 rounded-xl bg-stone-950/95 border-2 border-amber-500/50 p-6 z-40 flex flex-col items-center justify-center text-center shadow-2xl overflow-y-auto"
                    >
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3">
                        {hasWon ? (
                          <Award className="w-10 h-10 text-amber-400 animate-bounce" />
                        ) : (
                          <AlertCircle className="w-10 h-10 text-rose-500 animate-pulse" />
                        )}
                      </div>

                      <h2 className={`text-xl md:text-2xl font-black font-sans tracking-widest ${hasWon ? 'text-amber-400' : 'text-rose-500'}`}>
                        {hasWon ? '【大吉 · 乾坤安定】' : '【大凶 · 社稷蒙尘】'}
                      </h2>
                      <p className="text-[10px] text-stone-500 uppercase font-mono tracking-widest mt-1">
                        {hasWon ? 'Bronze Guardians Win the Game!' : 'Cultural Undercovers Outsmarted Altar!'}
                      </p>

                      <div className="my-4 max-w-md border-y border-stone-800 py-4 text-xs leading-relaxed text-stone-300 font-sans">
                        {hasWon ? (
                          <span>
                            “天命玄鸟，降而生商！” 祭官大喜！经过极其精准的骨雕破译和三人组队核验，7位圣灵全部毫发无伤地回到了属于他们对应的青铜簋、四羊方尊、妇好鸮尊等重器法身上！
                            古钟齐齐长鸣，文创卧底魔灵被刺目白光蒸发融去！商周盛世气运万古流芳！
                          </span>
                        ) : (
                          <span>
                            “重器蒙尘，碎铜漫天。” 
                            重器祭祀终告崩坏！卧底功成！要么在途中对守护精灵进行了无情抹消（淘汰），要么在终局填报时错认了法身，或是卧底暗中混入瞒天过海！
                            商周青铜祭器的神力荡然无存，文创邪灵彻底执掌乾坤风雷！
                          </span>
                        )}
                      </div>

                      {/* PLAYER PERFORMANCE METRICS PANEL */}
                      <div className="w-full max-w-sm bg-stone-900/40 rounded-xl border border-amber-500/20 p-3.5 mb-4 text-left font-sans space-y-2.5 shadow-inner">
                        <div className="flex items-center space-x-1.5 text-stone-300 border-b border-stone-800 pb-1.5">
                          <Award className="w-4 h-4 text-amber-500" />
                          <h3 className="text-xxs font-bold tracking-wider font-sans uppercase">
                            🏆 殷墟胜果与大合验纪实 (Trial Performance Record)
                          </h3>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {/* Stat item 1: Puzzles Solved */}
                          <div className="bg-black/40 p-2 rounded-lg border border-stone-850 flex flex-col items-center text-center justify-between">
                            <span className="text-[7.5px] text-stone-500 font-bold uppercase tracking-wider block mb-0.5">
                              折字谜破解
                            </span>
                            <span className="text-base font-black text-amber-400 font-mono">
                              {numPuzzlesSolved} <span className="text-[9px] font-normal text-stone-400">次</span>
                            </span>
                            <span className="text-[7px] text-stone-400 leading-tight mt-0.5">
                              获得骨卜灵气
                            </span>
                          </div>

                          {/* Stat item 2: Correct Identity Guesses */}
                          <div className="bg-black/40 p-2 rounded-lg border border-stone-850 flex flex-col items-center text-center justify-between">
                            <span className="text-[7.5px] text-stone-500 font-bold uppercase tracking-wider block mb-0.5">
                              法身正确配对
                            </span>
                            <span className="text-base font-black text-teal-400 font-mono">
                              {players.filter(p => p.isGood && p.finalFilledBeast === p.beast).length} <span className="text-[9px] font-normal text-stone-400">/ 7</span>
                            </span>
                            <span className="text-[7px] text-stone-400 leading-tight mt-0.5 webkit-line-clamp-1">
                              {Math.round((players.filter(p => p.isGood && p.finalFilledBeast === p.beast).length / 7) * 100)}% 配对率
                            </span>
                          </div>

                          {/* Stat item 3: Time taken */}
                          <div className="bg-black/40 p-2 rounded-lg border border-stone-850 flex flex-col items-center text-center justify-between">
                            <span className="text-[7.5px] text-stone-500 font-bold uppercase tracking-wider block mb-0.5">
                              神契大阵耗时
                            </span>
                            <span className="text-[11px] font-black text-orange-400 font-mono py-1">
                              {Math.floor((1200 - timeRemaining) / 60)}分{(1200 - timeRemaining) % 60}秒
                            </span>
                            <span className="text-[7px] text-stone-400 leading-tight mt-0.5">
                              总限 20:00 结束
                            </span>
                          </div>
                        </div>

                        {/* Quick visual evaluation description */}
                        <div className="bg-stone-950/80 p-2 border border-stone-900 rounded text-[9px] text-stone-400 leading-normal flex items-start space-x-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <p>
                            根据太古契约记录，本局中你总计亲手破译了 <strong className="text-stone-200">{numPuzzlesSolved}</strong> 次汉字解谶信封。最终大合验时，全部守护精灵有 <strong className="text-teal-400">{players.filter(p => p.isGood && p.finalFilledBeast === p.beast).length} 位</strong> 神兽图腾得到完美归正。整场大祭祀总计运作时间为 <strong className="text-stone-200">{Math.floor((1200 - timeRemaining) / 60)} 分 {(1200 - timeRemaining) % 60} 秒</strong>。
                          </p>
                        </div>
                      </div>

                      {/* GAME STATE DETAILED CHEAT SHEET */}
                      <div className="bg-black/60 rounded border border-stone-900 p-3 w-full max-w-sm text-left font-mono text-[9px] text-stone-400 space-y-1 mb-4">
                        <span className="text-stone-500 font-bold block pb-1 border-b border-stone-900">
                          附：本局大结局精灵底牌详情 / Solution List
                        </span>
                        {players.map(p => (
                          <div key={p.id} className="flex justify-between">
                            <span>#{p.id} {p.name}:</span>
                            <span className={p.isGood ? 'text-teal-400' : 'text-rose-500 font-semibold'}>
                              {p.isGood ? `好人 - ${p.beast}（${p.vessel}）` : '文创卧底魔'} {p.isEliminated && '（已被淘汰）'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={startNewGame}
                        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 text-stone-950 font-black text-xs tracking-wider border border-amber-400 hover:scale-105 transition cursor-pointer shadow-lg"
                      >
                        重新起阵，乾坤再铸 (Play Again)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>



            </div>

            {/* RIGHT SIDE: ALTAR TEXT LOG MESSAGE FEED & PRIVATE CHAT (SPAN 4) */}
            <div className="lg:col-span-4 flex flex-col space-y-5">
              
              {/* PRIMARY FEED OF LIVE EVENTS AND STORIES */}
              <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-4 flex flex-col h-[350px] overflow-hidden relative">
                <span className="text-[9px] font-mono text-amber-500/60 uppercase tracking-widest block mb-1">
                  📜 殷商神殿契印纪事
                </span>

                <div ref={logsContainerRef} className="overflow-y-auto custom-scrollbar my-2.5 flex-1 space-y-2.5 pr-1.5 text-xxs">
                  {logs
                    .filter((log) => {
                      if (localPlayer?.isGood && log.type === 'undercover') {
                        return false;
                      }
                      return true;
                    })
                    .map((log) => {
                    let typeColor = 'text-stone-400';
                    let bg = 'bg-stone-950/40 border-stone-900';
                    let tag = '';

                    if (log.type === 'system') {
                      typeColor = 'text-amber-300';
                      bg = 'bg-amber-950/20 border-amber-900/30';
                      tag = '👑 系统: ';
                    } else if (log.type === 'good') {
                      typeColor = 'text-teal-400';
                      bg = 'bg-teal-950/5 border-teal-950/40';
                      tag = '👤 ';
                    } else if (log.type === 'undercover') {
                      typeColor = 'text-teal-400';
                      bg = 'bg-teal-950/5 border-teal-950/40';
                      tag = '👤 ';
                    } else if (log.type === 'totem_good') {
                      typeColor = 'text-yellow-400';
                      bg = 'bg-yellow-950/20 border-yellow-500/20';
                      tag = '🌤️ Totem: ';
                    } else if (log.type === 'totem_bad') {
                      typeColor = 'text-purple-400';
                      bg = 'bg-purple-950/20 border-purple-500/20';
                      tag = '🔥 Totem: ';
                    } else if (log.type === 'chat') {
                      typeColor = 'text-stone-300';
                      bg = 'bg-stone-900/40 border-stone-850';
                    }

                    return (
                      <div key={log.id} className={`p-2 rounded-xl border leading-relaxed ${bg}`}>
                        <div className="flex items-center justify-between mb-0.5 opacity-60 font-mono text-[8px]">
                          <span>{tag}{log.sender}</span>
                          <span>{log.timestamp}</span>
                        </div>
                        <p className={`font-sans tracking-wide ${typeColor}`}>{log.message}</p>
                      </div>
                    );
                  })}
                </div>

                {/* LOGS COUNT REFRESH INDICATOR */}
                <span className="text-[8px] text-stone-600 block text-right mt-1">核验日志已锁定安全记录</span>
              </div>

              {/* USER IS NOT GOOD: EXQUISITE UNDERCOVER PRIVATE BOARD */}
              {!localPlayer?.isGood && (
                <div className="bg-gradient-to-r from-red-950/40 to-stone-900/80 border-2 border-red-500/20 p-4 rounded-2xl space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest block font-bold">
                      💬 卧底私聊密契秘语 (Private Scroll)
                    </span>
                    <span className="text-[8px] bg-red-900/30 text-red-400 border border-red-500/20 px-1 py-0.1 rounded">
                      好人对其一无所知
                    </span>
                  </div>

                  <div className="max-h-24 h-24 overflow-y-auto custom-scrollbar bg-black/60 p-2 rounded text-[10px] space-y-1.5 border border-red-950 font-mono text-rose-300 leading-normal">
                    {privateUndercoverMessages.map((msg, idx) => (
                      <div key={idx} className="border-b border-red-950/30 pb-1">
                        {msg}
                      </div>
                    ))}
                  </div>

                  {/* QUICK SEND CHAT */}
                  <div className="flex space-x-1.5">
                    <input
                      type="text"
                      className="flex-1 bg-black text-[10px] border border-red-950/40 px-2 py-1 rounded text-red-100 placeholder-red-800 focus:outline-none"
                      placeholder="悄声输入密语..."
                      maxLength={32}
                      value={newCoverChatText}
                      onChange={(e) => setNewCoverChatText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCoverChatText.trim()) {
                          const cleanText = newCoverChatText.trim();
                          setPrivateUndercoverMessages(prev => [...prev, `${userName}（你）: ${cleanText}`]);
                          setNewCoverChatText('');
                          handlePlayCrack();
                          // Sim some response
                          setTimeout(() => {
                            const responses = ["明白，这就去办！", "收到，继续盯梢姬发！", "我来获取甲骨。"];
                            setPrivateUndercoverMessages(p => [...p, `队友悄悄回你：${responses[Math.floor(Math.random() * responses.length)]}`]);
                          }, 1500);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newCoverChatText.trim()) {
                          const cleanText = newCoverChatText.trim();
                          setPrivateUndercoverMessages(prev => [...prev, `${userName}（你）: ${cleanText}`]);
                          setNewCoverChatText('');
                          handlePlayCrack();
                        }
                      }}
                      className="px-2 py-1 bg-red-800 text-stone-100 text-[9px] font-bold rounded hover:bg-red-700 transition cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}



              {/* HELPER DESKTOP STAMPS MONITOR & DIVINE BEASTS BONDS GRAPH */}
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-3 shadow-md">
                <div 
                  onClick={() => {
                    setIsBondsCollapsed(!isBondsCollapsed);
                    handlePlayWhoosh();
                  }}
                  className="flex items-center justify-between border-b border-stone-900 pb-1.5 cursor-pointer hover:text-amber-300 transition"
                  title="点击折叠或展开神兽图腾控制面板"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest block">
                      🏮 远古神兽图腾与羁绊契约
                    </span>
                    <span className="text-[8px] text-amber-500/60 font-mono">
                      {isBondsCollapsed ? '[展开 ▽]' : '[折叠 △]'}
                    </span>
                  </div>
                  <span className="text-[7.5px] font-sans text-stone-500 font-bold uppercase">Totems & Bonds</span>
                </div>
                
                {!isBondsCollapsed && (
                  <>
                    <p className="text-[9.5px] text-stone-400 leading-normal italic">
                      点击下方图腾，可召唤『神尊候选契合矩阵』，深度拆检好人专属守护权属，或直接刻印/擦除竹简契印！
                    </p>

                {/* Grid Nodes */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {(['龟', '羊', '牛', '猪', '虎', '猫头鹰'] as BeastType[]).map((beastSymbol) => {
                    let pinCount = 0;
                    players.forEach(p => {
                      const notes = bambooScrollNotes[p.id] || [];
                      if (notes.includes(beastSymbol)) {
                        pinCount++;
                      }
                    });
                    const limit = beastSymbol === twinBeast ? 2 : 1;
                    const isOverflow = pinCount > limit;
                    const isMatched = pinCount === limit;

                    return (
                      <div
                        key={beastSymbol}
                        onClick={() => {
                          setSelectedBeastInBonds(selectedBeastInBonds === beastSymbol ? null : beastSymbol);
                          handlePlayCrack();
                        }}
                        className={`relative p-1.5 px-2 rounded-xl border flex flex-col items-center justify-between transition cursor-pointer duration-150 ${
                          selectedBeastInBonds === beastSymbol
                            ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                            : isOverflow
                              ? 'bg-red-950/20 border-red-500/40 hover:border-red-500'
                              : isMatched
                                ? 'bg-teal-950/15 border-teal-500/35 hover:border-teal-400'
                                : 'bg-stone-900 border-stone-850 hover:border-stone-700'
                        }`}
                      >
                        {/* Mini Scaled Illustration */}
                        <div className="w-8 h-8 flex items-center justify-center scale-60 origin-center select-none">
                          {renderBeastNeonIllustration(beastSymbol, selectedBeastInBonds === beastSymbol)}
                        </div>

                        {/* Name */}
                        <span className="text-[9.5px] font-serif font-black text-stone-200 mt-0.5 tracking-wider">
                          {beastSymbol}
                        </span>

                        {/* Pill count */}
                        <span className={`text-[8.5px] font-mono mt-0.5 px-1 rounded-full scale-90 ${
                          isOverflow
                            ? 'bg-red-950 text-red-500 font-bold animate-pulse'
                            : isMatched
                              ? 'bg-teal-950 text-teal-400 font-bold'
                              : pinCount > 0
                                ? 'bg-amber-950 text-amber-500'
                                : 'bg-stone-950 text-stone-600'
                        }`}>
                          {pinCount}/{limit}
                        </span>

                        {/* Double icon badge if current Twin Beast */}
                        {beastSymbol === twinBeast && (
                          <div className="absolute top-0 right-0 bg-yellow-950/80 border border-yellow-500/30 text-[6.5px] font-serif font-black text-yellow-500 scale-[0.75] px-1 rounded transform translate-x-1.5 -translate-y-1.5 leading-none py-[1px] uppercase">
                            双生
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Resonance Covenant Bonds list */}
                <div className="space-y-1 mt-1 border-t border-stone-900 pt-2 text-left">
                  <div className="text-[8px] font-mono text-stone-500 uppercase tracking-widest leading-none mb-1">
                    宿命至圣圣契共鸣 (Covenant Resonance)
                  </div>

                  {/* Bond 1: 双生 */}
                  {(() => {
                    let twinCount = 0;
                    players.forEach(p => {
                      const notes = bambooScrollNotes[p.id] || [];
                      if (notes.includes(twinBeast)) {
                        twinCount++;
                      }
                    });
                    const isResonated = twinCount === 2;
                    const isConflict = twinCount > 2;
                    return (
                      <div className={`p-1 px-1.5 rounded-lg border text-xxs flex justify-between items-center transition ${
                        isResonated 
                          ? 'bg-amber-950/30 border-amber-400/50 text-amber-300' 
                          : isConflict
                            ? 'bg-red-950/20 border-red-500/40 text-red-400 animate-pulse'
                            : 'bg-stone-900/40 border-stone-850/50 text-stone-500'
                      }`}>
                        <div className="flex items-center space-x-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${isResonated ? 'bg-amber-400' : isConflict ? 'bg-red-500' : 'bg-stone-700'}`} />
                          <span className="font-serif text-[10px]">两仪相生 【{twinBeast}之双生】</span>
                        </div>
                        <span className="font-mono text-[9px] font-bold">
                          {isResonated ? '✦ 共振' : isConflict ? '🔴 过载' : `${twinCount}/2`}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Bond 2: 山泽 */}
                  {(() => {
                    let turtleCount = 0;
                    let sheepCount = 0;
                    players.forEach(p => {
                      const notes = bambooScrollNotes[p.id] || [];
                      if (notes.includes('龟')) turtleCount++;
                      if (notes.includes('羊')) sheepCount++;
                    });
                    const isResonated = turtleCount > 0 && sheepCount > 0;
                    return (
                      <div className={`p-1 px-1.5 rounded-lg border text-xxs flex justify-between items-center transition ${
                        isResonated 
                          ? 'bg-teal-950/20 border-teal-500/40 text-teal-300' 
                          : 'bg-stone-900/40 border-stone-850/50 text-stone-500'
                      }`}>
                        <div className="flex items-center space-x-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${isResonated ? 'bg-teal-400' : 'bg-stone-700'}`} />
                          <span className="font-serif text-[10px]">山泽载德 (龟 ↔ 羊)</span>
                        </div>
                        <span className="font-mono text-[9px] font-bold">
                          {isResonated ? '✦ 共振' : '未鸣'}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Bond 3: 稼穑 */}
                  {(() => {
                    let cowCount = 0;
                    let pigCount = 0;
                    players.forEach(p => {
                      const notes = bambooScrollNotes[p.id] || [];
                      if (notes.includes('牛')) cowCount++;
                      if (notes.includes('猪')) pigCount++;
                    });
                    const isResonated = cowCount > 0 && pigCount > 0;
                    return (
                      <div className={`p-1 px-1.5 rounded-lg border text-xxs flex justify-between items-center transition ${
                        isResonated 
                          ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-300' 
                          : 'bg-stone-900/40 border-stone-850/50 text-stone-500'
                      }`}>
                        <div className="flex items-center space-x-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${isResonated ? 'bg-emerald-400' : 'bg-stone-700'}`} />
                          <span className="font-serif text-[10px]">仓廪社稷 (牛 ↔ 猪)</span>
                        </div>
                        <span className="font-mono text-[9px] font-bold">
                          {isResonated ? '✦ 共振' : '未鸣'}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between border-t border-stone-900 pt-2 text-[10px]">
                  <span className="text-stone-500 font-serif">重订所有标记：</span>
                  <button
                    onClick={() => {
                      if (confirm("确定要重置竹简手记吗？这将抹净所有格子的标记。")) {
                        setBambooScrollNotes(
                          Object.fromEntries(players.map(p => [p.id, []]))
                        );
                        handlePlayWhoosh();
                      }
                    }}
                    className="px-2.5 py-0.5 border border-stone-800 hover:border-red-500 rounded text-[9px] text-stone-500 hover:text-red-400 transition cursor-pointer"
                  >
                    全部抹净 Reset
                  </button>
                </div>
              </>
            )}
          </div>

            </div>

          </div>
        )}

      </div>

      {/* 卧底暗杀（杀人）结果立即弹窗 POPUP MODAL */}
      <AnimatePresence>
        {assassinationResult?.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              className="bg-gradient-to-b from-stone-950 via-stone-900 to-black border-2 border-red-500/40 w-full max-w-lg rounded-3xl p-6 md:p-8 space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] relative overflow-hidden text-left"
            >
              {/* Animated stream light bar */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
              
              {/* Giant icon header */}
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className={`p-4 rounded-full border ${assassinationResult.isSuccess ? 'bg-red-950/50 border-red-500 text-red-500 animate-bounce' : 'bg-stone-950 border-stone-800 text-stone-500'}`}>
                  {assassinationResult.isSuccess ? (
                    <Skull className="w-12 h-12" />
                  ) : (
                    <Shield className="w-12 h-12" />
                  )}
                </div>
                <h2 className={`text-xl md:text-2xl font-bold font-serif tracking-widest ${assassinationResult.isSuccess ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500' : 'text-stone-300'}`}>
                  {assassinationResult.isSuccess ? '【法身碎裂 · 命格陨落】' : '【天道反震 · 诅咒落空】'}
                </h2>
                <p className="text-xxs font-mono text-stone-500 tracking-widest">
                  SHANG ZHOU ALTAR ELIMINATION BULLETIN
                </p>
              </div>

              {/* Detail block */}
              <div className="bg-stone-950/90 border border-stone-800/80 p-5 rounded-2xl space-y-3.5 relative">
                {/* mesh layer */}
                <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(239,68,68,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.15)_1px,transparent_1px)] bg-[size:8px_8px] rounded-2xl" />
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-400 font-sans">暗探出手者 (Undercover):</span>
                  <span className="text-stone-200 font-bold">{assassinationResult.killerName}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-stone-900 pt-3">
                  <span className="text-stone-400 font-sans">受击的目标 (Target Player):</span>
                  <span className="text-red-400 font-bold font-serif text-sm">
                    {assassinationResult.targetName} <span className="text-stone-500 text-xxs font-mono bg-stone-900 border border-stone-850 px-1 py-0.5 rounded ml-1">席位 #{assassinationResult.targetId}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-stone-900 pt-3">
                  <span className="text-stone-400 font-sans">刺探锁定法宝 (Guessed):</span>
                  <span className="text-amber-500 font-black font-serif bg-amber-950/20 border border-amber-900/50 px-2 py-0.5 rounded">
                    {assassinationResult.guessedBeast}（对应 {getVesselByBeast(assassinationResult.guessedBeast)}）
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-stone-900 pt-3">
                  <span className="text-stone-400 font-sans">受害者真图腾 (True Beast):</span>
                  <span className={`font-black font-serif px-2 py-0.5 rounded ${assassinationResult.isSuccess ? 'bg-red-950 border border-red-900/60 text-red-300' : 'bg-teal-900/20 border border-teal-900 text-teal-400'}`}>
                    {assassinationResult.realBeast}（对应 {getVesselByBeast(assassinationResult.realBeast)}）
                  </span>
                </div>
              </div>

              {/* Outcome Statement */}
              <p className="text-stone-400 text-xs text-center leading-relaxed font-sans px-2">
                {assassinationResult.isSuccess ? (
                  `“诅咒奏效了！伴随着殷墟圣坛的雷劫火光，契书上【${assassinationResult.targetName}】真实法核与卧底暗刺刺针完美咬合，法核顷刻暴毙粉碎，【${assassinationResult.targetName}】已被无情淘汰出局，遗憾离坛旁观！”`
                ) : (
                  `“神煞偏离！由于对【${assassinationResult.targetName}】对应的藏匿青铜尊猜测失准，反被其守护结界阻挡，【${assassinationResult.targetName}】安然无恙！此次偷袭行径宣告失败！”`
                )}
              </p>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setAssassinationResult(prev => prev ? { ...prev, show: false } : null);
                    handlePlayWhoosh();
                  }}
                  className={`w-full py-3 rounded-2xl font-bold tracking-widest text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 border ${
                    assassinationResult.isSuccess
                      ? 'bg-red-600 hover:bg-red-500 text-white border-red-400 font-sans shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                      : 'bg-stone-900 hover:bg-stone-850 text-stone-200 border-stone-800'
                  }`}
                >
                  <span>明白了，继续推演 (Acknowledge)</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 游戏规则手册 POPUP MODAL */}
      <AnimatePresence>
        {isRulesModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-stone-900 border-2 border-amber-500/30 w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative scrollbar-thin scrollbar-thumb-stone-800"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center space-x-2 text-amber-400">
                  <BookOpen className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h2 className="text-lg md:text-xl font-bold font-sans tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                    商周祭坛契约 · 甲骨核验手册
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setIsRulesModalOpen(false);
                    handlePlayWhoosh();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 hover:border-amber-500/50 text-stone-400 hover:text-amber-300 text-xs transition font-mono cursor-pointer"
                >
                  ✕ 关闭 (Close)
                </button>
              </div>

              {/* BODY CONTENT GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-stone-300 text-xs leading-relaxed">
                
                {/* PANEL 1: CAMPS & RESPONSIBILITIES */}
                <div className="bg-stone-950/80 border border-stone-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 border-b border-stone-800/60 pb-1.5">
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h3 className="font-bold text-emerald-300">1. 阵营分配 & 身份隐匿</h3>
                  </div>
                  <p className="text-stone-400">
                    祭坛中共有 <strong className="text-stone-200">10 位商周精灵</strong>。每个灵体对应的青铜神尊各不相同：
                  </p>
                  <ul className="space-y-2 list-disc list-inside text-[11px] text-stone-400">
                    <li>
                      <span className="text-emerald-400 font-bold">青铜真守护 (好人x7):</span> 其灵魂深处刻有真正的契约神兽，但由于契约降临的迷思之力，<strong className="text-amber-400">全员在游戏开始时均不确认自己与其他好人的具体身份</strong>！
                    </li>
                    <li>
                      <span className="text-red-400 font-bold">文创幽冥卧底 (坏人x3):</span> 隐藏在好人队列中的杂染魔灵，<strong className="text-rose-400">卧底队友之间开局直接互知</strong>，彼此通气（右侧含有专用幽密沟通竹简语卷）。
                    </li>
                  </ul>
                  <div className="bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-xl text-xxs text-emerald-300/80">
                    💡 <strong className="text-emerald-400">好人核心策略:</strong> 不断解开信封字谜，累积并消耗甲骨，运用三人组队和密室功能核实排查，协助每个人找回自己的法身神尊！
                  </div>
                </div>

                {/* PANEL 2: BEASTS & BRONZE VESSELS */}
                <div className="bg-stone-950/80 border border-stone-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 border-b border-stone-800/60 pb-1.5">
                    <Flame className="w-4 h-4 text-amber-505 shrink-0" />
                    <h3 className="font-bold text-amber-400">2. 神兽图腾 & 青铜器尊绑定饰谱</h3>
                  </div>
                  <p className="text-stone-400">
                    6大上古神兽与殷墟青铜古尊相互呼应：
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-300">
                    {([ '龟', '羊', '牛', '猫头鹰', '猪', '虎' ] as BeastType[]).map((b) => (
                      <div key={b} className={`p-1.5 bg-stone-900 rounded-lg border flex items-center justify-between ${b === twinBeast ? 'border-amber-500/40 bg-amber-950/10' : 'border-stone-800'}`}>
                        <span>
                          {b === '龟' && '🐢'}
                          {b === '羊' && '🐏'}
                          {b === '牛' && '🐂'}
                          {b === '猫头鹰' && '🦉'}
                          {b === '猪' && '🐖'}
                          {b === '虎' && '🐅'}
                          {' '}
                          <strong className="text-amber-200">{b}{b === twinBeast ? '(本局双生)' : ''}:</strong>{' '}
                          <span className="text-stone-400">{getVesselByBeast(b)}</span>
                        </span>
                        {b === twinBeast && (
                          <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1 rounded-full border border-amber-500/20 font-bold scale-90">
                            共 2 只
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="bg-amber-950/20 border border-amber-900/30 p-2 text-xxs text-amber-300/80">
                    ⚠️ <strong className="text-amber-400">特别机密:</strong> 共有 7 个好人们各自对准 7 个器尊。<strong className="text-teal-400">由于上古大阵变幻，本局游戏中【{twinBeast}】对应“两相共生”，共有两名不同的好人守护者均是【{twinBeast}】！</strong> 其余五种动物各有 1 名守护一职。
                  </div>
                </div>

                {/* PANEL 3: ORACLE BONE ACQUISITION */}
                <div className="bg-stone-950/80 border border-stone-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 border-b border-stone-800/60 pb-1.5">
                    <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                    <h3 className="font-bold text-teal-300">3. 核验唯一圣物：卜兆甲骨获取法</h3>
                  </div>
                  <p className="text-stone-400">
                    在“<strong className="text-teal-400">神书印.获取</strong>”选项页中进行古法汉字字谜破解，获取核验必须消耗的核心道具「甲骨」：
                  </p>
                  <ol className="space-y-1.5 list-decimal list-inside text-[11px] text-stone-400">
                    <li>
                      <strong className="text-stone-200">拾信:</strong> 随机降临一重精选的小学生合体字/拆字谜（如：二山相连 - 出）。
                    </li>
                    <li>
                      <strong className="text-stone-200">检索:</strong> 将猜测出的谜底汉字拼版，输入查阅新华字典。
                    </li>
                    <li>
                      <strong className="text-stone-200">开锁:</strong> 字典检索成功将浮现精确字典页码。在青铜宝箱中输入此页码开锁。若正确，铜锁金裂，点击即可收获一枚「卜兆甲骨」！
                    </li>
                  </ol>
                  <div className="bg-teal-950/20 border border-teal-905/40 p-2.5 rounded-xl text-xxs text-teal-300/85">
                    💪 <strong className="text-teal-400">高质说明:</strong> 题库绝不掺杂游戏本身的名词进行循环剧透，干净纯粹还原汉字拆字法阵！
                  </div>
                </div>

                {/* PANEL 4: VICTORY & SPELLS */}
                <div className="bg-stone-950/80 border border-stone-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 border-b border-stone-800/60 pb-1.5">
                    <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                    <h3 className="font-bold text-amber-400">4. 神力判定 & 裁决胜负书</h3>
                  </div>
                  <ul className="space-y-2 text-[11px] text-stone-400">
                    <li>
                      🔎 <strong className="text-teal-400">三人行组队核验:</strong> 消耗 1 甲骨，将挑选的存活3人组成校验队，询问该队伍中是否含有某种特定神兽，系统核验结果（有/无）真实不虚，是缩小怀疑范围、寻找好人伙伴的最高手段。
                    </li>
                    <li>
                      ⚡ <strong className="text-red-400">密室叩问 (天雷淘汰):</strong> 好人在密室一生仅可叩拜雕像一次，获取包含自己真实神尊的三兽候选名单。卧底可以暗中对好人施加【法身诅咒】（此过程极其阴鸷，不消耗任何甲骨，亦无需任何自持），一旦卧底猜准了好人精灵对应的图腾，该好人将直接被淘汰离席，失去生还！
                    </li>
                    <li>
                      🏆 <strong className="text-emerald-400">好人终局全胜:</strong> 在《终极验证台》共同把所有好人真实的配对图腾全数正确填报、提交校验。所有好人身份零差错，方能降下甘霖，驱散卧底真魔，赢得彻头彻尾的胜利！即使有部分好人精灵在途中不幸被卧底淘汰，也完全不影响最终大招盘算与胜出！
                    </li>
                    <li>
                      💀 <strong className="text-rose-500 font-bold">卧底直接暴胜:</strong> 只要最终提交的《终极验证台》契约填报中，有任何一处好人精灵的神兽跟其真实身世不相吻合，则殷墟契约崩坏，卧底精灵直接切断华夏文脉、窃取社稷而大获全胜！
                    </li>
                  </ul>
                </div>

              </div>

              {/* ACTION FOOTER BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-800 pt-5 text-xxs text-stone-550">
                <span>
                  当前系统时间: 2026-06-08 UTC · 卜巫大祭司秘藏
                </span>
                <button
                  onClick={() => {
                    setIsRulesModalOpen(false);
                    handlePlayWhoosh();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-bold tracking-widest text-[11px] transition duration-200 cursor-pointer shadow-lg shadow-orange-950/20"
                >
                  我已了然天机，返回圣坛
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 每人持有甲骨数 POPUP MODAL */}
      <AnimatePresence>
        {isBonesModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-stone-900 border-2 border-amber-500/30 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl relative scrollbar-thin scrollbar-thumb-stone-800"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Database className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h2 className="text-lg md:text-xl font-bold font-sans tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                    贞人行囊 · 实时持有甲骨榜
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setIsBonesModalOpen(false);
                    handlePlayWhoosh();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 hover:border-amber-500/50 text-stone-400 hover:text-amber-300 text-xs transition font-mono cursor-pointer"
                >
                  ✕ 关闭 (Close)
                </button>
              </div>

              {/* DESCRIPTION */}
              <p className="text-stone-400 text-xs leading-relaxed">
                上古祭灵核验消耗极其高昂。贞人必须通过真实才智，去破解“神书印.获取”谜题来为<strong className="text-amber-400">自己独自</strong>攒积卜兆甲骨（自解自得）。
                <span className="text-red-400">「甲骨完全自持，只能由本人自己猜谜获取，无法转让或给其他人借调使用。」</span> 以下是当前十位贞人英杰及AI分身的自理甲骨持有详情，系统于圣坛实时刷新。
              </p>

              {/* TABLE */}
              <div className="overflow-x-auto bg-stone-950/80 border border-stone-800/60 rounded-2xl p-4 shadow-inner">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400 font-mono text-[10px] uppercase tracking-wider">
                      <th className="pb-2.5 font-semibold text-stone-400">贞人英杰 (分身姓名)</th>
                      <th className="pb-2.5 font-semibold text-center text-stone-400">当世生存状态</th>
                      <th className="pb-2.5 font-semibold text-right text-stone-400">持有卜兆甲骨</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-900">
                    {players.map((p) => (
                      <tr key={p.id} className={`${p.isUser ? 'bg-amber-955/25 text-amber-200' : 'text-stone-300'} font-sans hover:bg-stone-900/40 transition-colors`}>
                        <td className="py-2.5 font-medium flex items-center space-x-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${p.isUser ? 'bg-amber-500 animate-pulse' : 'bg-stone-600'}`} />
                          <span className="font-semibold">{p.name}</span>
                          {p.isUser && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 rounded font-bold ml-1">你</span>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          {p.isEliminated ? (
                            <span className="text-red-500 text-[10px] bg-red-950/20 border border-red-900/30 px-2 py-0.5 rounded-full font-mono font-bold">
                              ☠️ 淘汰
                            </span>
                          ) : (
                            <span className="text-teal-400 text-[10px] bg-teal-950/20 border border-teal-900/30 px-2 py-0.5 rounded-full font-mono font-bold">
                              🟢 存活
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-amber-400 pr-2">
                          {p.oracleBones} 枚
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FOOTER MESSAGE */}
              <div className="bg-amber-950/15 border border-amber-900/30 p-3 rounded-xl text-xxs text-stone-400 leading-relaxed font-sans space-y-1">
                <div className="text-amber-300 font-bold font-serif flex items-center space-x-1">
                  <span>✨ 甲骨契文密令之要：</span>
                </div>
                <p>• <strong className="text-stone-300">好人方：</strong>每当你在《神书印.获取》标签下开锁、或解出字谜时，你自己的甲骨库存便会增长，可用于激活密室三兽名单或发起三人小队核验。</p>
                <p>• <strong className="text-stone-300">卧底方：</strong>无痕潜伏暗中观察。若其通过卜卦猜中好人守护神兽，会直接触发毁灭诅咒汰除该好人，且此行不消耗其自持甲骨。</p>
                <p>• <strong className="text-stone-300">保留性：</strong>即便被淘汰出盘化为灵气，其行囊持有的残留甲骨也不会丢失，供幽冥见证。</p>
              </div>

              <div className="flex justify-end pt-2 border-t border-stone-850">
                <button
                  onClick={() => {
                    setIsBonesModalOpen(false);
                    handlePlayWhoosh();
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-600 text-stone-950 font-sans font-bold hover:bg-amber-500 transition text-xs cursor-pointer shadow-md"
                >
                  确认知晓
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 远古神兽图腾与羁绊契约 POPUP MODAL */}
      <AnimatePresence>
        {isBondsGuideModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-stone-900 border-2 border-amber-500/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl relative scrollbar-thin scrollbar-thumb-stone-800 text-left animate-fade-in"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h2 className="text-lg md:text-xl font-bold font-sans tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                    上古九韶 · 神兽图腾与羁绊契约
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setIsBondsGuideModalOpen(false);
                    handlePlayWhoosh();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 hover:border-amber-500/50 text-stone-400 hover:text-amber-300 text-xs transition font-mono cursor-pointer"
                >
                  ✕ 收起 (Shrink)
                </button>
              </div>

              {/* OVERVIEW */}
              <p className="text-stone-400 text-xs leading-relaxed">
                祭坛承载着上古华夏九州生民的厚望。
                本局的双生神兽为 <strong className="text-amber-400">【{twinBeast}】</strong>（好人中共有两人拥有此守护），其余五种神兽在好人阵营中各占有一尊。
                点击下方各个神兽图腾可查看详细契约秘卷。
              </p>

              {/* TWO GRID MODULE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LEFT: INTERACTIVE GRID */}
                <div className="space-y-3">
                  <div className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider">
                    六大神兽图腾 (Tap to Inspect)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['龟', '羊', '牛', '猪', '虎', '猫头鹰'] as BeastType[]).map((beastSymbol) => {
                      let pinCount = 0;
                      players.forEach(p => {
                        const notes = bambooScrollNotes[p.id] || [];
                        if (notes.includes(beastSymbol)) {
                          pinCount++;
                        }
                      });
                      const limit = beastSymbol === twinBeast ? 2 : 1;
                      const isOverflow = pinCount > limit;
                      const isMatched = pinCount === limit;

                      return (
                        <div
                          key={beastSymbol}
                          onClick={() => {
                            setSelectedBeastInBonds(selectedBeastInBonds === beastSymbol ? null : beastSymbol);
                            handlePlayCrack();
                          }}
                          className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center transition cursor-pointer duration-150 ${
                            selectedBeastInBonds === beastSymbol
                              ? 'bg-amber-955 bg-amber-950/40 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] scale-105'
                              : isOverflow
                                ? 'bg-red-950/20 border-red-500/40 hover:border-red-500'
                                : isMatched
                                  ? 'bg-teal-950/15 border-teal-500/35 hover:border-teal-400'
                                  : 'bg-stone-950 border-stone-850 hover:border-stone-800'
                          }`}
                        >
                          <div className="w-10 h-10 flex items-center justify-center mb-1 select-none">
                            {renderBeastNeonIllustration(beastSymbol, selectedBeastInBonds === beastSymbol)}
                          </div>
                          
                          <span className="text-xs font-serif font-black text-stone-200 tracking-wider">
                            {beastSymbol}
                          </span>

                          <span className={`text-[9px] font-mono mt-1 px-1.5 py-0.5 rounded-full scale-95 ${
                            isOverflow
                              ? 'bg-red-955 text-red-500 font-bold animate-pulse'
                              : isMatched
                                ? 'bg-teal-955 bg-teal-950/40 text-teal-400 font-bold'
                                : pinCount > 0
                                  ? 'bg-amber-955 bg-amber-950/45 text-amber-500'
                                  : 'bg-stone-900 text-stone-500'
                          }`}>
                            标记: {pinCount}/{limit}
                          </span>

                          {beastSymbol === twinBeast && (
                            <div className="absolute top-1.5 right-1.5 bg-yellow-955 border border-yellow-500/30 text-[7px] font-serif font-black text-yellow-500 px-1 rounded transform leading-none py-[1px] uppercase">
                              双生
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT: COVENANT RESONANCE & ACTION */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider">
                      宿命至圣圣契共鸣 (Resonance)
                    </div>

                    <div className="space-y-1.5">
                      {/* Twin Bond */}
                      {(() => {
                        let twinCount = 0;
                        players.forEach(p => {
                          const notes = bambooScrollNotes[p.id] || [];
                          if (notes.includes(twinBeast)) twinCount++;
                        });
                        const isResonated = twinCount === 2;
                        const isConflict = twinCount > 2;
                        return (
                          <div className={`p-2.5 rounded-xl border text-xs flex justify-between items-center transition ${
                            isResonated 
                              ? 'bg-amber-955 bg-amber-950/30 border-amber-400/50 text-amber-300' 
                              : isConflict
                                ? 'bg-red-955 bg-red-950/20 border-red-500/40 text-red-400 animate-pulse'
                                : 'bg-stone-950 border-stone-850/60 text-stone-500'
                          }`}>
                            <div className="flex items-center space-x-1.5">
                              <span className={`w-2 h-2 rounded-full ${isResonated ? 'bg-amber-400' : isConflict ? 'bg-red-500 animate-ping' : 'bg-stone-800'}`} />
                              <span className="font-serif">两仪相生 【{twinBeast}】</span>
                            </div>
                            <span className="font-mono text-[10px] font-bold">
                              {isResonated ? '✦ 共振' : isConflict ? '🔴 过载' : `${twinCount}/2`}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Mountain Bond */}
                      {(() => {
                        let turtleCount = 0;
                        let sheepCount = 0;
                        players.forEach(p => {
                          const notes = bambooScrollNotes[p.id] || [];
                          if (notes.includes('龟')) turtleCount++;
                          if (notes.includes('羊')) sheepCount++;
                        });
                        const isResonated = turtleCount > 0 && sheepCount > 0;
                        return (
                          <div className={`p-2.5 rounded-xl border text-xs flex justify-between items-center transition ${
                            isResonated 
                              ? 'bg-teal-955 bg-teal-950/20 border-teal-500/40 text-teal-300' 
                              : 'bg-stone-950 border-stone-850/60 text-stone-500'
                          }`}>
                            <div className="flex items-center space-x-1.5">
                              <span className={`w-2 h-2 rounded-full ${isResonated ? 'bg-teal-400' : 'bg-stone-800'}`} />
                              <span className="font-serif">山泽载德 (龟 ↔ 羊)</span>
                            </div>
                            <span className="font-mono text-[10px] font-bold font-serif">
                              {isResonated ? '✦ 共振' : '未鸣'}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Agriculture Bond */}
                      {(() => {
                        let cowCount = 0;
                        let pigCount = 0;
                        players.forEach(p => {
                          const notes = bambooScrollNotes[p.id] || [];
                          if (notes.includes('牛')) cowCount++;
                          if (notes.includes('猪')) pigCount++;
                        });
                        const isResonated = cowCount > 0 && pigCount > 0;
                        return (
                          <div className={`p-2.5 rounded-xl border text-xs flex justify-between items-center transition ${
                            isResonated 
                              ? 'bg-emerald-955 bg-emerald-950/25 border-emerald-500/40 text-emerald-300' 
                              : 'bg-stone-950 border-stone-850/60 text-stone-500'
                          }`}>
                            <div className="flex items-center space-x-1.5">
                              <span className={`w-2 h-2 rounded-full ${isResonated ? 'bg-emerald-400' : 'bg-stone-800'}`} />
                              <span className="font-serif">仓廪社稷 (牛 ↔ 猪)</span>
                            </div>
                            <span className="font-mono text-[10px] font-bold font-serif">
                              {isResonated ? '✦ 共振' : '未鸣'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-stone-950 border border-stone-850/80 p-3 rounded-2xl flex items-center justify-between mt-2">
                    <span className="text-[10px] text-stone-400 font-sans">
                      若要抹去全部竹简手记标记：
                    </span>
                    <button
                      onClick={() => {
                        if (confirm("确定要重置竹简手记吗？这将抹净所有格子的标记。")) {
                          setBambooScrollNotes(
                            Object.fromEntries(players.map(p => [p.id, []]))
                          );
                          handlePlayWhoosh();
                        }
                      }}
                      className="px-3 py-1 rounded-xl bg-red-950/40 hover:bg-red-900/30 border border-red-900/30 text-[10px] text-red-400 hover:text-red-300 transition duration-150 cursor-pointer"
                    >
                      全部抹净 Wipe Notes
                    </button>
                  </div>
                </div>
              </div>

              {/* INDIVIDUAL SUB PANEL DETAILS FOR QUICK INSPECT */}
              {selectedBeastInBonds && (() => {
                const beastSymbol = selectedBeastInBonds;
                const MYTHS: Record<BeastType, { title: string; vessel: string; desc: string; lore: string }> = {
                  '龟': {
                    title: "玄冥玄武 · 占坛神龟",
                    vessel: "青铜簋",
                    desc: "山泽厚土之尊，代表稳若磐石与延绵社稷之基。",
                    lore: "太牢五器承装天地重礼。好人阵营中此兽【严格全场仅1尊】。若您的标记多于1人，代表存在冲突！"
                  },
                  '羊': {
                    title: "解豸神尊 · 纯阳执礼",
                    vessel: "四羊方尊",
                    desc: "万物生春之首，象征纯阳、高洁、正义与宗法之神圣不阿。",
                    lore: "方尊尊者中坚。好人阵营中此兽【严格全场仅1尊】。与【龟】可合鸣山泽，构成双灵守护共鸣。"
                  },
                  '牛': {
                    title: "稼穑神魁 · 地气载福",
                    vessel: "青铜牛尊",
                    desc: "神牛避邪，大礼太牢之冠，负载九州之厚实，执掌五谷之基。",
                    lore: "牛尊主宰丰兆。好人阵营中此兽【严格全场仅1尊】。与【猪】并列构成稼穑丰贡之神庙大祭大典。"
                  },
                  '猫头鹰': {
                    title: "双生玄鸟 · 战神影尊",
                    vessel: "妇好鸮尊",
                    desc: "上古战神至纯化身，飞枭长空，唳鸣御守，辟绝阴极之厄。",
                    lore: "古有“偶双鸮尊，天地合相”之祭，好人阵营中【极富特色有2尊猫头鹰】！这是唯一拥有双尊指标的神兽！"
                  },
                  '猪': {
                    title: "豕德通泰 · 瑞兽克邪",
                    vessel: "豕形猪尊",
                    desc: "刚鬣前突，其势辟疫。象征万物泰舒，衣食丰盛与生民平安。",
                    lore: "豕尊刚烈坦荡。好人阵营中此兽【严格全场仅1尊】。与【牛】构筑谷仓重器，守护世俗五行大安。"
                  },
                  '虎': {
                    title: "王威战灵 · 吞邪貔貅",
                    vessel: "虎食人卣",
                    desc: "饕餮吞噬万祸，猛虎执掌兵戈。象征王权、军守与无上破邪之威。",
                    lore: "卣器藏神魂，好人阵营中此兽【严格全场仅1尊】。与大捷【鸮尊】构成王威。标记时切忌勿超过1名限制！"
                  }
                };
                const isTwin = beastSymbol === twinBeast;
                const origSpec = MYTHS[beastSymbol];
                const spec = {
                  ...origSpec,
                  lore: isTwin
                    ? `在上古占辞中为“宿命双星”。【本局属于双生神兽，契典中本局共计 2 尊${beastSymbol}】！这是本局特设的唯一双尊重器精灵。`
                    : `好人阵营中此神兽【本局严格仅有 1 尊】。双生神兽目前已轮转并落在【${twinBeast}】之上。`
                };

                const markedTotal = players.filter(p => (bambooScrollNotes[p.id] || []).includes(beastSymbol));
                const candidatesByChamber = players.filter(p => !p.isEliminated && p.candidateOptions?.includes(beastSymbol));

                return (
                  <div className="bg-stone-950 border border-amber-500/20 p-4 rounded-2xl space-y-3.5 shadow-inner mt-2">
                    <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">
                          {beastSymbol === '龟' && '🐢'}
                          {beastSymbol === '羊' && '🐏'}
                          {beastSymbol === '牛' && '🐂'}
                          {beastSymbol === '猫头鹰' && '🦉'}
                          {beastSymbol === '猪' && '🐖'}
                          {beastSymbol === '虎' && '🐅'}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold font-serif text-amber-300">{spec.title}</h4>
                          <p className="text-[10px] text-stone-500">誓盟法器尊：<span className="text-amber-505 font-mono font-bold">{spec.vessel}</span></p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                        当前选中神尊
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed">
                      <div className="space-y-1.5 text-stone-400">
                        <p>• <span className="text-stone-300 font-semibold">神兽特性:</span> {spec.desc}</p>
                        <p>• <span className="text-stone-300 font-semibold">契誓考工:</span> {spec.lore}</p>
                      </div>
                      <div className="bg-stone-900/60 border border-stone-850 p-2.5 rounded-xl space-y-1.5 text-stone-400">
                        <div className="text-[9.5px] font-bold text-amber-400/85 uppercase tracking-wide">
                          📝 手记标记清单 / 密室候选线索
                        </div>
                        <p className="text-[10.5px]">
                          已在竹简手记中标记为此神兽的成员: <strong className={markedTotal.length > (beastSymbol === twinBeast ? 2 : 1) ? "text-red-400 font-extrabold animate-pulse" : "text-stone-200"}>{markedTotal.length > 0 ? markedTotal.map(p => p.name).join('、') : '暂无成员'}</strong>
                          {markedTotal.length > (beastSymbol === twinBeast ? 2 : 1) && (
                            <span className="text-[10px] text-red-500 font-bold block mt-1">⚠️ 冲突超额配限! ({markedTotal.length}/{beastSymbol === twinBeast ? 2 : 1} 尊)</span>
                          )}
                        </p>
                        <p className="text-[10.5px]">
                          密室候选人包含此神兽的成员: <strong className="text-stone-200">{candidatesByChamber.length > 0 ? candidatesByChamber.map(p => p.name).join('、') : '暂无发现'}</strong>
                        </p>
                      </div>
                    </div>

                    {/* QUICK SEAT HIGHLIGHT TRACKING ENGINE */}
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 gap-2 mt-3 text-left">
                      <div>
                        <span className="text-[11px] font-bold text-amber-400 block">🎯 契印席位高亮追踪</span>
                        <span className="text-[10px] text-stone-400">一键在主圣坛席位上，特写特显当前在竹简刻印了该「{beastSymbol}」法印的神器精灵</span>
                      </div>
                      <button
                        onClick={() => {
                          setTrackedBeast(trackedBeast === beastSymbol ? null : beastSymbol);
                          handlePlayCrack();
                          setIsBondsGuideModalOpen(false); // Close modal so they can instantly see it!
                        }}
                        className={`w-full sm:w-auto px-4 py-1.5 rounded-xl font-bold text-[10.5px] tracking-wider transition-all duration-150 cursor-pointer shadow-md shrink-0 ${
                          trackedBeast === beastSymbol
                            ? 'bg-red-950 text-red-400 border border-red-500/30'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 hover:scale-[1.02] active:scale-95'
                        }`}
                      >
                        {trackedBeast === beastSymbol ? '✕ 停止追踪' : '🔍 开启高亮追踪'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* FOOTER */}
              <div className="flex justify-end pt-3 border-t border-stone-850">
                <button
                  onClick={() => {
                    setIsBondsGuideModalOpen(false);
                    handlePlayWhoosh();
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-600 text-stone-950 font-sans font-bold hover:bg-amber-500 transition text-xs cursor-pointer shadow-md"
                >
                  好，已了然兽道
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 故事背景与沉浸朗读 POPUP MODAL */}
      <AnimatePresence>
        {isStoryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-stone-950 border-2 border-amber-500/40 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 space-y-6 shadow-[0_0_40px_rgba(245,158,11,0.25)] relative scrollbar-thin scrollbar-thumb-stone-800"
            >
              {/* Top Banner Ribbon */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600" />

              {/* Decorative Chinese corner details */}
              <div className="absolute top-3 left-4 text-[9px] font-mono text-amber-500/30">卍 YIN-XU COVENANT 卍</div>
              <div className="absolute top-3 right-4 text-[9px] font-mono text-amber-500/30">卍 THREE THOUSAND YEARS 卍</div>

              {/* BRANDING HEADER */}
              <div className="text-center space-y-2 pt-2">
                <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-semibold text-amber-400 tracking-widest uppercase">
                  ✨ 跨越三千年的神明启幕前奏
                </div>
                <h2 className="text-xl md:text-2xl font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 py-1 drop-shadow-md">
                  商周史诗 · 青铜精灵契约之盟
                </h2>
                <div className="h-[1px] w-2/3 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mx-auto" />
              </div>

              {/* GREAT PRIEST DEEP TTS VOICEOVER CONTROL BOARD */}
              <div className="bg-stone-900 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-inner relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none select-none">
                  <svg viewBox="0 0 100 100" className="w-24 h-24 text-amber-500">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M50,15 L50,85 M25,40 Q50,60 75,40" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>

                <div className="flex items-center space-x-3.5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-950 to-stone-950 border border-amber-500/30 flex items-center justify-center shadow-lg">
                      {isSpeaking ? (
                        <span className="relative flex h-5 w-5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 flex items-center justify-center text-xs">🔊</span>
                        </span>
                      ) : (
                        <span className="text-lg">🔈</span>
                      )}
                    </div>
                    {isSpeaking && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                    )}
                  </div>

                  <div className="text-left space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-serif font-bold text-amber-300">圣契诵读 (Narrator)</span>
                    </div>
                    <p className="text-[10px] text-stone-400 max-w-md leading-normal">
                      正在自动为您配乐并朗读古老前言剧情。若浏览器拦截了自动播放，可点击右侧按钮重新加载或控制。
                    </p>
                  </div>
                </div>

                {/* Narrator Voice Audio controls */}
                <div className="flex items-center space-x-2.5 shrink-0 z-10">
                  <button
                    onClick={handleToggleStorySpeech}
                    className={`px-4 py-2 rounded-xl font-bold text-[11px] flex items-center space-x-1.5 transition-all shadow-md cursor-pointer ${
                      isSpeaking 
                        ? 'bg-amber-600 text-stone-950 hover:bg-amber-500' 
                        : 'bg-stone-800 text-amber-300 hover:bg-stone-750 border border-amber-500/25'
                    }`}
                  >
                    <span>{isSpeaking ? '⏸ 暂停诵读' : '▶ 播放诵读'}</span>
                  </button>

                  {isSpeaking && (
                    <div className="flex items-center space-x-0.5 h-3">
                      {[1, 2, 3, 4, 3, 2, 1, 3, 4, 2].map((val, i) => (
                        <motion.span
                          key={i}
                          animate={{ height: ['4px', '14px', '4px'] }}
                          transition={{ duration: 0.6 + i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                          className="w-[1.5px] bg-amber-400 block"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CORE NARRATIVE SCROLLS container */}
              <div className="space-y-5 text-stone-300 tracking-wide max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                
                {/* 1. FOREWORDS */}
                <div className="bg-stone-900/40 border border-stone-900 hover:border-amber-500/20 p-4 md:p-5 rounded-2xl relative transition duration-300">
                  <span className="absolute top-2 right-3 text-[9px] font-mono text-stone-600 select-none">PREFACE</span>
                  <div className="flex items-center space-x-2 border-b border-stone-850 pb-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <h3 className="font-serif font-black text-amber-400 text-sm">📜 三千年往事：华夏国宝与古老传承 (故事前言)</h3>
                  </div>
                  <p className="text-xs md:text-[13px] text-stone-200 leading-relaxed font-sans text-justify">
                    三千年前，殷商王朝鼎盛一时，匠工铸器、甲骨刻文，诞生了无数承载华夏文脉的青铜国宝与甲骨文字。龟、羊、牛、猫头鹰、猪、虎六大神兽青铜器物，沉睡千年，承载着殷商文明的古老记忆，化作青铜守护精灵，默默守护着殷墟文脉与千年文明瑰宝。
                  </p>
                  <p className="text-xs md:text-[13px] text-stone-300 leading-relaxed font-sans text-justify mt-2">
                    如今，河南安阳殷墟「殷商动物园」青铜国宝特展盛大启幕，跨越三千年时光，古老青铜精灵再度苏醒，奔赴这场跨越时空的文明重逢。伴随现代文博文化兴起，诞生了一群鲜活灵动的文创精灵。
                  </p>
                </div>

                {/* 2. CONFLICT */}
                <div className="bg-stone-900/40 border border-stone-900 hover:border-amber-500/20 p-4 md:p-5 rounded-2xl relative transition duration-300">
                  <span className="absolute top-2 right-3 text-[9px] font-mono text-stone-600 select-none">CONFLICT</span>
                  <div className="flex items-center space-x-2 border-b border-stone-850 pb-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    <h3 className="font-serif font-black text-red-400 text-sm">🏮 颠覆与守护：文创反叛的序幕 (阵营冲突核心剧情)</h3>
                  </div>
                  <p className="text-xs md:text-[13px] text-stone-200 leading-relaxed font-sans text-justify">
                    文创精灵热爱传统文化、热衷文博创新，但天性灵动跳脱，想要颠覆传统、重塑青铜文明的呈现方式。为了打乱古老文脉的原始传承秩序，
                    <strong className="text-red-400 font-bold mx-1">3 名文创精灵</strong>悄悄混入青铜守护精灵队伍之中，隐匿身份、暗中潜伏。
                  </p>
                  <p className="text-xs md:text-[13px] text-stone-300 leading-relaxed font-sans text-justify mt-2">
                    他们企图通过干扰推理、混淆身份、误导最终校验，打破三千年青铜文明的原始秩序，改变国宝原本的守护轨迹。
                  </p>
                  <p className="text-xs md:text-[13px] text-stone-300 leading-relaxed text-justify mt-2 font-sans text-justify">
                    而 <strong className="text-teal-400 font-bold mx-1">7 名青铜守护精灵</strong>，身负传承殷商文脉、守护国宝真身的使命。但历经千年沉睡，由于契约降临的迷思之力，所有守护精灵不仅尽数遗忘自身真身身份，且彼此之间也互相致盲、无法知晓他人的好坏阵营，只能在迷雾重重中艰难自证，推演寻找失散的真灵。
                  </p>
                </div>

                {/* 3. LOGIC */}
                <div className="bg-stone-900/40 border border-stone-900 hover:border-amber-500/20 p-4 md:p-5 rounded-2xl relative transition duration-300">
                  <span className="absolute top-2 right-3 text-[9px] font-mono text-stone-600 select-none">MECHANICS</span>
                  <div className="flex items-center space-x-2 border-b border-stone-850 pb-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-teal-400" />
                    <h3 className="font-serif font-black text-teal-400 text-sm">🦴 龙骨铭卜辞：破译文脉的奥秘 (游戏核心剧情逻辑)</h3>
                  </div>
                  <p className="text-xs md:text-[13px] text-stone-200 leading-relaxed font-sans text-justify">
                    古老甲骨藏尽文明密码，是解锁身份、破译真相的关键神物。通过在祭坛回答字谜、拆解字义，玩家可以获得珍贵的“卜兆甲骨”。好人阵营在终局前，必须精诚合作、共享情报，在终极验证台完成对所有玩家真实神尊的高亮印刻。
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => setIsStoryModalOpen(false)}
                  className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-extrabold text-sm rounded-2xl transition-all duration-200 cursor-pointer shadow-xl shadow-orange-950/30"
                >
                  🔥 歃血为盟 · 进入青铜圣坛 ➔
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIVINE BEASTS EXQUISITE POPUP MODAL (神兽守护神契约极精点击弹窗) */}
      <AnimatePresence>
        {selectedBeastInBonds && (() => {
          const beastSymbol = selectedBeastInBonds;
          const MYTHS: Record<BeastType, { title: string; vessel: string; desc: string; lore: string }> = {
            '龟': {
              title: "玄冥玄武 · 占坛神龟",
              vessel: "青铜簋",
              desc: "山泽厚土之尊，代表稳若磐石与延绵社稷之基。",
              lore: "太牢五器承装天地重礼。好人阵营中此兽【严格全场仅1尊】。若您的标记多于1人，代表存在冲突！"
            },
            '羊': {
              title: "解豸神尊 · 纯阳执礼",
              vessel: "四羊方尊",
              desc: "万物生春之首，象征纯阳、高洁、正义与宗法之神圣不阿。",
              lore: "方尊尊者中坚。好人阵营中此兽【严格全场仅1尊】。与【龟】可合鸣山泽，构成双灵守护共鸣。"
            },
            '牛': {
              title: "稼穑神魁 · 地气载福",
              vessel: "青铜牛尊",
              desc: "神牛避邪，大礼太牢之冠，负载九州之厚实，执掌五谷之基。",
              lore: "牛尊主宰丰兆。好人阵营中此兽【严格全场仅1尊】。与【猪】并列构成稼穑丰贡之神庙大祭大典。"
            },
            '猫头鹰': {
              title: "双生玄鸟 · 战神影尊",
              vessel: "妇好鸮尊",
              desc: "上古战神至纯化身，飞枭长空，唳鸣御守，辟绝阴极之厄。",
              lore: "古有“偶双鸮尊，天地合相”之祭，好人阵营中【极富特色有2尊猫头鹰】！这是唯一拥有双尊指标的神兽！"
            },
            '猪': {
              title: "豕德通泰 · 瑞兽克邪",
              vessel: "豕形猪尊",
              desc: "刚鬣前突，其势辟疫。象征万物泰舒，衣食丰盛与生民平安。",
              lore: "豕尊刚烈坦荡。好人阵营中此兽【严格全场仅1尊】。与【牛】构筑谷仓重器，守护世俗五行大安。"
            },
            '虎': {
              title: "王威战灵 · 吞邪貔貅",
              vessel: "虎食人卣",
              desc: "饕餮吞噬万祸，猛虎执掌兵戈。象征王权、军守与无上破邪之威。",
              lore: "卣器藏神魂，好人阵营中此兽【严格全场仅1尊】。与大捷【鸮尊】构成王威。标记时切忌勿超过1名限制！"
            }
          };
          const isTwin = beastSymbol === twinBeast;
          const origSpec = MYTHS[beastSymbol];
          const spec = {
            ...origSpec,
            lore: isTwin
              ? `在上古占辞中为“宿命双星”。【本局属于双生神兽，契典中本局共计 2 尊${beastSymbol}】！这是本局特设的唯一双尊重器精灵。`
              : `好人阵营中此神兽【本局严格仅有 1 尊】。双生神兽目前已轮转并落在【${twinBeast}】之上。`
          };
          
          // Players marked on Bamboo Scroll
          const markedTotal = players.filter(p => (bambooScrollNotes[p.id] || []).includes(beastSymbol));
          
          // Players who have entered the Chamber and have this beast as a Secret Chamber candidate
          const candidatesByChamber = players.filter(p => !p.isEliminated && p.candidateOptions?.includes(beastSymbol));

          return (
            <motion.div
              key="beast-bonds-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.95, y: 25 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 25 }}
                className="bg-stone-900 border-2 border-amber-500/35 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 md:p-6 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.85),_0_0_30px_rgba(245,158,11,0.15)] relative scrollbar-thin scrollbar-thumb-stone-850 text-left"
              >
                {/* Ancient Golden Deco Corners */}
                <div className="absolute top-1 left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-500/40 pointer-events-none" />
                <div className="absolute top-1 right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-500/40 pointer-events-none" />
                <div className="absolute bottom-1 left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-500/40 pointer-events-none" />
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-500/40 pointer-events-none" />

                {/* MODAL TITLE HEADER WITH GRAPHIC ILLUSTRATION */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-b border-stone-800 pb-3 gap-3">
                  <div className="flex items-center space-x-3 text-center sm:text-left">
                    <div className="w-12 h-12 bg-amber-950/40 border border-amber-500/45 p-1.5 rounded-full flex items-center justify-center select-none shadow-[0_0_12px_rgba(245,158,11,0.2)] shrink-0">
                      {renderBeastNeonIllustration(beastSymbol)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 justify-center sm:justify-start">
                        <span className="text-amber-500/50 font-serif text-sm">✦</span>
                        <h2 className="text-base md:text-lg font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                          {spec.title}
                        </h2>
                      </div>
                      <p className="text-[10px] font-mono text-stone-400 mt-0.5">
                        上古礼尊青铜重器：<strong className="text-amber-400">{spec.vessel}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBeastInBonds(null);
                      handlePlayWhoosh();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 hover:border-red-500/60 text-stone-400 hover:text-red-400 text-xs transition font-mono cursor-pointer self-stretch sm:self-auto text-center"
                  >
                    ✕ 回归图谱
                  </button>
                </div>

                {/* BEAST LORE INFORMATION CARD */}
                <div className="p-3 bg-stone-950/80 rounded-2xl border border-stone-800">
                  <p className="text-stone-300 text-[11px] font-sans leading-relaxed italic">
                    “{spec.desc}”
                  </p>
                  <div className="mt-2 text-[10px] text-amber-500/85 leading-normal flex items-start space-x-1 border-t border-stone-900 pt-2 font-serif">
                    <span className="text-amber-500 select-none">📜</span>
                    <span>{spec.lore}</span>
                  </div>
                </div>

                {/* TRACKING SEAT ACTION BAR */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-amber-500/5 p-2.5 px-3.5 rounded-2xl border border-amber-500/10 gap-2.5 text-left">
                  <div className="text-xs">
                    <span className="text-stone-300 font-bold font-serif block">🎯 契誓契印高亮追踪中枢</span>
                    <span className="text-[10px] text-stone-500">可在圣坛所有席位卡片上，高亮强显已标记「{beastSymbol}」法印的精灵客卿</span>
                  </div>
                  <button
                    onClick={() => {
                      setTrackedBeast(trackedBeast === beastSymbol ? null : beastSymbol);
                      handlePlayCrack();
                    }}
                    className={`w-full sm:w-auto px-4 py-1.5 rounded-xl font-bold text-[10.5px] tracking-wider transition-all duration-150 cursor-pointer shadow-md shrink-0 ${
                      trackedBeast === beastSymbol
                        ? 'bg-red-955 bg-gradient-to-r from-red-950 to-red-900 text-red-400 border border-red-500/30'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {trackedBeast === beastSymbol ? '✕ 停止追踪本尊' : '🔍 开启强显高亮'}
                  </button>
                </div>

                {/* CANDIDATE ANALYSIS SEGMENTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SEGMENT A: ACTIVE DEDUCTIVE MARKS */}
                  {(() => {
                    const limit = beastSymbol === twinBeast ? 2 : 1;
                    const isOverflow = markedTotal.length > limit;
                    return (
                      <div className={`bg-stone-950/40 border rounded-2xl p-3 flex flex-col justify-between transition-all duration-300 ${
                        isOverflow 
                          ? 'border-red-500/90 shadow-[0_0_15px_rgba(239,68,68,0.45)]' 
                          : 'border-stone-800'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between border-b border-stone-850 pb-1.5 mb-2">
                            <div className="flex items-center space-x-1 text-xs font-bold text-amber-400">
                              <span>🏮</span>
                              <span className={isOverflow ? "text-red-400 font-extrabold animate-pulse" : ""}>
                                竹简刻印本尊的玩家 ({markedTotal.length}) {isOverflow && "⚠️ 超额"}
                              </span>
                            </div>
                            <span className="text-[8px] font-mono text-stone-500">SCROLL STAMPS</span>
                          </div>
                          
                          {markedTotal.length === 0 ? (
                            <div className="text-[10px] text-stone-550 italic p-4 text-center">
                              暂无玩家被标记。可点击下方一键刻印。
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                              {markedTotal.map(p => {
                                const isChamberSuspect = p.candidateOptions?.includes(beastSymbol);
                                return (
                                  <div key={p.id} className={`p-1.5 px-2 rounded-xl flex items-center justify-between transition text-xxs ${
                                    isOverflow
                                      ? 'bg-red-950/15 border border-red-500/60 hover:border-red-500'
                                      : 'bg-amber-950/15 border border-amber-500/20 hover:border-amber-500/40'
                                  }`}>
                                    <div className="flex items-center space-x-1.5">
                                      <div className={`w-1.5 h-1.5 rounded-full animate-ping ${isOverflow ? 'bg-red-500' : 'bg-amber-400'}`} />
                                      <span className={`font-bold ${isOverflow ? 'text-red-200' : 'text-stone-200'}`}>{p.name} {p.isUser && " (你)"}</span>
                                      {p.isEliminated ? (
                                        <span className="text-[8px] bg-red-950/80 text-red-400 border border-red-500/20 px-1 py-0.2 rounded">出局</span>
                                      ) : (
                                        <span className="text-[8px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded">存活</span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      {isChamberSuspect && (
                                        <span className={`text-[8px] border px-1 py-0.2 rounded ${
                                          isOverflow 
                                            ? 'bg-red-900/40 text-red-300 border-red-500/20' 
                                            : 'bg-teal-950 text-teal-300 border-teal-500/20'
                                        }`}>密室嫌疑</span>
                                      )}
                                      <button
                                        onClick={() => handleToggleBambooStamp(p.id, beastSymbol)}
                                        className={`p-0.5 px-1.5 rounded text-[8px] transition cursor-pointer border ${
                                          isOverflow
                                            ? 'bg-red-950 border-red-800 text-red-300 hover:text-white'
                                            : 'text-stone-400 hover:text-red-400 bg-stone-900 border-stone-800'
                                        }`}
                                      >
                                        擦除 ✕
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {/* Status Alert if limit exceeded */}
                        {(() => {
                          if (isOverflow) {
                            return (
                              <div className="mt-2 p-1.5 rounded-xl bg-red-950/25 border border-red-500/30 text-[9px] text-red-400 flex items-start gap-1 leading-normal">
                                <span>⚠️</span>
                                <span>标记人数 ({markedTotal.length}) 已超过好人阵营配限 ({limit} 尊)，请及时修正冲突！</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  })()}

                  {/* SEGMENT B: DEDUCTION SUSPECTS ACCORDING TO SECRET CHAMBER */}
                  <div className="bg-stone-950/40 border border-stone-800 rounded-2xl p-3">
                    <div className="flex items-center justify-between border-b border-stone-850 pb-1.5 mb-2">
                      <div className="flex items-center space-x-1 text-xs font-bold text-teal-400">
                        <span>🔮</span>
                        <span>解密候选嫌疑人 ({candidatesByChamber.length})</span>
                      </div>
                      <span className="text-[8px] font-mono text-stone-500">CHAMBER SUSPECTS</span>
                    </div>

                    {candidatesByChamber.length === 0 ? (
                      <div className="text-[10px] text-stone-550 italic p-4 text-center leading-relaxed">
                        目前无玩家测温有此神兽候选。
                        <p className="text-[8px] text-stone-600 mt-1">需在【密室叩问】页面派遣队员进入获取三真法身。</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                        {candidatesByChamber.map(p => {
                          const isAlreadyStamped = (bambooScrollNotes[p.id] || []).includes(beastSymbol);
                          return (
                            <div key={p.id} className="p-1.5 px-2 rounded-xl bg-teal-950/15 border border-teal-500/10 hover:border-teal-500/30 flex items-center justify-between transition text-xxs">
                              <div>
                                <span className="font-bold text-teal-300">{p.name} {p.isUser && " (你)"}</span>
                                <span className="text-[8px] text-stone-400 ml-1.5 font-mono">
                                  候选: {p.candidateOptions?.join('、')}
                                </span>
                              </div>
                              
                              <button
                                onClick={() => handleToggleBambooStamp(p.id, beastSymbol)}
                                className={`text-[8.5px] font-semibold px-2 py-0.5 rounded border transition-all duration-100 cursor-pointer hover:scale-105 active:scale-95 ${
                                  isAlreadyStamped
                                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-400 hover:border-red-400 hover:text-red-400'
                                    : 'bg-stone-900 border-stone-800 text-teal-400 hover:border-teal-400'
                                } ${recentlyClickedStamps[`${p.id}-${beastSymbol}`] ? 'animate-stamp-shimmer-pulse' : ''}`}
                              >
                                <span key={isAlreadyStamped ? 'yes' : 'no'} className="inline-block animate-stamp-pop">
                                  {isAlreadyStamped ? '✓ 已标记' : '+ 标记'}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* THE COMPLETE 10-PLAYER INTERACTIVE QUICK-STAMP LIST (青铜器契纸刻印台) */}
                <div className="bg-stone-950/70 border border-stone-800 rounded-2xl p-3 md:p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-850 pb-1.5">
                    <div className="flex items-center space-x-1 text-xs font-black tracking-wider text-amber-400 font-serif">
                      <span>🏺</span>
                      <span>上古守护圣纹 · 全员契纸快速刻印台 (Stamping Workbench)</span>
                    </div>
                    <span className="text-[7.5px] font-mono text-stone-500 uppercase">Interactive Matrix</span>
                  </div>
                  <p className="text-[9px] text-stone-400 leading-normal">
                    快捷矩阵一键「刻印」或「擦除」全场10名玩家的竹简契印，图谱与共鸣将实时进行判定分析。
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    {players.map(p => {
                      const notes = bambooScrollNotes[p.id] || [];
                      const isStamped = notes.includes(beastSymbol);
                      const isChamberOption = p.candidateOptions?.includes(beastSymbol);
                      
                      return (
                        <div
                          key={p.id}
                          className={`p-2 rounded-xl border transition-all duration-150 flex flex-col justify-between items-center text-center relative ${
                            isStamped
                              ? 'bg-amber-950/30 border-amber-500/50 shadow-[inset_0_0_8px_rgba(245,158,11,0.1)]'
                              : 'bg-stone-900/60 border-stone-850 hover:border-stone-700'
                          }`}
                        >
                          <div className="absolute top-1 left-1.5 font-mono text-[7px] text-stone-600 scale-90">
                            ID #{p.id}
                          </div>
                          
                          {/* Member general status */}
                          <div className="mt-1 flex flex-col items-center">
                            <span className={`text-[10px] font-bold ${isStamped ? 'text-amber-400' : 'text-stone-300'}`}>
                              {p.name}
                            </span>
                            <div className="flex items-center space-x-0.5 mt-0.5">
                              {p.isEliminated ? (
                                <span className="text-[7.5px] font-serif text-red-500 bg-red-950/50 px-1 py-0.1 rounded">离席</span>
                              ) : (
                                <span className="text-[7.5px] font-serif text-emerald-400 bg-emerald-950/50 px-1 py-0.1 rounded">存活</span>
                              )}
                              {isChamberOption && (
                                <span className="text-[7.5px] text-teal-400 bg-teal-950/50 px-1.5 py-0.1 rounded border border-teal-500/10 scale-90" title="该神兽存在于对方密室候选列表">密</span>
                              )}
                            </div>
                          </div>

                          {/* Stamp Action Button */}
                          <button
                            onClick={() => handleToggleBambooStamp(p.id, beastSymbol)}
                            className={`w-full mt-2 py-1 text-[8.5px] font-serif font-black rounded-lg border transition-all duration-100 hover:scale-[1.03] active:scale-95 cursor-pointer flex items-center justify-center gap-0.5 ${recentlyClickedStamps[`${p.id}-${beastSymbol}`] ? 'animate-stamp-shimmer-pulse' : ''} ${
                              isStamped
                                ? 'bg-amber-500/15 border-amber-400/90 text-amber-300 hover:bg-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-amber-400 hover:border-amber-500/40'
                            }`}
                          >
                            <span key={isStamped ? 'stamped' : 'unstamped'} className="inline-block animate-stamp-pop">
                              {isStamped ? '⚜️ 契印' : '◌ 无印'}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* FOOTER COVENANT METRIC SUMMARY */}
                <div className="flex items-center justify-between border-t border-stone-800 pt-3 text-[10px]">
                  <div className="text-stone-500 font-mono flex items-center space-x-1 select-none">
                    <span>COVENANT BOUND GRAPH</span>
                    <span>•</span>
                    <span className="text-stone-400">自动同步至圣坛竹简标记板</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBeastInBonds(null);
                      handlePlayWhoosh();
                    }}
                    className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-serif font-black tracking-widest text-[10px] transition duration-200 cursor-pointer shadow-md"
                  >
                    完成推演
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* BEAST AURA BURST EFFECT POPUP */}
      <AnimatePresence>
        {auraBurstPlayerId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md pointer-events-none"
          >
            {/* Ancient magical circular rune spinning underneath */}
            <div className="absolute w-[300px] h-[300px] md:w-[450px] md:h-[450px] opacity-25 border border-dashed border-amber-500/40 rounded-full animate-[spin_20s_linear_infinite]" />
            <div className="absolute w-[240px] h-[240px] md:w-[360px] md:h-[360px] opacity-15 border border-amber-500/30 rounded-full animate-[spin_12s_linear_infinite_reverse]" />
            <div className="absolute w-[180px] h-[180px] md:w-[280px] md:h-[280px] opacity-35 border-2 border-double border-amber-500/50 rounded-full bg-stone-950/20" />

            {/* Radiant radial background glow of the beast */}
            <div className={`absolute w-[200px] h-[200px] md:w-[350px] md:h-[350px] rounded-full blur-[80px] opacity-70 ${
              auraBurstBeast === '虎' ? 'bg-red-500/35' :
              auraBurstBeast === '龙' ? 'bg-amber-500/35' :
              auraBurstBeast === '凤' ? 'bg-rose-500/35' :
              auraBurstBeast === '龟' ? 'bg-teal-500/35' :
              auraBurstBeast === '羊' ? 'bg-emerald-500/35' :
              auraBurstBeast === '猫头鹰' ? 'bg-yellow-500/35' :
              auraBurstBeast === '猪' ? 'bg-fuchsia-500/35' : 'bg-stone-500/30'
            }`} />

            {/* Floating particles - Dissipating effect (glowing dots floating upwards and outwards) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(40)].map((_, i) => {
                const angle = (i * 9) * Math.PI / 180;
                const speed = 70 + (i % 5) * 45;
                const delay = (i % 8) * 0.08;
                const size = 3 + (i % 3) * 2;
                const distanceX = Math.cos(angle) * speed;
                const distanceY = Math.sin(angle) * speed - 140; // Float upwards slightly
                
                return (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 0.95, scale: 1 }}
                    animate={{
                      x: distanceX,
                      y: distanceY,
                      opacity: 0,
                      scale: 0.2,
                      rotate: i * 15,
                    }}
                    transition={{
                      duration: 1.3,
                      ease: "easeOut",
                      delay: delay,
                    }}
                    className={`absolute top-1/2 left-1/2 -ml-1 -mt-1 rounded-full ${
                      auraBurstBeast === '虎' ? 'bg-red-400' :
                      auraBurstBeast === '龙' ? 'bg-amber-400' :
                      auraBurstBeast === '凤' ? 'bg-rose-400' :
                      auraBurstBeast === '龟' ? 'bg-teal-400' :
                      auraBurstBeast === '羊' ? 'bg-emerald-400' :
                      auraBurstBeast === '猫头鹰' ? 'bg-yellow-300' :
                      auraBurstBeast === '猪' ? 'bg-fuchsia-400' : 'bg-stone-400'
                    } shadow-[0_0_8px_currentColor]`}
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                    }}
                  />
                );
              })}
            </div>

            {/* Main Bronze Ornament Silhouette / Afterimage */}
            <motion.div
              initial={{ scale: 0.3, y: 40, rotate: -15, opacity: 0 }}
              animate={{ 
                scale: [0.3, 1.12, 1],
                y: [40, -10, 0],
                rotate: [-15, 3, 0],
                opacity: [0, 1, 1, 0.9, 0]
              }}
              exit={{ scale: 1.2, opacity: 0, transition: { duration: 0.2 } }}
              transition={{
                duration: 1.5,
                times: [0, 0.25, 0.5, 0.8, 1],
                ease: "easeOut"
              }}
              className="relative flex flex-col items-center justify-center p-6 z-10 text-center"
            >
              {/* Symmetrical Bronze Frame */}
              <div className="absolute inset-0 border border-amber-500/30 rounded-3xl -m-4 bg-stone-950/90 shadow-[0_0_50px_rgba(217,119,6,0.354)] backdrop-blur-sm pointer-events-none" />
              <div className="absolute inset-0 border-2 border-double border-amber-500/20 rounded-3xl -m-2 pointer-events-none" />
              
              {/* Left-right decorative runes */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 -translate-x-full text-[10px] font-mono text-amber-500/40 writing-mode-vertical tracking-widest leading-none hidden md:block uppercase">
                ✦ O R A C L E · S E A L ✦
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 translate-x-full text-[10px] font-mono text-amber-500/40 writing-mode-vertical tracking-widest leading-none hidden md:block uppercase">
                ✦ T O T E M · R E V E A L ✦
              </div>

              {/* Floating Beast Icon & Afterimage */}
              <div className="relative w-28 h-28 md:w-36 md:h-36 flex items-center justify-center mb-4">
                {/* Sizing wrapper for SVG */}
                <div className="scale-150 transform">
                  {renderBeastNeonIllustration(auraBurstBeast)}
                </div>
                
                {/* Radial aura shockwave */}
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0.6 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.4 }}
                  className={`absolute inset-0 rounded-full border border-dashed ${
                    auraBurstBeast === '虎' ? 'border-red-500/40' :
                    auraBurstBeast === '龙' ? 'border-amber-500/40' :
                    auraBurstBeast === '凤' ? 'border-rose-500/40' :
                    auraBurstBeast === '龟' ? 'border-teal-500/40' :
                    auraBurstBeast === '羊' ? 'border-emerald-500/40' :
                    auraBurstBeast === '猫头鹰' ? 'border-yellow-400/40' :
                    auraBurstBeast === '猪' ? 'border-fuchsia-500/40' : 'border-stone-500/40'
                  }`}
                />
              </div>

              {/* Divine Title Text */}
              <h2 className="text-xl md:text-2xl font-serif font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]">
                {auraBurstBeast === 'unknown' ? '待占神秘契文' : `${auraBurstBeast}尊 · 灵气迸发`}
              </h2>
              
              {/* Vessel label and description */}
              <p className="text-[10px] md:text-xs font-mono text-amber-500/75 tracking-wider mt-1.5 uppercase font-semibold">
                {auraBurstBeast === 'unknown' ? 'UNREVEALED ANCIENT ENERGY' : `SACRED SPIRIT OF ${getVesselByBeast(auraBurstBeast as BeastType)}`}
              </p>

              <p className="text-[9px] md:text-[10px] text-stone-400 max-w-xs mt-2 leading-relaxed italic">
                {auraBurstBeast === 'unknown' 
                  ? '“神像封缄，迷雾重重，静待贞人解字刻契。”' 
                  : `“上古神兽之威显于殷商祭坛，${auraBurstBeast}尊神魄归位，金鼓常鸣。”`}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIVINE BEASTS BONDS GRAPH VIEW - MOVED PERMANENTLY TO THE SIDEBAR PANEL (已永久呈现在右侧边栏，避免悬浮层遮挡) */}

      {/* SHANG-ZHOU CURRENT EVENTS FLOATING TICKER */}
      <AnimatePresence>
        {hasStarted && !isCompleted && showNewsTicker && (
          <motion.div
            drag
            dragElastic={0.1}
            dragMomentum={false}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-20 right-6 z-40 w-[240px] sm:w-[280px] md:w-[320px] bg-stone-950/95 border border-amber-500/35 rounded-2xl p-3 md:p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.95),_0_0_15px_rgba(245,158,11,0.15)] backdrop-blur-md cursor-grab active:cursor-grabbing select-none hover:border-amber-400/50 transition-colors"
          >
            {/* Elegant Bronze style corner bracket design */}
            <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-amber-500/40" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-amber-500/40" />
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-amber-500/40" />
            <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-amber-500/40" />

            {/* Header row */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5 mb-2">
              <div className="flex items-center space-x-1.5">
                <GripVertical className="w-3.5 h-3.5 text-amber-500/40 hover:text-amber-400 transition shrink-0 cursor-grab" />
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
                <span className="text-[10px] md:text-xs font-serif font-black tracking-widest text-amber-400">
                  ✦ 商周时事 ✦
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[8px] font-mono text-stone-500 uppercase tracking-wider">
                  Live Rumors
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewsTicker(false);
                  }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-stone-500 hover:text-amber-400 hover:bg-stone-900 text-[10px] transition cursor-pointer"
                  title="隐藏时事"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content area with scrolling/fading transition */}
            <div className="min-h-[46px] flex items-center justify-start py-0.5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={shangZhouNews}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="text-xxs font-sans text-stone-300 leading-relaxed font-normal"
                >
                  {shangZhouNews}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Subtitle details */}
            <div className="text-[8px] font-mono text-stone-500 flex justify-between mt-2 pt-1 border-t border-stone-900/60 leading-none">
              <span>YIN-XU CHRONICLE</span>
              <span className="animate-pulse text-amber-500/80 flex items-center gap-0.5">🟢 拖拽移动 • ROTATING</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIVINE PEER WEB-AUDIO VOICE COMMUNICATOR PANEL */}
      <VoiceCommunicator
        isMultiplayer={isMultiplayer}
        isVoiceEnabled={isVoiceEnabled}
        isMuted={isMuted}
        voiceError={voiceError}
        toggleVoice={toggleVoice}
        toggleMute={toggleMute}
        clientId={clientId}
        lobbyPlayers={lobbyPlayers}
      />

      {/* FOOTER */}
      <footer className="w-full text-center py-4 border-t border-stone-900 text-[10px] text-stone-600 mt-6 relative z-10 font-mono">
        <div>青铜器守护核验盘 · 殷商大礼大祭司御修版</div>
        <div className="mt-1">© 3000 B.C. Yin-Xu Dynasty & Google AI Studio Agent Design</div>
      </footer>

    </div>
  );
}
