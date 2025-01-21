// Message types for communication between different parts of the extension
export type MessageType =
  | 'VIDEO_CHANGED'
  | 'GET_TRANSCRIPT'
  | 'TRANSCRIPT_READY'
  | 'APPLY_PROMPT'
  | 'ERROR';

// Base message interface
export interface BaseMessage {
  type: MessageType;
}

// Video changed message
export interface VideoChangedMessage extends BaseMessage {
  type: 'VIDEO_CHANGED';
  videoId: string;
}

// Transcript message
export interface TranscriptMessage extends BaseMessage {
  type: 'TRANSCRIPT_READY';
  transcript: TranscriptEntry[];
}

// Error message
export interface ErrorMessage extends BaseMessage {
  type: 'ERROR';
  error: string;
}

// Prompt application message
export interface ApplyPromptMessage extends BaseMessage {
  type: 'APPLY_PROMPT';
  promptTemplate: string;
  transcript: string;
}

// Union type of all possible messages
export type Message = VideoChangedMessage | TranscriptMessage | ErrorMessage | ApplyPromptMessage;

// Transcript entry structure
export interface TranscriptEntry {
  text: string;
  offset: number;
  duration: number;
}

// Prompt template structure
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  templatePath: string;
}

// LLM Service structure
export interface LLMService {
  id: string;
  name: string;
  url: string;
}

// Prompts configuration structure
export interface PromptsConfig {
  prompts: PromptTemplate[];
  llmServices: LLMService[];
}

// Storage structure
export interface ExtensionStorage {
  lastSelectedPrompt?: string;
  lastSelectedLLM?: string;
}

// Configuration structure
export interface ExtensionConfig {
  promptTemplates: PromptTemplate[];
  selectedTemplate?: string;
}

// LLM Content Script Types
export interface PasteTextRequest {
  action: 'pasteText';
  text: string;
}

export interface PasteTextResponse {
  success: boolean;
}

export type LLMServiceHostname =
  | 'chat.deepseek.com'
  | 'chat.openai.com'
  | 'claude.ai'
  | 'gemini.google.com';
