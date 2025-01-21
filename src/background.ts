import type { Message, VideoChangedMessage } from './types';

// Type guard to check if a message is a VideoChangedMessage
function isVideoChangedMessage(message: Message): message is VideoChangedMessage {
  return message.type === 'VIDEO_CHANGED';
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(((
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): boolean => {
  // Type check the message
  const typedMessage = message as Message;
  
  if (isVideoChangedMessage(typedMessage)) {
    // Handle video change event if needed
    console.log('Video changed:', typedMessage.videoId);
  }
  return true; // Keep the message channel open for sendResponse
}) as chrome.runtime.MessageCallback); 