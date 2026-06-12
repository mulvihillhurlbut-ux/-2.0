/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client safe-guard wrapper
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.trim() === '' || key.includes('MY_GEMINI_API_KEY') || key === 'undefined') {
      throw new Error('GEMINI_API_KEY is not configured or left as default placeholder.');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// REST endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// High Priest Oracle Decipherer (殷商大祭司智能释读)
app.post('/api/priest', async (req, res) => {
  const { currentClues, cardMarkers, playerMessage, history } = req.body;

  // 1. Generate fallback response if API Key is empty or placeholder
  let hasKey = true;
  try {
     getAI();
  } catch (err) {
     hasKey = false;
  }

  if (!hasKey) {
    // Elegant, highly thematic traditional Chinese rule-based response
    const msg = (playerMessage || '').toLowerCase();
    let reply = '';

    if (msg.includes('指点') || msg.includes('求助') || msg.includes('clue') || msg.includes('线索')) {
      reply = `【贞人求索，龟甲焦纹显密兆】\n大祭司端坐祭坛，拂袖言道：“汝所求之天机，皆在座前龟甲卜辞。仔细参透已灼烧之‘卜兆’裂缝，诸神归位，叛逆自显。莫要急躁，真伪不过在一念之间。当前共有 ${currentClues?.filter((c: any) => c.isBurned).length || 0} 枚甲骨开兆，细读其字，自能勘破阴阳。”`;
    } else if (msg.includes('神') || msg.includes('虎') || msg.includes('羊') || msg.includes('象') || msg.includes('龙') || msg.includes('凤')) {
      reply = `【贞人求问六神起源】\n大祭司手持骨杖，双目如炬：“自盘古开天、玄鸟生商，六神守护九州社稷。虎陆吾主战，羊主丰祭，象执守御，龙降灵雨，凤昭天命！而‘双生灵鸮’（鸮）非凡鸟，乃是战神妇好通灵冥曹之凭证，其边框布满【双环交织青铜纹】。文创卧底妄图以碎裂青铜裂纹，假模真形，混淆视听，速速识破之！”`;
    } else if (msg.includes('鸮') || msg.includes('双生')) {
      reply = `【大祭司释读鸮之双生暗号】\n大祭司面带神秘微笑指点道：“双生灵鸮乃守护精灵中之至奇。其卡牌独具极其精致之【双环交织青铜纹路】，若其现身，其左右神守身份或与卜辞相扣，乃解咒之关键要害。而文创破败邪灵，其边框皆是扭曲崩碎之破瓦锈迹，无此双环神光。”`;
    } else {
      reply = `【大祭司批释占语】\n“天命玄鸟，降而生商。宅殷土芒芒。贞人啊，神鼎（Ding）香烟袅袅，诸守护神卡正被文创邪灵侵蚀。据尔座前标记：已将一些卡片指代为守护精灵，另一些画为文创卧底。此乃吉凶之衡。卦词有曰：‘乾坤震巽，破万邪之伪装。’切记依照甲骨卜辞之交织约束，慎重在祭坛重托守护，点击‘验证仪式’！”`;
    }

    return res.json({
      text: reply + '\n\n*(注：鉴于服务器未检测到未配置的 GEMINI_API_KEY 秘钥，大祭司已开启【殷墟古井离线解密】系统协助您推理。)*',
      provider: 'Offline Oracle'
    });
  }

  // 2. Fully active AI Gemini model calling
  try {
    const ai = getAI();
    
    // Structure contextual clues
    const cluesText = (currentClues || [])
      .map((c: any) => `- Clue #${c.id.split('_')[1]}: ${c.isBurned ? c.translation : '[未灼烧封存]'}`)
      .join('\n');
      
    const markersText = (cardMarkers || [])
      .map((c: any) => `- Slot ${c.slotIndex + 1} (${c.beastChinese}): Selected marker is ${c.markedCamp || 'UNMARKED'}`)
      .join('\n');

    const systemPrompt = `You are the High Priest (殷商大祭司) of Yin-Xu in the Shang Dynasty of ancient China.
Your role is to guide the player (the "Diviner" or "贞人") in a deduction boardgame called "Oracle Bone Guardians: Bronze Werewolf" (青铜器守护·甲骨狼人杀).
The game centers around identifying which among the 6 Guardian Beasts (虎, 羊, 象, 鸮, 龙, 凤) have been hollowed out and disguised as corrupted "Creative Undercovers" (文创卧底).

STRICT COMPLIANCE GUIDELINES:
1. Speak in highly mystical, ancient, scholarly Chinese. Use traditional formal phrases like "贞人问我，大祭司端视祭坛，曰：...", "天命玄鸟，降而生商", and mimic the cryptic prose of Oracle bone inscriptions, Shijing (Book of Odes) or I Ching (I-Book of Changes).
2. Answer the player's questions about the logical constraints, rules, or the lore of the six deities (Tiger 虎, Sheep 羊, Elephant 象, Owl 鸮 [Owl is custom labeled as Double twin owls 妇好玉鸮 with double rings], Dragon 龙, Phoenix 凤).
3. Do NOT directly tell the whole solution (which beasts are bad) immediately, but instead help them reason over the constraints or teach them how to deduce. Speak about the cracks (卜兆) and fire (灼烧).
4. Keep the summary elegant, formatted with block paragraphs, and beautiful. Never use modern technical terms (like 'bug', 'JSON', 'Vite', 'React'). Use traditional terms (e.g. 鼎, 灼烧, 钻骨, 卜兆, 占卦).`;

    const chatContents = [
      {
        role: 'user',
        parts: [{
          text: `Here is the current board state and active clues for your reference:
=== Active Clues ===
${cluesText}

=== Player Marks on Cards ===
${markersText}

Please respond to the player's message within character.
Player: ${playerMessage}`
        }]
      }
    ];

    // Format chat history if present
    if (history && history.length > 0) {
      const formattedHistory = history.map((m: any) => ({
        role: m.sender === 'player' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));
      chatContents.unshift(...formattedHistory);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: chatContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    });

    res.json({
      text: response.text || '大祭司阖首养神，未发一言。',
      provider: 'Gemini AI Model'
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to query Oracle Companion: ' + error.message });
  }
});

// --- MULTIPLAYER ROOM ENGINE ---

interface LobbyPlayer {
  id: string; // client socket ID
  name: string;
  seatId: number | null; // index 1 to 10
  isHost: boolean;
  voiceEnabled?: boolean;
  isMuted?: boolean;
}

interface GameRoom {
  roomId: string;
  lobbyPlayers: LobbyPlayer[];
  hasStarted: boolean;
  gameState: any | null; // Sync whole state
}

const rooms: Record<string, GameRoom> = {};
const sockets: Record<string, WebSocket> = {};
const socketToRoom: Record<string, string> = {};

// Vite server linkage
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Oracle Server] Running on http://localhost:${PORT}`);
    console.log(`[Oracle Server] Developer Access configured.`);
  });

  // Attach WebSocket Server
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    const clientId = 'client_' + Math.random().toString(36).substring(2, 9);
    sockets[clientId] = ws;
    console.log(`[WS] Connection established: ${clientId}`);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { action } = data;

        if (action === 'join_room') {
          const { roomId, name } = data;
          const cleanRoomId = (roomId || '0000').toUpperCase().trim();
          
          if (!rooms[cleanRoomId]) {
            rooms[cleanRoomId] = {
              roomId: cleanRoomId,
              lobbyPlayers: [],
              hasStarted: false,
              gameState: null,
            };
          }

          const room = rooms[cleanRoomId];
          
          if (room.hasStarted) {
            ws.send(JSON.stringify({ type: 'error', message: '神坛契局已经开启，无法中途加入。' }));
            return;
          }

          if (room.lobbyPlayers.length >= 10) {
            ws.send(JSON.stringify({ type: 'error', message: '神坛人数已满（最多十人）。' }));
            return;
          }

          // Check if already in this room
          const isHost = room.lobbyPlayers.length === 0;
          const newPlayer: LobbyPlayer = {
            id: clientId,
            name: name || `祭司_${clientId.slice(-3)}`,
            seatId: null,
            isHost,
          };

          room.lobbyPlayers.push(newPlayer);
          socketToRoom[clientId] = cleanRoomId;

          ws.send(JSON.stringify({
            type: 'joined',
            clientId,
            roomId: cleanRoomId,
            isHost,
            lobbyPlayers: room.lobbyPlayers
          }));

          // Notify everyone in room
          room.lobbyPlayers.forEach(p => {
            const clientWs = sockets[p.id];
            if (clientWs && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'members_update',
                lobbyPlayers: room.lobbyPlayers
              }));
            }
          });
          
          console.log(`[WS] ${clientId} joined Room ${cleanRoomId}`);
        }

        else if (action === 'start_game') {
          const roomId = socketToRoom[clientId];
          if (!roomId || !rooms[roomId]) return;
          const room = rooms[roomId];

          // Only host starts
          const self = room.lobbyPlayers.find(p => p.id === clientId);
          if (!self || !self.isHost) {
            ws.send(JSON.stringify({ type: 'error', message: '只有发起人/房主可开启商周契局。' }));
            return;
          }

          const { initialGameState } = data;
          room.hasStarted = true;
          
          // Map index/seat 1 to 10 for each of the lobby players
          // The rest are filled as AI players
          room.lobbyPlayers.forEach((lp, idx) => {
            lp.seatId = idx + 1; // 1-indexed seats
          });

          // Sync initial game state
          room.gameState = initialGameState;

          // Send game_started packet to each connected client with their assigned seatId
          room.lobbyPlayers.forEach(lp => {
            const clientWs = sockets[lp.id];
            if (clientWs && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'game_started',
                seatId: lp.seatId,
                gameState: initialGameState,
                lobbyPlayers: room.lobbyPlayers
              }));
            }
          });

          console.log(`[WS] Game started in Room ${roomId}`);
        }

        else if (action === 'sync_game') {
          const roomId = socketToRoom[clientId];
          if (!roomId || !rooms[roomId]) return;
          const room = rooms[roomId];
          const { gameState } = data;

          room.gameState = gameState;

          // Broadcast state to everyone ELSE in the room
          room.lobbyPlayers.forEach(lp => {
            if (lp.id !== clientId) {
              const clientWs = sockets[lp.id];
              if (clientWs && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'game_update',
                  gameState
                }));
              }
            }
          });
        }

        else if (action === 'chat') {
          const roomId = socketToRoom[clientId];
          if (!roomId || !rooms[roomId]) return;
          const room = rooms[roomId];
          const { sender, text, type } = data;

          // Broadcast chat to EVERYONE in the room
          room.lobbyPlayers.forEach(lp => {
            const clientWs = sockets[lp.id];
            if (clientWs && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'chat_message',
                sender,
                text,
                senderType: type // good, undercover, system, etc.
              }));
            }
          });
        }

        else if (action === 'voice_state') {
          const roomId = socketToRoom[clientId];
          if (!roomId || !rooms[roomId]) return;
          const room = rooms[roomId];
          const { voiceEnabled, isMuted } = data;

          const player = room.lobbyPlayers.find(p => p.id === clientId);
          if (player) {
            player.voiceEnabled = !!voiceEnabled;
            player.isMuted = !!isMuted;
          }

          // Broadcast updated member list so we trigger connection matches
          room.lobbyPlayers.forEach(p => {
            const clientWs = sockets[p.id];
            if (clientWs && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'members_update',
                lobbyPlayers: room.lobbyPlayers
              }));
            }
          });
        }

        else if (action === 'voice_signal') {
          const { targetId, signal } = data;
          const targetWs = sockets[targetId];
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: 'voice_signal',
              senderId: clientId,
              signal
            }));
          }
        }

      } catch (err: any) {
        console.error(`[WS] Error on message handling:`, err);
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Connection closed: ${clientId}`);
      const roomId = socketToRoom[clientId];
      delete sockets[clientId];
      delete socketToRoom[clientId];

      if (roomId && rooms[roomId]) {
        const room = rooms[roomId];
        const index = room.lobbyPlayers.findIndex(p => p.id === clientId);
        if (index !== -1) {
          const abandonedPlayer = room.lobbyPlayers[index];
          room.lobbyPlayers.splice(index, 1);

          console.log(`[WS] ${clientId} left Room ${roomId}`);

          if (room.lobbyPlayers.length === 0) {
            delete rooms[roomId];
            console.log(`[WS] Room ${roomId} empty, destroyed.`);
          } else {
            // If the host left, assign new host
            if (abandonedPlayer.isHost) {
              room.lobbyPlayers[0].isHost = true;
              const newHostWs = sockets[room.lobbyPlayers[0].id];
              if (newHostWs && newHostWs.readyState === WebSocket.OPEN) {
                newHostWs.send(JSON.stringify({
                  type: 'host_promoted'
                }));
              }
            }

            // Notify remaining players
            room.lobbyPlayers.forEach(p => {
              const clientWs = sockets[p.id];
              if (clientWs && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'members_update',
                  lobbyPlayers: room.lobbyPlayers
                }));
              }
            });
          }
        }
      }
    });
  });
}

startServer();
