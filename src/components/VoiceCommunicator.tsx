import React, { useState } from 'react';
import { Mic, MicOff, Info, ChevronUp, ChevronDown, Flame, Volume2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceCommunicatorProps {
  isMultiplayer: boolean;
  isVoiceEnabled: boolean;
  isMuted: boolean;
  voiceError: string | null;
  toggleVoice: () => void;
  toggleMute: () => void;
  clientId: string;
  lobbyPlayers: { id: string; name: string; isHost?: boolean; voiceEnabled?: boolean; isMuted?: boolean }[];
}

export function VoiceCommunicator({
  isMultiplayer,
  isVoiceEnabled,
  isMuted,
  voiceError,
  toggleVoice,
  toggleMute,
  clientId,
  lobbyPlayers
}: VoiceCommunicatorProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!isMultiplayer) return null;

  // Players currently in the voice channel
  const voiceTeammates = lobbyPlayers.filter(p => p.voiceEnabled);

  return (
    <div id="voice-communicator-dock" className="fixed bottom-6 right-6 z-50">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          /* COLLAPSED FLOATING ORB BUTTON */
          <motion.button
            key="collapsed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsExpanded(true)}
            className={`w-12 h-12 rounded-full cursor-pointer flex items-center justify-center shadow-lg transition-all duration-300 border-2 select-none ${
              isVoiceEnabled
                ? isMuted
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-rose-950/30'
                  : 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-amber-950/50 animate-pulse-slow'
                : 'bg-stone-900/90 border-stone-800 text-stone-400 hover:border-amber-500/50'
            }`}
            title="点击展开神听传送台 (Divine Voice Chat)"
          >
            {isVoiceEnabled ? (
              isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <div className="relative">
                  <Mic className="w-5 h-5 animate-bounce-slow" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                  </span>
                </div>
              )
            ) : (
              <Mic className="w-5 h-5 text-stone-550" />
            )}
          </motion.button>
        ) : (
          /* EXPANDED RICH RITUAL CONTROLLER SCROLL */
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-72 bg-gradient-to-b from-stone-950/95 to-stone-900/95 border-2 border-amber-600/30 rounded-2xl shadow-2xl p-4 font-sans text-stone-300 select-none backdrop-blur-xl relative"
          >
            {/* Header with expand indicators */}
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-2.5 mb-3">
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest flex items-center space-x-1">
                  <span>神明传音坛</span>
                  <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-stone-850 rounded text-stone-400 hover:text-amber-400 transition cursor-pointer"
                title="折叠至右下角"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ERROR SUMMARY MESSAGE */}
            {voiceError && (
              <div className="mb-3 p-2 bg-rose-950/30 border border-rose-900/40 rounded-xl flex items-start space-x-2 text-[9.5px] text-rose-300 leading-normal">
                <Info className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span>{voiceError}</span>
              </div>
            )}

            {/* PRIMARY ENGAGEMENT BUTTONS */}
            <div className="space-y-2.5 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-400 font-medium">通灵语音状态：</span>
                <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded ${
                  isVoiceEnabled
                    ? isMuted
                      ? 'bg-rose-950 border border-rose-900/30 text-rose-400'
                      : 'bg-teal-950 border border-teal-900/30 text-teal-400'
                    : 'bg-stone-950 text-stone-500 border border-stone-850/60'
                }`}>
                  {isVoiceEnabled 
                    ? isMuted ? '🔇 封麦闭音' : '📡 通灵联机中' 
                    : '💤 密印未启'
                  }
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`py-2 px-3 rounded-xl text-xxs font-extrabold tracking-wide transition-all cursor-pointer border flex items-center justify-center space-x-1.5 ${
                    isVoiceEnabled
                      ? 'bg-amber-600 border-amber-500 text-stone-950 hover:bg-amber-500 font-black shadow-md'
                      : 'bg-stone-900/60 border-stone-800 text-amber-500/80 hover:bg-stone-850/70'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>{isVoiceEnabled ? '切断通灵' : '开启通灵'}</span>
                </button>

                <button
                  type="button"
                  disabled={!isVoiceEnabled}
                  onClick={toggleMute}
                  className={`py-2 px-3 rounded-xl text-xxs font-bold transition-all cursor-pointer border flex items-center justify-center space-x-1.5 ${
                    !isVoiceEnabled
                      ? 'bg-stone-900/20 border-transparent text-stone-600 cursor-not-allowed'
                      : isMuted
                        ? 'bg-rose-950 border-rose-900 text-rose-300 hover:bg-rose-900'
                        : 'bg-stone-900 border-stone-800 text-teal-300 hover:bg-stone-850'
                  }`}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-teal-400" />}
                  <span>{isMuted ? '解除静音' : '封麦静音'}</span>
                </button>
              </div>
            </div>

            {/* ACTIVE CHANNEL PARTICIPANTS LIST */}
            <div className="space-y-1.5 border-t border-stone-900 pt-3">
              <span className="text-[9px] font-mono text-stone-500 block uppercase tracking-wider font-bold">
                殷商语频真官 ({voiceTeammates.length} 人在线):
              </span>
              
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {lobbyPlayers.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-1.5 rounded-lg border text-xxs transition-colors ${
                      p.id === clientId
                        ? 'bg-amber-500/5 border-amber-500/10'
                        : p.voiceEnabled
                          ? 'bg-stone-900/40 border-stone-850/60'
                          : 'bg-transparent border-transparent text-stone-550'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs">
                        {p.isHost ? '👑' : '🧙‍♂️'}
                      </span>
                      <span className={`font-medium ${p.voiceEnabled ? 'text-stone-200' : 'text-stone-500 font-normal line-through'}`}>
                        {p.name}
                      </span>
                      {p.id === clientId && (
                        <span className="text-[7px] text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded font-mono border border-amber-500/10">
                          你
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {p.voiceEnabled ? (
                        p.isMuted ? (
                          <span className="flex items-center space-x-1 text-[8px] text-rose-400 bg-rose-950/20 border border-rose-900/30 px-1 py-0.2 rounded">
                            <MicOff className="w-2.5 h-2.5 shrink-0" />
                            <span>静音</span>
                          </span>
                        ) : (
                          <div className="flex items-center space-x-1">
                            {/* Glowing speak indicator waves */}
                            <div className="flex items-end space-x-0.5 h-2 w-3.5 shrink-0">
                              <span className="w-0.5 bg-teal-400 rounded-full animate-bounce h-1.5" style={{ animationDelay: '0.1s' }} />
                              <span className="w-0.5 bg-teal-300 rounded-full animate-bounce h-2" style={{ animationDelay: '0.2s' }} />
                              <span className="w-0.5 bg-teal-400 rounded-full animate-bounce h-1" style={{ animationDelay: '0.3s' }} />
                            </div>
                            <span className="text-[8.5px] text-teal-400 font-bold font-mono">发声</span>
                          </div>
                        )
                      ) : (
                        <span className="text-[8px] text-stone-600 font-serif">离线/未通</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Informational tip footer */}
            {isVoiceEnabled && !isMuted && (
              <div className="mt-3 text-[8px] text-stone-500 bg-black/15 p-1.5 rounded-lg border border-dashed border-stone-850 text-center leading-normal">
                💡 通灵大启下，全房真官可直接用嘴畅聊卧底真相，不用苦苦码字啦！
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
