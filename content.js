const SOLANA_ADDRESS_REGEX = /CA:\s*([A-Za-z0-9]{10,})/i;
const TICKER_REGEX = /\$([A-Za-z]+)\b/g;
let currentPopover = null;

async function fetchMintInfo(mintAddress, popover) {
  try {
    const { data, error } = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "fetchMintInfo", mintAddress },
        (response) => resolve(response)
      );
    });

    if (error) throw new Error(error);
    const decimals = parseInt(data.mintSnap.decimals) || 6;

    const formatValue = (valueStr) => {
      try {
        const value = BigInt(valueStr);
        return (Number(value) / 10 ** decimals).toLocaleString();
      } catch {
        return valueStr;
      }
    };

    const loading = popover.querySelector("#loading");
    const mintData = popover.querySelector("#mintData");
    
    popover.querySelector("#devBuy").textContent = formatValue(data.holderStatSnap.devHoldingPct);
    popover.querySelector("#sniperBuy").textContent = formatValue(data.holderStatSnap.sniperHoldingPct);
    popover.querySelector("#t10HoldingPct").textContent = data.holderStatSnap.t10HoldingPct;
    popover.querySelector("#holders").textContent = data.holderStatSnap.holders;
    popover.querySelector("#susCount").textContent = data.holderStatSnap.susCount;
    popover.querySelector("#bundleCount").textContent = data.holderStatSnap.bundleCount;
    popover.querySelector("#termHoldingPct").textContent = data.holderStatSnap.termHoldingPct;

    loading.style.display = "none";
    mintData.style.display = "grid";
  } catch (error) {
    console.error("Fetch error:", error);
    const errorElement = popover.querySelector("#error");
    popover.querySelector("#loading").style.display = "none";
    errorElement.style.display = "block";
  }
}

function createPopover(text, element) {
  if (currentPopover) currentPopover.remove();

  const popover = document.createElement("div");
  popover.className = "sol-popover";
  
  const mintAddress = text.match(SOLANA_ADDRESS_REGEX)?.[1]?.trim() || "";
  
  popover.innerHTML = `
    <h3>${mintAddress ? "Address" : "Token"} <img src="${chrome.runtime.getURL("logo16.png")}" class="header-icon"></h3>
    <div>${text}</div>
    <hr>
    <div id="mintInfo">
      <p id="loading">Loading data...</p>
      <div id="mintData" style="display: none;">
        <strong>Mint Data: </strong>
        <div>
          <img src="${chrome.runtime.getURL("code.png")}" class="data-icon">
          <span class="dev-label">
            DEV : <span id="devBuy"></span>%
          </span>
        </div>
        <div><img src="${chrome.runtime.getURL("crosshair.png")}" class="data-icon"><span class="sniper-label">SNIPER : <span id="sniperBuy"></span>%</span></div>
        <div><img src="${chrome.runtime.getURL("10.jpg")}" class="data-icon"><span class="t10HoldingPct-label">TOP 10 : <span id="t10HoldingPct"></span>%</span></div>
        <div><img src="${chrome.runtime.getURL("H.png")}" class="data-icon"><span class="holders-label">HOLDERS : <span id="holders"></span></span></div>
        <div><img src="${chrome.runtime.getURL("user.png")}" class="data-icon"><span class="susCount-label">HUMAN : <span id="susCount"></span></span></div>
        <div><img src="${chrome.runtime.getURL("package.png")}" class="data-icon"><span class="bundleCount-label">BUNDLER : <span id="bundleCount"></span></span></div>
        <div ><img src="${chrome.runtime.getURL("square-terminal.png")}" class="data-icon"><span class="termHoldingPct-label">TERMINAL : <span id="termHoldingPct"></span>%</span></div>
      </div>
      <p id="error" style="display: none; color: red;">Could not fetch data 😢</p>
    </div>
  `;

  const rect = element.getBoundingClientRect();
  popover.style.top = `${rect.bottom + window.scrollY + 5}px`;
  popover.style.left = `${rect.left + window.scrollX}px`;
  document.body.appendChild(popover);
  currentPopover = popover;

  mintAddress && fetchMintInfo(mintAddress, popover);
}

function processTextNode(node) {
  const parent = node.parentElement;
  if (parent.classList.contains("sol-highlight")) return;

  const text = node.textContent;

  let newHtml = text.replace(
    SOLANA_ADDRESS_REGEX,
    (match) => `<span class="sol-highlight">${match}</span>`
  );

  newHtml = newHtml.replace(
    TICKER_REGEX,
    (match) => `<span class="sol-highlight">${match}</span>`
  );

  if (newHtml !== text) {
    const wrapper = document.createElement("span");
    wrapper.innerHTML = newHtml;
    node.replaceWith(wrapper);
  }
}

function initializeHighlights() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) =>
        !node.parentElement.classList.contains("sol-highlight")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    }
  );

  while (walker.nextNode()) {
    processTextNode(walker.currentNode);
  }
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const debouncedInitializeHighlights = debounce(initializeHighlights, 100);

document.addEventListener("mouseover", (e) => {
  const target = e.target.closest(".sol-highlight");
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
  subtree: true,
});

if (window.location.href.includes('en/lp')) {
  // Create the buy button element
  const buyButton = document.createElement('button');
  buyButton.innerText = 'Buy';
  
  // Style the button to appear at the top of the page
  Object.assign(buyButton.style, {
    position: 'fixed',
    top: '10px',
    right: '10px',
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    zIndex: 10000,
    cursor: 'pointer'
  });
  
  // Optionally add an event listener to handle button clicks
  buyButton.addEventListener('click', () => {
    // Your buy functionality or API call goes here
    console.log('Buy button clicked!');
    // For example, open a new tab or call your API
  });
  
  // Insert the button into the DOM (e.g., append to document body)
  document.body.appendChild(buyButton);
}

