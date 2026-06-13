import { useState, useEffect, useRef, useCallback } from 'react';

export interface VoicePeer {
  id: string;
  name: string;
  voiceEnabled: boolean;
  isMuted: boolean;
}

export function useVoiceChat(
  ws: WebSocket | null,
  clientId: string,
  roomId: string,
  lobbyPlayers: { id: string; name: string; seatId: number | null; isHost: boolean; voiceEnabled?: boolean; isMuted?: boolean }[]
) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidate[]>>({});
  
  // Create a ref for state to read latest values inside callbacks
  const stateRef = useRef({ clientId, roomId, lobbyPlayers, isVoiceEnabled, isMuted });
  useEffect(() => {
    stateRef.current = { clientId, roomId, lobbyPlayers, isVoiceEnabled, isMuted };
  }, [clientId, roomId, lobbyPlayers, isVoiceEnabled, isMuted]);

  // Clean a generic peer connection
  const cleanPeer = useCallback((peerId: string) => {
    console.log(`[WebRTC] Cleaning up peer: ${peerId}`);
    const pc = pcsRef.current[peerId];
    if (pc) {
      try {
        pc.close();
      } catch (err) {
        console.error(`Error closing PC for ${peerId}`, err);
      }
      delete pcsRef.current[peerId];
    }
    const audioEl = document.getElementById(`audio_voice_peer_${peerId}`);
    if (audioEl) {
      audioEl.remove();
    }
    // Delete any pending candidate queue
    delete pendingCandidatesRef.current[peerId];
  }, []);

  // Helper to attach local tracks to a given RTCPeerConnection safely
  const addLocalTracksToPC = useCallback((pc: RTCPeerConnection) => {
    if (!localStreamRef.current) {
      console.log('[WebRTC] No local stream active currently to bind tracks.');
      return;
    }
    const senders = pc.getSenders();
    localStreamRef.current.getTracks().forEach((track) => {
      const alreadyAdded = senders.some(s => s.track === track || (s.track && s.track.kind === track.kind));
      if (!alreadyAdded) {
        console.log(`[WebRTC] Adding local track (${track.kind}) to PeerConnection`);
        pc.addTrack(track, localStreamRef.current!);
      }
    });
  }, []);

  // Create or retrieve PeerConnection
  const getOrCreatePC = useCallback((peerId: string, initiateOffer: boolean) => {
    if (pcsRef.current[peerId]) {
      // Ensure existing connection has anyway all tracks attached
      addLocalTracksToPC(pcsRef.current[peerId]);
      return pcsRef.current[peerId];
    }

    console.log(`[WebRTC] Creating PeerConnection to ${peerId}. Initiate=${initiateOffer}`);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' }
      ]
    });

    pcsRef.current[peerId] = pc;

    // Direct exchange of candidates
    pc.onicecandidate = (event) => {
      if (ws && ws.readyState === WebSocket.OPEN && event.candidate) {
        ws.send(JSON.stringify({
          action: 'voice_signal',
          targetId: peerId,
          signal: { candidate: event.candidate }
        }));
      }
    };

    // Receive audio stream track and play it
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received audio stream tracked from peer: ${peerId}`);
      
      // Fallback if event.streams is empty/undefined: create stream from track dynamically
      let remoteStream = event.streams && event.streams[0];
      if (!remoteStream) {
        remoteStream = new MediaStream([event.track]);
      }

      // 1. Traditional Audio Element Player
      const audioId = `audio_voice_peer_${peerId}`;
      let audioEl = document.getElementById(audioId) as HTMLAudioElement;
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = audioId;
        
        // Avoid display: none because some browser engines suspend or mute muted/hidden audio nodes to save power!
        audioEl.style.position = 'absolute';
        audioEl.style.width = '0px';
        audioEl.style.height = '0px';
        audioEl.style.opacity = '0';
        audioEl.style.pointerEvents = 'none';

        audioEl.autoplay = true;
        audioEl.setAttribute('autoplay', 'true');
        audioEl.setAttribute('playsinline', 'true');
        audioEl.muted = false;
        audioEl.volume = 1.0;
        document.body.appendChild(audioEl);
      }
      
      audioEl.srcObject = remoteStream;
      // Explicitly unmute and set max volume to ensure audio is loud and clear
      audioEl.muted = false;
      audioEl.volume = 1.0;

      // 2. Web Audio API Player destination routing (Forces direct hardware playback, bypassing standard canvas sandboxing)
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const audioCtx = new AudioCtxClass();
          const source = audioCtx.createMediaStreamSource(remoteStream);
          source.connect(audioCtx.destination);
          
          console.log(`[WebRTC] Web Audio context initialized. State: ${audioCtx.state}`);
          
          if (audioCtx.state === 'suspended') {
            const resumeCtx = () => {
              audioCtx.resume().then(() => {
                console.log(`[WebRTC] Audio context resumed. State: ${audioCtx.state}`);
                if (audioCtx.state === 'running') {
                  document.removeEventListener('click', resumeCtx);
                  document.removeEventListener('touchstart', resumeCtx);
                }
              }).catch(e => console.error('[WebRTC] Context resume failed:', e));
            };
            document.addEventListener('click', resumeCtx);
            document.addEventListener('touchstart', resumeCtx);
          }
        }
      } catch (audioCtxErr) {
        console.warn(`[WebRTC] Web Audio API context fallback failed:`, audioCtxErr);
      }

      audioEl.play().catch(err => {
        console.warn(`[WebRTC] Failed stream autoplay, needs user interaction gesture:`, err);
        // Play on document click as a fallback
        const resumePlay = () => {
          audioEl.muted = false;
          audioEl.volume = 1.0;
          audioEl.play().catch(e => console.error(e));
          document.removeEventListener('click', resumePlay);
        };
        document.addEventListener('click', resumePlay);
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] PeerConnection state with ${peerId} changed to: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanPeer(peerId);
      }
    };

    // Add local tracks safely using our tracker helper
    addLocalTracksToPC(pc);

    if (initiateOffer) {
      pc.createOffer({ offerToReceiveAudio: true })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              action: 'voice_signal',
              targetId: peerId,
              signal: { sdp: pc.localDescription }
            }));
          }
        })
        .catch(err => console.error(`[WebRTC] Offer creation error for peer ${peerId}`, err));
    }

    return pc;
  }, [ws, cleanPeer, addLocalTracksToPC]);

  // Public socket receiver: parses and routes messages
  const handleVoiceSignal = useCallback((senderId: string, signal: any) => {
    if (!stateRef.current.isVoiceEnabled) {
      console.warn(`[WebRTC] Received WebRTC signal from ${senderId} but local voice is disabled`);
      return;
    }

    const pc = getOrCreatePC(senderId, false);

    if (signal.sdp) {
      const desc = new RTCSessionDescription(signal.sdp);
      pc.setRemoteDescription(desc)
        .then(() => {
          // Process queued candidates
          const queued = pendingCandidatesRef.current[senderId] || [];
          console.log(`[WebRTC] Processing ${queued.length} queued ICE candidates for ${senderId}`);
          queued.forEach((cand) => {
            pc.addIceCandidate(cand).catch(err => console.error(`[WebRTC] Error applying queued ICE candidate:`, err));
          });
          pendingCandidatesRef.current[senderId] = [];

          if (desc.type === 'offer') {
            return pc.createAnswer()
              .then((answer) => pc.setLocalDescription(answer))
              .then(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    action: 'voice_signal',
                    targetId: senderId,
                    signal: { sdp: pc.localDescription }
                  }));
                }
              });
          }
        })
        .catch((err) => console.error(`[WebRTC] Error processing SDP signal from ${senderId}:`, err));
    } else if (signal.candidate) {
      const cand = new RTCIceCandidate(signal.candidate);
      // Wait for remoteDescription to be set before adding ICE candidates to prevent DOMException
      if (pc.remoteDescription && pc.remoteDescription.type) {
        pc.addIceCandidate(cand)
          .catch((err) => console.error(`[WebRTC] Error adding received ICE candidate from ${senderId}:`, err));
      } else {
        if (!pendingCandidatesRef.current[senderId]) {
          pendingCandidatesRef.current[senderId] = [];
        }
        pendingCandidatesRef.current[senderId].push(cand);
        console.log(`[WebRTC] Queued ICE candidate for ${senderId} (pending remoteDescription)`);
      }
    }
  }, [getOrCreatePC, ws]);

  // Turn voice system on / off
  const toggleVoice = useCallback(async () => {
    if (isVoiceEnabled) {
      // Shutdown
      setIsVoiceEnabled(false);
      setIsMuted(false);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      Object.keys(pcsRef.current).forEach((peerId) => {
        cleanPeer(peerId);
      });

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          action: 'voice_state',
          voiceEnabled: false,
          isMuted: false
        }));
      }
    } else {
      // Engage Microphone
      try {
        setVoiceError(null);
        console.log('[WebRTC] Initiating local microphone capture with hardware parameters...');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        localStreamRef.current = stream;

        setIsVoiceEnabled(true);
        setIsMuted(false);

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            action: 'voice_state',
            voiceEnabled: true,
            isMuted: false
          }));
        }
      } catch (err: any) {
        console.error('[WebRTC] Microphone access denied or failed:', err);
        setVoiceError('无法获取电磁微波麦克权，请确定设备权限已开或浏览器没有安全拦截。');
      }
    }
  }, [isVoiceEnabled, ws, cleanPeer]);

  // Set local mute toggling
  const toggleMute = useCallback(() => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMute;
      });
    }

    if (ws && ws.readyState === WebSocket.OPEN && isVoiceEnabled) {
      ws.send(JSON.stringify({
        action: 'voice_state',
        voiceEnabled: true,
        isMuted: nextMute
      }));
    }
  }, [isMuted, isVoiceEnabled, ws]);

  // Match and build WebRTC connections automatically whenever lobbyPlayers changes
  useEffect(() => {
    if (!isVoiceEnabled) return;

    // Filter peers that have voice enabled and are not us
    const activePeers = lobbyPlayers.filter(
      p => p.id !== clientId && p.voiceEnabled === true
    );

    // Close connections with players who just disabled voice
    Object.keys(pcsRef.current).forEach((peerId) => {
      const stillActive = activePeers.some(p => p.id === peerId);
      if (!stillActive) {
        cleanPeer(peerId);
      }
    });

    // Start initiating WebRTC to any new voice-active players who are larger lexicographically or vice versa
    // Lexicographical ordering prevents duplicate RTC connections between two parties.
    activePeers.forEach((p) => {
      const peerId = p.id;
      if (!pcsRef.current[peerId]) {
        const isCaller = clientId < peerId;
        getOrCreatePC(peerId, isCaller);
      }
    });
  }, [isVoiceEnabled, lobbyPlayers, clientId, getOrCreatePC, cleanPeer]);

  // Complete cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.keys(pcsRef.current).forEach((peerId) => {
        const pc = pcsRef.current[peerId];
        if (pc) pc.close();
        const el = document.getElementById(`audio_voice_peer_${peerId}`);
        if (el) el.remove();
      });
    };
  }, []);

  return {
    isVoiceEnabled,
    isMuted,
    voiceError,
    toggleVoice,
    toggleMute,
    handleVoiceSignal,
  };
}
