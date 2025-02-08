const SOLANA_ADDRESS_REGEX = /CA:([A-Za-z0-9]{10,})/gi;
const TICKER_REGEX = /\$([A-Za-z]+)\b/g;

let currentPopover = null;

async function fetchJoke(popover) {
  try {
    const response = await fetch('https://icanhazdadjoke.com/slack');
    const jokeData = await response.json();
    const jokeText = jokeData.attachments[0].text;
    const jokeElement = popover.querySelector('#jokeElement');
    if (jokeElement) jokeElement.textContent = jokeText;
  } catch (error) {
    const jokeElement = popover.querySelector('#jokeElement');
    if (jokeElement) jokeElement.textContent = 'Could not fetch joke 😢';
  }
}

function createPopover(text, element) {
  if (currentPopover) currentPopover.remove();

  const popover = document.createElement('div');
  popover.className = 'sol-popover';
  popover.innerHTML = `
    <h3>${text.startsWith('$') ? 'Token' : 'Address'}</h3>
    <div>${text}</div>
    <hr>
    <p id="jokeElement">Loading joke...</p>
    <strong>Dummy Data:</strong>
    <div>Price: $0.00</div>
  `;

  const rect = element.getBoundingClientRect();
  popover.style.top = `${rect.bottom + window.scrollY + 5}px`;
  popover.style.left = `${rect.left + window.scrollX}px`;
  
  document.body.appendChild(popover);
  currentPopover = popover;
  
  // Fetch and display joke immediately
  fetchJoke(popover);
}

// Rest of the code remains the same
function processTextNode(node) {
  const parent = node.parentElement;
  if (parent.classList.contains('sol-highlight')) return;

  const text = node.textContent;
  
  // Process Solana addresses
  let newHtml = text.replace(SOLANA_ADDRESS_REGEX, match => 
    `<span class="sol-highlight">${match}</span>`
  );
  
  // Process tickers
  newHtml = newHtml.replace(TICKER_REGEX, match => 
    `<span class="sol-highlight">${match}</span>`
  );

  if (newHtml !== text) {
    const wrapper = document.createElement('span');
    wrapper.innerHTML = newHtml;
    node.replaceWith(wrapper);
  }
}

function initializeHighlights() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    { acceptNode: node => 
      !node.parentElement.classList.contains('sol-highlight') ? 
      NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT 
    }
  );

  while (walker.nextNode()) {
    processTextNode(walker.currentNode);
  }
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const debouncedInitializeHighlights = debounce(initializeHighlights, 100);

document.addEventListener('mouseover', (e) => {
  const target = e.target.closest('.sol-highlight');
  if (!target) {
    if (currentPopover) {
      currentPopover.remove();
      currentPopover = null;
    }
    return;
  }

  createPopover(target.textContent, target);
});

// Initialize and observe DOM changes
initializeHighlights();
new MutationObserver(debouncedInitializeHighlights).observe(document.body, {
  childList: true,
  subtree: true
});