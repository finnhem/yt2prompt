import { YoutubeTranscript } from 'youtube-transcript';

// Load prompts.json using chrome.runtime.getURL
async function loadPrompts() {
  try {
    const promptsUrl = chrome.runtime.getURL('prompts.json');
    console.log('Attempting to load prompts from:', promptsUrl);
    const response = await fetch(promptsUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Successfully loaded prompts:', data);
    return data;
  } catch (error) {
    console.error('Failed to load prompts:', error);
    console.error('Stack trace:', error.stack);
    return { prompts: [], llmServices: [] };
  }
}

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

async function updatePreviewContent(container, transcriptText, promptId) {
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

async function populatePromptSelect() {
  const select = document.getElementById('prompt-select');
  try {
    console.log('Starting to populate prompt select');
    const prompts = await loadPrompts();
    console.log('Available prompts:', prompts);
    
    if (!prompts || !prompts.prompts || !Array.isArray(prompts.prompts)) {
      console.error('Invalid prompts data structure:', prompts);
      throw new Error('Invalid prompts data structure');
    }
    
    const lastSelected = await getLastSelectedPrompt();
    console.log('Last selected prompt:', lastSelected);
    
    // Clear existing options
    select.innerHTML = '<option value="">Select a prompt template...</option>';
    
    prompts.prompts.forEach(prompt => {
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
      console.log('Prompt selection changed:', event.target.value);
      saveLastSelectedPrompt(event.target.value);
      const container = document.getElementById('transcript-container');
      await updatePreviewContent(container, container.dataset.transcriptText || '', event.target.value);
    });
  } catch (error) {
    console.error('Error populating prompt select:', error);
    console.error('Stack trace:', error.stack);
    select.innerHTML = '<option value="">Error loading prompts</option>';
  }
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
  try {
    const prompts = await loadPrompts();
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
  } catch (error) {
    console.error('Error populating LLM select:', error);
    select.innerHTML = '<option value="">Error loading services</option>';
  }
}

async function loadXMLTemplate(templatePath) {
  try {
    const response = await fetch(chrome.runtime.getURL(templatePath));
    const xmlText = await response.text();
    return xmlText; // Return the entire XML content as is
  } catch (error) {
    console.error('Failed to load XML template:', error);
    return null;
  }
}

async function getPromptTemplate(promptId) {
  const selectedPrompt = await loadPrompts().then(prompts => prompts.prompts.find(p => p.id === promptId));
  if (!selectedPrompt) return null;
  
  const template = await loadXMLTemplate(selectedPrompt.templatePath);
  console.log(template);
  return template;
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

  // Store transcript text in a data attribute to preserve raw text
  const setTranscriptText = async (text) => {
    transcriptText = text;
    container.dataset.transcriptText = text;
    const selectedPromptId = document.getElementById('prompt-select').value;
    await updatePreviewContent(container, text, selectedPromptId);
  };
  
  // Update prompt select to use stored transcript text
  const select = document.getElementById('prompt-select');
  select.addEventListener('change', async (event) => {
    saveLastSelectedPrompt(event.target.value);
    await updatePreviewContent(container, container.dataset.transcriptText || '', event.target.value);
  });
  
  openLLMButton.addEventListener('click', async () => {
    const selectedLLMId = llmSelect.value;
    if (!selectedLLMId) {
      alert('Please select an AI service first');
      return;
    }
    
    const selectedPromptId = document.getElementById('prompt-select').value;
    let textToSend = transcriptText;
    
    if (selectedPromptId) {
      const template = await getPromptTemplate(selectedPromptId);
      if (template) {
        textToSend = template.replace('{{transcript}}', transcriptText);
      }
    }
    
    const selectedService = await loadPrompts().then(prompts => prompts.llmServices.find(s => s.id === selectedLLMId));
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
      const selectedPromptId = document.getElementById('prompt-select').value;
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
    container.innerHTML = `<div class="error">${error.message}</div>`;
    llmSelect.disabled = true;
    openLLMButton.disabled = true;
  }
}); 