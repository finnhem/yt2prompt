function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Listen for video navigation
let currentVideoId = getVideoId();

// Watch for URL changes (YouTube is a SPA)
setInterval(() => {
  const newVideoId = getVideoId();
  if (newVideoId !== currentVideoId) {
    currentVideoId = newVideoId;
    chrome.runtime.sendMessage({ type: 'VIDEO_CHANGED', videoId: currentVideoId });
  }
}, 1000); 