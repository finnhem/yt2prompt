import type { VideoChangedMessage } from './types';

function getVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

class YouTubePageObserver {
  private currentVideoId: string | null;
  private observer: MutationObserver;

  constructor() {
    this.currentVideoId = getVideoId();
    this.observer = new MutationObserver(this.handleMutation.bind(this));
    this.startObserving();
  }

  private handleMutation(mutations: MutationRecord[]): void {
    const newVideoId = getVideoId();
    if (newVideoId !== this.currentVideoId) {
      this.currentVideoId = newVideoId;
      if (newVideoId) {
        const message: VideoChangedMessage = {
          type: 'VIDEO_CHANGED',
          videoId: newVideoId,
        };
        chrome.runtime.sendMessage(message).catch((error: Error) => {
          console.error('Error sending video change message:', error);
        });
      }
    }
  }

  private startObserving(): void {
    // Observe changes to the URL (YouTube uses History API)
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Handle initial video
    if (this.currentVideoId) {
      const message: VideoChangedMessage = {
        type: 'VIDEO_CHANGED',
        videoId: this.currentVideoId,
      };
      chrome.runtime.sendMessage(message).catch((error: Error) => {
        console.error('Error sending initial video message:', error);
      });
    }
  }

  public disconnect(): void {
    this.observer.disconnect();
  }
}

// Initialize the observer
const observer = new YouTubePageObserver();
