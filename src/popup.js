import { YoutubeTranscript } from 'youtube-transcript';
import prompts from '/prompts.json';

async function saveLastSelectedPrompt(promptId) {
  await chrome.storage.local.set({ lastSelectedPrompt: promptId });
}

async function getLastSelectedPrompt() {
  const result = await chrome.storage.local.get(['lastSelectedPrompt']);
  return result.lastSelectedPrompt || '';
}

async function saveLastSelectedLLM(llmId) {
  await chrome.storage.local.set({ lastSelectedLLM: llmId });
}

async function getLastSelectedLLM() {
  const result = await chrome.storage.local.get(['lastSelectedLLM']);
  return result.lastSelectedLLM || '';
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getTranscript(videoId) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(entry => entry.text).join(' ');
  } catch (error) {
    throw new Error('Unable to fetch transcript. The video might not have captions available.');
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
}

async function populatePromptSelect() {
  const select = document.getElementById('prompt-select');
  console.log('Available prompts:', prompts);
  const lastSelected = await getLastSelectedPrompt();
  
  prompts.prompts.forEach(prompt => {
    console.log('Adding prompt:', prompt.name);
    const option = document.createElement('option');
    option.value = prompt.id;
    option.textContent = prompt.name;
    if (prompt.id === lastSelected) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  select.addEventListener('change', (event) => {
    saveLastSelectedPrompt(event.target.value);
  });
}

async function openLLMService(serviceUrl, text) {
  // Open the LLM service in a new tab and wait for it to load
  const tab = await chrome.tabs.create({ url: serviceUrl });
  
  // Wait for the page to load and then send the text
  const pasteText = async () => {
    try {
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'pasteText',
        text: text 
      });
    } catch (error) {
      // If the content script isn't ready yet, retry after a delay
      setTimeout(pasteText, 1000);
    }
  };
  
  // Start trying to paste after a short delay to allow the page to load
  setTimeout(pasteText, 2000);
}

async function populateLLMSelect() {
  const select = document.getElementById('llm-select');
  const lastSelected = await getLastSelectedLLM();
  
  prompts.llmServices.forEach(service => {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = service.name;
    if (service.id === lastSelected) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  select.addEventListener('change', (event) => {
    saveLastSelectedLLM(event.target.value);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('transcript-container');
  const copyButton = document.getElementById('copyButton');
  const copyWithPromptButton = document.getElementById('copyWithPromptButton');
  const llmSelect = document.getElementById('llm-select');
  const openLLMButton = document.getElementById('openLLMButton');
  let transcriptText = '';
  
  await populatePromptSelect();
  await populateLLMSelect();
  
  openLLMButton.addEventListener('click', async () => {
    const selectedLLMId = llmSelect.value;
    if (!selectedLLMId) {
      alert('Please select an AI service first');
      return;
    }
    
    const selectedPromptId = document.getElementById('prompt-select').value;
    let textToSend = transcriptText;
    
    if (selectedPromptId) {
      const selectedPrompt = prompts.prompts.find(p => p.id === selectedPromptId);
      if (selectedPrompt) {
        textToSend = selectedPrompt.template.replace('{transcript}', transcriptText);
      }
    }
    
    const selectedService = prompts.llmServices.find(s => s.id === selectedLLMId);
    if (selectedService) {
      await openLLMService(selectedService.url, textToSend);
    }
  });

  try {
    const tab = await getCurrentTab();
    const videoId = new URL(tab.url).searchParams.get('v');
    
    if (!videoId) {
      throw new Error('No YouTube video detected');
    }

    transcriptText = await getTranscript(videoId);
    container.innerHTML = `<p>${transcriptText}</p>`;
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
      const selectedPromptId = document.getElementById('prompt-select').value;
      if (!selectedPromptId) {
        alert('Please select a prompt template first');
        return;
      }
      let textToCopy = transcriptText;
      
      const selectedPrompt = prompts.prompts.find(p => p.id === selectedPromptId);
      if (selectedPrompt) {
        textToCopy = selectedPrompt.template.replace('{transcript}', transcriptText);
      }
      
      const success = await copyToClipboard(textToCopy);
      copyWithPromptButton.textContent = success ? 'Copied!' : 'Failed to copy';
      setTimeout(() => {
        copyWithPromptButton.textContent = 'Copy with Prompt';
      }, 2000);
    });

  } catch (error) {
    container.innerHTML = `<div class="error">${error.message}</div>`;
    llmSelect.disabled = true;
    openLLMButton.disabled = true;
  }
}); 