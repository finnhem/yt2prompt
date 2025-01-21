declare namespace chrome.runtime {
  export function sendMessage<T = any>(message: T): Promise<void>;
  export function connect(connectInfo?: { name?: string }): Port;
  export function getManifest(): chrome.runtime.Manifest;
  export function getURL(path: string): string;
  
  export interface MessageSender {
    tab?: chrome.tabs.Tab;
    frameId?: number;
    id?: string;
    url?: string;
    origin?: string;
  }

  export const onMessage: {
    addListener(
      callback: (
        message: any,
        sender: MessageSender,
        sendResponse: (response?: any) => void
      ) => boolean | void | Promise<void>
    ): void;
    removeListener(callback: Function): void;
  };
}

declare namespace chrome.storage {
  interface StorageArea {
    get(keys: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }>;
    set(items: { [key: string]: any }): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
    clear(): Promise<void>;
  }

  export const local: StorageArea;
  export const sync: StorageArea;
}

interface Port {
  name: string;
  disconnect(): void;
  postMessage(message: any): void;
  onDisconnect: { addListener(callback: (port: Port) => void): void };
  onMessage: { addListener(callback: (message: any, port: Port) => void): void };
}

declare namespace chrome.tabs {
  interface Tab {
    id?: number;
    url?: string;
    title?: string;
    active: boolean;
    windowId: number;
  }

  export function query(queryInfo: {
    active?: boolean;
    currentWindow?: boolean;
  }): Promise<Tab[]>;

  export function create(createProperties: {
    url?: string;
    active?: boolean;
  }): Promise<Tab>;

  export function sendMessage(tabId: number, message: any): Promise<any>;
}

declare namespace chrome {
  export { runtime, tabs, storage };
} 