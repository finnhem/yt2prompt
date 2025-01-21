import { Message, VideoChangedMessage } from './types';

// Type guard to check if a message is a VideoChangedMessage
function isVideoChangedMessage(message: Message): message is VideoChangedMessage {
  return message.type === 'VIDEO_CHANGED';
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean => {
  if (isVideoChangedMessage(message)) {
    // Handle video change event if needed
    console.log('Video changed:', message.videoId);
  }
  return true; // Keep the message channel open for sendResponse
}); 