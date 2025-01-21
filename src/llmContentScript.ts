import type { LLMServiceHostname, PasteTextRequest, PasteTextResponse } from './types';

// Helper function to set text and trigger input event
const setTextAreaValue = (textarea: HTMLTextAreaElement | HTMLElement, text: string): void => {
  if (textarea instanceof HTMLTextAreaElement) {
    textarea.value = text;
  } else {
    textarea.textContent = text;
  }
  
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  // Some interfaces need focus and blur events
  textarea.focus();
  textarea.dispatchEvent(new Event('focus', { bubbles: true }));
};

// Service-specific selectors
const SERVICE_SELECTORS: Record<LLMServiceHostname, string> = {
  'chat.deepseek.com': 'textarea',
  'chat.openai.com': '#prompt-textarea',
  'claude.ai': '[role="textbox"]',
  'gemini.google.com': 'textarea'
};

// Handle text pasting for a specific service
const handleServicePaste = (hostname: LLMServiceHostname, text: string): void => {
  const selector = SERVICE_SELECTORS[hostname];
  const textarea = document.querySelector<HTMLTextAreaElement | HTMLElement>(selector);

  if (textarea) {
    if (hostname === 'claude.ai') {
      // Wait a bit for Claude's interface to initialize
      setTimeout(() => setTextAreaValue(textarea, text), 1000);
    } else {
      setTextAreaValue(textarea, text);
    }
  }
};

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((
  message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: PasteTextResponse) => void
): boolean => {
  // Type guard to validate message is PasteTextRequest
  const request = message as PasteTextRequest;
  if (request.action === 'pasteText') {
    const hostname = window.location.hostname as LLMServiceHostname;
    
    if (hostname in SERVICE_SELECTORS) {
      handleServicePaste(hostname, request.text);
      sendResponse({ success: true });
    } else {
      console.error('Unsupported LLM service:', hostname);
      sendResponse({ success: false });
    }
  }
  return true; // Keep the message channel open for sendResponse
}); 