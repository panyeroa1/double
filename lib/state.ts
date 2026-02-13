
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE_STAFF, DEFAULT_VOICE_GUEST } from './constants';
import {
  FunctionDeclaration,
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
} from '@google/genai';

const generateSystemPrompt = (lang1: string, lang2: string, topic: string) => {
  const isAuto1 = lang1 === 'auto';
  const isAuto2 = lang2 === 'auto';
  const l1Desc = isAuto1 ? 'the detected language' : lang1;
  const l2Desc = isAuto2 ? 'the detected language' : lang2;

  const topicInstruction = topic ? `The conversation is about: ${topic}. Please use appropriate terminology and context.` : '';
  return `You are an expert language translator. Your only task is to translate text between ${l1Desc} and ${l2Desc}.

**CRITICAL INSTRUCTIONS:**
1. DETECT the language of the input text.
2. TRANSLATE the input text into the other language (e.g., if it is ${l1Desc}, translate it to ${l2Desc}; if it is ${l2Desc}, translate it to ${l1Desc}).
3. MIMIC the nuances of the source audio. This includes:
   - Tone and emotion
   - Speed and rhythm
   - Emphasis and hesitation
   - Formality level
   - Any specific vocal characteristics that convey meaning.
4. OUTPUT **ONLY** THE TRANSLATED TEXT.
5. OUTPUT **ONLY** THE TRANSLATED TEXT.
6. OUTPUT **ONLY** THE TRANSLATED TEXT.

**DO NOT:**
- DO NOT add any prefixes, labels, or explanations (e.g., "In Spanish: ...").
- DO NOT have a conversation.
- DO NOT add any commentary or remarks.
- DO NOT ask questions.

Your entire response must be the translated phrase. For example, if the target language is Spanish, your output must be "Hola", not "The translation is Hola".
${topicInstruction}
`;
};


/**
 * Settings
 */
export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice1: string;
  voice2: string;
  language1: string;
  language2: string;
  topic: string;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice1: (voice: string) => void;
  setVoice2: (voice: string) => void;
  setLanguage1: (language: string) => void;
  setLanguage2: (language: string) => void;
  setTopic: (topic: string) => void;
}>((set, get) => ({
  systemPrompt: generateSystemPrompt('auto', 'English (US)', ''),
  model: DEFAULT_LIVE_API_MODEL,
  voice1: DEFAULT_VOICE_STAFF,
  voice2: DEFAULT_VOICE_GUEST,
  language1: 'auto',
  language2: 'English (US)',
  topic: '',
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice1: voice => set({ voice1: voice }),
  setVoice2: voice => set({ voice2: voice }),
  setLanguage1: language => set({
    language1: language,
    systemPrompt: generateSystemPrompt(language, get().language2, get().topic)
  }),
  setLanguage2: language => set({
    language2: language,
    systemPrompt: generateSystemPrompt(get().language1, language, get().topic)
  }),
  setTopic: topic => set({
    topic: topic,
    systemPrompt: generateSystemPrompt(get().language1, get().language2, topic)
  }),
}));

/**
 * UI
 */
export const useUI = create<{
  isSidebarOpen: boolean;
  activeTab: 'settings' | 'history';
  toggleSidebar: () => void;
  setActiveTab: (tab: 'settings' | 'history') => void;
}>(set => ({
  isSidebarOpen: false,
  activeTab: 'settings',
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  setActiveTab: (tab: 'settings' | 'history') => set({ activeTab: tab }),
}));

/**
 * Tools
 */
export interface FunctionCall {
  name: string;
  description: string;
  parameters: any;
  isEnabled: boolean;
  scheduling: FunctionResponseScheduling;
}

/**
 * Logs
 */
export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
  groundingChunks?: GroundingChunk[];
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  setTurns: (turns: ConversationTurn[]) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set, get) => ({
  turns: [],
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({
      turns: [...state.turns, { ...turn, timestamp: new Date() }],
    })),
  setTurns: (turns: ConversationTurn[]) => set({ turns }),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) {
        return state;
      }
      const newTurns = [...state.turns];
      const lastTurn = { ...newTurns[newTurns.length - 1], ...update };
      newTurns[newTurns.length - 1] = lastTurn;
      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [] }),
}));
