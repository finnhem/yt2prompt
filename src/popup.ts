import { YoutubeTranscript } from 'youtube-transcript';
import { 
  PromptsConfig, 
  ExtensionStorage, 
  PromptTemplate, 
  LLMService 
} from './types';

// Load extension configuration using chrome.runtime.getURL
async function loadConfig(): Promise<PromptsConfig> {
  try {
    const configUrl = chrome.runtime.getURL('config.json');
    console.log('Attempting to load configuration from:', configUrl);
    const response = await fetch(configUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Successfully loaded configuration:', data);
    return data;
  } catch (error) {
    console.error('Failed to load configuration:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : '');
    return { prompts: [], llmServices: [] };
  }
}

async function saveLastSelectedPrompt(promptId: string): Promise<void> {
  await chrome.storage.local.set({ lastSelectedPrompt: promptId });
}

async function getLastSelectedPrompt(): Promise<string> {
  const result = await chrome.storage.local.get(['lastSelectedPrompt']) as ExtensionStorage;
  return result.lastSelectedPrompt || '';
}

async function saveLastSelectedLLM(llmId: string): Promise<void> {
  await chrome.storage.local.set({ lastSelectedLLM: llmId });
}

async function getLastSelectedLLM(): Promise<string> {
  const result = await chrome.storage.local.get(['lastSelectedLLM']) as ExtensionStorage;
  return result.lastSelectedLLM || '';
}

async function getCurrentTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getTranscript(videoId: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(entry => entry.text).join(' ');
  } catch (error) {
    throw new Error('Unable to fetch transcript. The video might not have captions available.');
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
}

async function updatePreviewContent(
  container: HTMLElement, 
  transcriptText: string, 
  promptId: string
): Promise<void> {
  if (promptId) {
    const template = await getPromptTemplate(promptId);
    if (template) {
      // Extract content from XML between <content> tags
      const contentMatch = template.match(/<content>([\s\S]*?)<\/content>/);
      const templateContent = contentMatch ? contentMatch[1].trim() : template;
      
      // Replace transcript placeholder and preserve whitespace
      const formattedContent = templateContent
        .replace('{{transcript}}', transcriptText)
        .replace(/\n/g, '<br>')
        .replace(/ {2,}/g, space => '&nbsp;'.repeat(space.length));
      
      container.innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace;">${formattedContent}</pre>`;
      return;
    }
  }
  container.innerHTML = `<p style="white-space: pre-wrap; word-wrap: break-word;">${transcriptText}</p>`;
}

async function populatePromptSelect(): Promise<void> {
  const select = document.getElementById('prompt-select') as HTMLSelectElement;
  try {
    console.log('Starting to populate prompt select');
    const config = await loadConfig();
    console.log('Available prompts:', config);
    
    if (!config || !config.prompts || !Array.isArray(config.prompts)) {
      console.error('Invalid configuration structure:', config);
      throw new Error('Invalid configuration structure');
    }
    
    const lastSelected = await getLastSelectedPrompt();
    console.log('Last selected prompt:', lastSelected);
    
    // Clear existing options
    select.innerHTML = '<option value="">Select a prompt template...</option>';
    
    config.prompts.forEach(prompt => {
      console.log('Adding prompt:', prompt);
      const option = document.createElement('option');
      option.value = prompt.id;
      option.textContent = prompt.name;
      if (prompt.id === lastSelected) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    
    select.addEventListener('change', async (event) => {
      const target = event.target as HTMLSelectElement;
      console.log('Prompt selection changed:', target.value);
      await saveLastSelectedPrompt(target.value);
      const container = document.getElementById('transcript-container');
      if (container) {
        await updatePreviewContent(
          container, 
          container.dataset.transcriptText || '', 
          target.value
        );
      }
    });
  } catch (error) {
    console.error('Error populating prompt select:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : '');
    select.innerHTML = '<option value="">Error loading prompts</option>';
  }
}

async function openLLMService(serviceUrl: string, text: string): Promise<void> {
  // Open the LLM service in a new tab and wait for it to load
  const tab = await chrome.tabs.create({ url: serviceUrl });
  
  // Wait for the page to load and then send the text
  const pasteText = async () => {
    try {
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'pasteText',
          text: text 
        });
      }
    } catch (error) {
      // If the content script isn't ready yet, retry after a delay
      setTimeout(pasteText, 1000);
    }
  };
  
  // Start trying to paste after a short delay to allow the page to load
  setTimeout(pasteText, 2000);
}

async function populateLLMSelect(): Promise<void> {
  const select = document.getElementById('llm-select') as HTMLSelectElement;
  try {
    const config = await loadConfig();
    const lastSelected = await getLastSelectedLLM();
    
    config.llmServices.forEach(service => {
      const option = document.createElement('option');
      option.value = service.id;
      option.textContent = service.name;
      if (service.id === lastSelected) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    
    select.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement;
      saveLastSelectedLLM(target.value);
    });
  } catch (error) {
    console.error('Error populating LLM select:', error);
    select.innerHTML = '<option value="">Error loading services</option>';
  }
}

async function loadXMLTemplate(templatePath: string): Promise<string | null> {
  try {
    const response = await fetch(chrome.runtime.getURL(templatePath));
    const xmlText = await response.text();
    return xmlText; // Return the entire XML content as is
  } catch (error) {
    console.error('Failed to load XML template:', error);
    return null;
  }
}

async function getPromptTemplate(promptId: string): Promise<string | null> {
  const config = await loadConfig();
  const selectedPrompt = config.prompts.find(p => p.id === promptId);
  if (!selectedPrompt) return null;
  
  const template = await loadXMLTemplate(selectedPrompt.templatePath);
  console.log(template);
  return template;
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('transcript-container') as HTMLElement;
  const copyButton = document.getElementById('copyButton') as HTMLButtonElement;
  const copyWithPromptButton = document.getElementById('copyWithPromptButton') as HTMLButtonElement;
  const llmSelect = document.getElementById('llm-select') as HTMLSelectElement;
  const openLLMButton = document.getElementById('openLLMButton') as HTMLButtonElement;
  let transcriptText = '';
  
  await populatePromptSelect();
  await populateLLMSelect();

  // Store transcript text in a data attribute to preserve raw text
  const setTranscriptText = async (text: string) => {
    transcriptText = text;
    container.dataset.transcriptText = text;
    const promptSelect = document.getElementById('prompt-select') as HTMLSelectElement;
    await updatePreviewContent(container, text, promptSelect.value);
  };
  
  // Update prompt select to use stored transcript text
  const select = document.getElementById('prompt-select') as HTMLSelectElement;
  select.addEventListener('change', async (event) => {
    const target = event.target as HTMLSelectElement;
    await saveLastSelectedPrompt(target.value);
    await updatePreviewContent(container, container.dataset.transcriptText || '', target.value);
  });
  
  openLLMButton.addEventListener('click', async () => {
    const selectedLLMId = llmSelect.value;
    if (!selectedLLMId) {
      alert('Please select an AI service first');
      return;
    }
    
    const promptSelect = document.getElementById('prompt-select') as HTMLSelectElement;
    const selectedPromptId = promptSelect.value;
    let textToSend = transcriptText;
    
    if (selectedPromptId) {
      const template = await getPromptTemplate(selectedPromptId);
      if (template) {
        textToSend = template.replace('{{transcript}}', transcriptText);
      }
    }
    
    // Copy to clipboard
    const success = await copyToClipboard(textToSend);
    if (success) {
      openLLMButton.textContent = 'Copied!';
      setTimeout(() => {
        openLLMButton.textContent = 'Open in AI Chat';
      }, 2000);
    }
    
    const config = await loadConfig();
    const selectedService = config.llmServices.find(s => s.id === selectedLLMId);
    if (selectedService) {
      await openLLMService(selectedService.url, textToSend);
    }
  });

  try {
    const tab = await getCurrentTab();
    if (!tab.url) throw new Error('No URL found');
    
    const videoId = new URL(tab.url).searchParams.get('v');
    if (!videoId) {
      throw new Error('No YouTube video detected');
    }

    const text = await getTranscript(videoId);
    await setTranscriptText(text);
    copyButton.disabled = false;
    copyWithPromptButton.disabled = false;
    llmSelect.disabled = false;
    openLLMButton.disabled = false;

    copyButton.addEventListener('click', async () => {
      const success = await copyToClipboard(transcriptText);
      copyButton.textContent = success ? 'Copied!' : 'Failed to copy';
      setTimeout(() => {
        copyButton.textContent = 'Copy Transcript';
      }, 2000);
    });

    copyWithPromptButton.addEventListener('click', async () => {
      const promptSelect = document.getElementById('prompt-select') as HTMLSelectElement;
      const selectedPromptId = promptSelect.value;
      if (!selectedPromptId) {
        alert('Please select a prompt template first');
        return;
      }
      let textToCopy = transcriptText;
      
      const template = await getPromptTemplate(selectedPromptId);
      if (template) {
        textToCopy = template.replace('{{transcript}}', transcriptText);
      }
      
      const success = await copyToClipboard(textToCopy);
      copyWithPromptButton.textContent = success ? 'Copied!' : 'Failed to copy';
      setTimeout(() => {
        copyWithPromptButton.textContent = 'Copy with Prompt';
      }, 2000);
    });

  } catch (error) {
    container.innerHTML = `<div class="error">${error instanceof Error ? error.message : 'Unknown error'}</div>`;
    llmSelect.disabled = true;
    openLLMButton.disabled = true;
  }
}); 