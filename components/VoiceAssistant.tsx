
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, X, Volume2, Sparkles } from 'lucide-react';
import { getLiveClient } from '../services/gemini';
import { LiveServerMessage, Modality } from '@google/genai';
import { VOICE_TOOLS, executeVoiceTool } from '../services/voice_tools';
import { useToast } from './Toast';

const VoiceAssistant = () => {
  const { showError, showWarning, showInfo } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  
  // Audio Contexts
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Helper: Audio Encoding
  function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Helper: Audio Decoding
  function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Helper: Decode PCM to AudioBuffer
  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  // Helper: Create Blob for Input
  function createBlob(data: Float32Array): { data: string; mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  const startSession = async () => {
    setStatus('connecting');
    setErrorMessage(null);
    try {
      const ai = getLiveClient();
      
      // 1. Get Mic Stream FIRST to ensure permissions
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } catch (micErr: any) {
        console.error("Microphone access denied:", micErr);
        let errorMsg = 'Unknown microphone error';
        if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
             errorMsg = "Microphone access was blocked. Please allow microphone access in your browser settings.";
        } else {
             errorMsg = micErr.message || 'Microphone error';
        }
        setStatus('error');
        setErrorMessage(errorMsg);
        showWarning('Microphone Access Required', errorMsg);
        return;
      }

      // 2. Initialize Audio Contexts only after we have the stream
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outputNode = outputContextRef.current.createGain();
      outputNode.connect(outputContextRef.current.destination);

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('connected');
            setIsActive(true);
            setErrorMessage(null);
            setTranscript(prev => [...prev, "System: Connected to Gemini Live."]);

            // Start Processing Input Audio
            if (inputContextRef.current && stream) {
                const source = inputContextRef.current.createMediaStreamSource(stream);
                const scriptProcessor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
                
                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                    const pcmBlob = createBlob(inputData);
                    sessionPromise.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                };
                
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputContextRef.current.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // 1. Handle Tool Calls (The "Smart" Part)
            if (message.toolCall) {
                console.log("Tool Call received:", message.toolCall);
                const functionResponses = [];

                for (const fc of message.toolCall.functionCalls) {
                    setToolActivity(`Using tool: ${fc.name}...`);
                    
                    // Execute the tool logic
                    const result = await executeVoiceTool(fc.name, fc.args);
                    
                    functionResponses.push({
                        id: fc.id,
                        name: fc.name,
                        response: { result: result }
                    });
                }

                // Send result back to Gemini
                sessionPromise.then(session => {
                    session.sendToolResponse({ functionResponses });
                });
                setToolActivity(null);
            }

            // 2. Handle Audio Output (The Voice Part)
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64EncodedAudioString && outputContextRef.current) {
                // Update cursor
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContextRef.current.currentTime);
                
                const audioBuffer = await decodeAudioData(
                    decode(base64EncodedAudioString),
                    outputContextRef.current,
                    24000,
                    1
                );

                const source = outputContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                
                source.addEventListener('ended', () => {
                    audioQueueRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioQueueRef.current.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
                for (const src of audioQueueRef.current) {
                    src.stop();
                }
                audioQueueRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            setStatus('disconnected');
            setIsActive(false);
          },
          onerror: (err: any) => {
            console.error("Live API Error", err);
            setStatus('error');
            setIsActive(false);
            setErrorMessage(err.message || 'Connection error occurred');
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            systemInstruction: "You are a helpful GTM assistant connected to a live CRM database. You can check lead counts, read recent leads, and save notes. Be concise.",
            tools: VOICE_TOOLS, // Inject the tools
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Failed to start session:", err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to connect to Voice Assistant');
      showError('Voice Assistant Error', 'Failed to connect. Please check your network and API key.');
    }
  };

  const stopSession = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (inputContextRef.current) {
        inputContextRef.current.close();
        inputContextRef.current = null;
    }
    if (outputContextRef.current) {
        outputContextRef.current.close();
        outputContextRef.current = null;
    }
    
    setStatus('disconnected');
    setIsActive(false);
    setToolActivity(null);
    setErrorMessage(null);
  };

  return (
    <>
        {/* Floating Button */}
        <button 
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center z-50 transition-transform hover:scale-105"
        >
            <Mic className="w-6 h-6" />
        </button>

        {/* Modal */}
        {isOpen && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                    <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Volume2 className="w-5 h-5" />
                            <h3 className="font-semibold">GTM Voice Assistant</h3>
                        </div>
                        <button onClick={() => { stopSession(); setIsOpen(false); }} className="text-white/80 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="p-8 flex flex-col items-center justify-center gap-8 min-h-[300px]">
                        <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                            {isActive && (
                                <span className="absolute inset-0 rounded-full bg-indigo-400/30 animate-ping"></span>
                            )}
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-inner ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
                                <Mic className="w-10 h-10" />
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-lg font-medium text-gray-900">
                                {toolActivity ? (
                                    <span className="flex items-center justify-center gap-2 text-indigo-600 animate-pulse">
                                        <Sparkles className="w-4 h-4" /> {toolActivity}
                                    </span>
                                ) : status === 'error' ? (
                                    <span className="text-red-600">Connection Error</span>
                                ) : (
                                    status === 'connected' ? 'Listening...' : status === 'connecting' ? 'Connecting...' : 'Ready to chat'
                                )}
                            </p>
                            <p className="text-sm text-gray-500">
                                {status === 'error' && errorMessage
                                    ? errorMessage
                                    : status === 'connected' 
                                        ? 'Ask: "How many leads do I have?" or "Any recent leads?"' 
                                        : 'Connect to start a real-time voice session with Gemini.'}
                            </p>
                        </div>

                        {!isActive ? (
                            <button 
                                onClick={startSession}
                                disabled={status === 'connecting'}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {status === 'connecting' ? 'Connecting...' : status === 'error' ? 'Try Again' : 'Start Conversation'}
                            </button>
                        ) : (
                            <button 
                                onClick={stopSession}
                                className="bg-red-500 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:bg-red-600 hover:shadow-xl transition-all flex items-center gap-2"
                            >
                                <MicOff className="w-4 h-4" /> End Session
                            </button>
                        )}
                    </div>
                    
                    <div className="bg-gray-50 p-3 text-xs text-center text-gray-400 border-t border-gray-100">
                        Powered by Gemini 2.5 Native Audio Live API
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default VoiceAssistant;
