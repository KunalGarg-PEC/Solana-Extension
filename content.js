const SOLANA_ADDRESS_REGEX = /CA:\s*([A-Za-z0-9]{10,})/i; // Removed 'g' flag

const TICKER_REGEX = /\$([A-Za-z]+)\b/g;

let currentPopover = null;

async function fetchMintInfo(mintAddress, popover) {
  try {
    // Send request through background script
    const { data, error } = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "fetchMintInfo", mintAddress },
        (response) => resolve(response)
      );
    });

    if (error) throw new Error(error);

    // Rest of your existing processing code remains the same
    const decimals = parseInt(data.mintSnap.decimals) || 6;

    const formatValue = (valueStr) => {
      try {
        const value = BigInt(valueStr);
        return (Number(value) / 10 ** decimals).toLocaleString();
      } catch {
        return valueStr;
      }
    };

    const createdAtDate = new Date(parseInt(data.pumpfunSnap.createdAt) * 1000);

    // Update popover elements
    const loading = popover.querySelector("#loading");
    const mintData = popover.querySelector("#mintData");
    const errorElement = popover.querySelector("#error");

    popover.querySelector("#devBuy").textContent = formatValue(
      data.holderStatSnap.devBuy
    );
    popover.querySelector("#sniperBuy").textContent = formatValue(
      data.holderStatSnap.sniperBuy
    );
    popover.querySelector("#t10HoldingPct").textContent =
      data.holderStatSnap.t10HoldingPct;
    popover.querySelector("#holders").textContent = data.holderStatSnap.holders;
    popover.querySelector("#susCount").textContent =
      data.holderStatSnap.susCount;
    popover.querySelector("#createdAt").textContent =
      createdAtDate.toLocaleDateString();
    popover.querySelector("#baseReserve").textContent = formatValue(
      data.pumpfunSnap.baseReserve
    );

    loading.style.display = "none";
    mintData.style.display = "block";
    errorElement.style.display = "none";
  } catch (error) {
    console.error("Fetch error:", error);
    const loading = popover.querySelector("#loading");
    const mintData = popover.querySelector("#mintData");
    const errorElement = popover.querySelector("#error");

    loading.style.display = "none";
    mintData.style.display = "none";
    errorElement.style.display = "block";
  }
}

function createPopover(text, element) {
  if (currentPopover) currentPopover.remove();

  const popover = document.createElement("div");
  popover.className = "sol-popover";

  let mintAddress = "";
  const solanaMatch = text.match(SOLANA_ADDRESS_REGEX); // Use corrected regex without 'g' flag
  if (solanaMatch) {
    mintAddress = solanaMatch[1].trim(); // Correctly captures the address
  }

  popover.innerHTML = `
   <h3>${solanaMatch ? "Address" : "Token"}</h3>
    <div>${text}</div>
    <hr>
    <div id="mintInfo">
      <p id="loading">Loading data...</p>
      <div id="mintData" style="display: none;">
        <strong>Mint Data:</strong>
        <div>Dev Buy: <span id="devBuy"></span></div>
        <div>Sniper Buy: <span id="sniperBuy"></span></div>
        <div>Top 10 Holding %: <span id="t10HoldingPct"></span>%</div>
        <div>Holders: <span id="holders"></span></div>
        <div>Suspicious Count: <span id="susCount"></span></div>
        <div>Created At: <span id="createdAt"></span></div>
        <div>Base Reserve: <span id="baseReserve"></span></div>
      </div>
      <p id="error" style="display: none; color: red;">Could not fetch data 😢</p>
    </div>
  `;

  const rect = element.getBoundingClientRect();
  popover.style.top = `${rect.bottom + window.scrollY + 5}px`;
  popover.style.left = `${rect.left + window.scrollX}px`;

  document.body.appendChild(popover);
  currentPopover = popover;

  if (mintAddress) {
    fetchMintInfo(mintAddress, popover);
  } else {
    const loading = popover.querySelector("#loading");
    const mintData = popover.querySelector("#mintData");
    loading.textContent = "Hover a Solana address (CA:...) for data";
    mintData.style.display = "none";
  }
}

// Rest of the code remains unchanged
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
