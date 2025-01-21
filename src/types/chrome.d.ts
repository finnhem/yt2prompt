declare namespace chrome.runtime {
  export function sendMessage<T = unknown>(message: T): Promise<void>;
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

  export type MessageResponse = void | boolean | Promise<void>;
  export type MessageCallback = (
    message: unknown,
    sender: MessageSender,
    sendResponse: (response?: unknown) => void
  ) => MessageResponse;

  export const onMessage: {
    addListener(callback: MessageCallback): void;
    removeListener(callback: MessageCallback): void;
  };
}

declare namespace chrome.storage {
  type StorageValue = string | number | boolean | null | undefined | StorageObject | StorageValue[];
  interface StorageObject {
    [key: string]: StorageValue;
  }

  interface StorageArea {
    get(keys: string | string[] | StorageObject | null): Promise<StorageObject>;
    set(items: StorageObject): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
    clear(): Promise<void>;
  }

  export const local: StorageArea;
  export const sync: StorageArea;
}

interface Port {
  name: string;
  disconnect(): void;
  postMessage(message: unknown): void;
  onDisconnect: { addListener(callback: (port: Port) => void): void };
  onMessage: { addListener(callback: (message: unknown, port: Port) => void): void };
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

  export function sendMessage<T = unknown, R = unknown>(
    tabId: number,
    message: T
  ): Promise<R>;
}

declare namespace chrome {
  export { runtime, tabs, storage };
} 