// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VIDEO_CHANGED') {
    // Handle video change event if needed
    console.log('Video changed:', message.videoId);
  }
  return true;
}); 