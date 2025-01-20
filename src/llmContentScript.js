// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pasteText') {
    const text = request.text;
    
    // Helper function to set text and trigger input event
    const setTextAreaValue = (textarea, text) => {
      textarea.value = text;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      // Some interfaces need focus and blur events
      textarea.focus();
      textarea.dispatchEvent(new Event('focus', { bubbles: true }));
    };
    
    // Different logic for different LLM services
    if (window.location.hostname === 'chat.deepseek.com') {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        setTextAreaValue(textarea, text);
      }
    }
    
    if (window.location.hostname === 'chat.openai.com') {
      const textarea = document.querySelector('#prompt-textarea');
      if (textarea) {
        setTextAreaValue(textarea, text);
      }
    }
    
    if (window.location.hostname === 'claude.ai') {
      // Wait a bit for Claude's interface to initialize
      setTimeout(() => {
        const textarea = document.querySelector('[role="textbox"]');
        if (textarea) {
          setTextAreaValue(textarea, text);
        }
      }, 1000);
    }
    
    if (window.location.hostname === 'gemini.google.com') {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        setTextAreaValue(textarea, text);
      }
    }
    
    sendResponse({ success: true });
  }
}); 