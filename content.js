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

//adding buy buttons 

// Function to create a button with specified text and click handler
function createButton(text, clickHandler) {
  console.log("inside the create button");
  
  const button = document.createElement('button');
  button.className = 'my-buy-button';
  
  // Set button content with icon and text
  button.innerHTML = `
  <span class="icon">
    <img src="${chrome.runtime.getURL("logo16.png")}" class="button-logo">
  </span> <span class="button-text">${text} SOL</span>
`;

  // Apply styles to match the image
  Object.assign(button.style, {
    background: 'rgba(50, 50, 50, 0.7)', // Dark background
    color: '#fff',
    padding: '8px 15px',
    border: 'none',
    borderRadius: '10px', 
    cursor: 'pointer',
    alignItems: 'center',
    gap: '5px',
    fontSize: '14px',
    fontWeight: 'bold',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    transition: 'opacity 0.2s ease-in-out',
    marginRight: '10px',
  });

  // Icon styling
  // button.querySelector('.solana-icon').style.color = '#b277ff'; // Purple color
  const logo = button.querySelector('.button-logo');
  Object.assign(logo.style, {
    width: '16px',  // Adjust size as needed
    height: '16px',
    objectFit: 'contain',
    verticalAlign: 'middle', // Aligns properly with text
  });

  // Add hover effect
  button.addEventListener('mouseenter', () => {
    button.style.opacity = '0.8';
  });
  button.addEventListener('mouseleave', () => {
    button.style.opacity = '1';
  });

  // Click event
  button.addEventListener('click', clickHandler);

  return button;
}



function addFixedBuyButtons() {
  const targetDiv = document.querySelector('.p-show__bar');
  if (targetDiv) {
    // Prevent duplicate injection
    if (targetDiv.querySelectorAll('.my-buy-button').length > 0) return;

    // Create "Buy 0.5" button
    console.log("justentring");
    const buyButtonHalf = createButton('Buy 0.5', () => {
      console.log('Buy 0.5 button clicked!');
      // Place your buy 0.5 functionality here
    });

    // Create "Buy 1" button
    const buyButtonOne = createButton('Buy 1', () => {
      console.log('Buy 1 button clicked!');
      // Place your buy 1 functionality here
    });

    const buyButtontwo = createButton('Buy 2', () => {
      console.log('Buy 2 button clicked!');
      // Place your buy 1 functionality here
    });

    const buyButtonfive = createButton('Buy 5', () => {
      console.log('Buy 5 button clicked!');
      // Place your buy 1 functionality here
    });
    const buyButtonten = createButton('Buy 10', () => {
      console.log('Buy 10 button clicked!');
      // Place your buy 1 functionality here
    });
    

    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '10px'; // Adjust this value as needed

    buttonContainer.appendChild(buyButtonHalf);
    buttonContainer.appendChild(buyButtonOne);
    buttonContainer.appendChild(buyButtontwo);
    buttonContainer.appendChild(buyButtonfive);
    buttonContainer.appendChild(buyButtonten);

    targetDiv.appendChild(buttonContainer);
    

    console.log('Buy buttons injected successfully.');
    return true;
  }
  return false;
}

// Check if the URL contains "en/lp"
if (window.location.href.includes("en/lp") ||
window.location.href.includes("axiom.trade/meme")) {
  console.log('URL matches condition. Looking for target element...');

  // First, try to inject immediately
  if (!addFixedBuyButtons()) {
    // If not found, set up a MutationObserver to detect when it appears
    const observer = new MutationObserver((mutations, obs) => {
      if (addFixedBuyButtons()) {
        obs.disconnect(); // Stop observing once the buttons are injected
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
} else {
  console.log('URL does not contain "en/lp". No injection performed.');
}

if (
  window.location.href.includes("en/lp") ||
  window.location.href.includes("axiom.trade/meme")
) {
  console.log("Bloom Trading Panel: Available (Ctrl/Cmd+H to open)");

  let modalInstance = null;
  let toastContainer = null;
  let dragPosition = { x: 100, y: 100 };
  let tradingKeyHandler = null;

  // ======================== CORE FUNCTIONALITY ========================
  function createModal() {
    if (modalInstance) return;

    // Create modal container (black background with glass morphism + green border)
    // Create modal container (updated border styling)
    modalInstance = document.createElement("div");
    modalInstance.className = "bloom-modal-container";
    modalInstance.style.cssText = `
       position: fixed;
       top: ${dragPosition.y}px;
       left: ${dragPosition.x}px;
       width: 400px;
       background: rgba(0, 0, 0, 0.6);
       backdrop-filter: blur(12px);
       border-radius: 8px;
       box-shadow: 0 8px 24px rgba(0,0,0,0.5);
       z-index: 99999;
       font-family: -apple-system, sans-serif;
       user-select: none;
       cursor: grab;
     `;

    // Add corner borders
    const createCorner = (position, styles) => {
      const corner = document.createElement("div");
      corner.style.cssText = `
         position: absolute;
         ${position};
         width: 20px;
         height: 20px;
         pointer-events: none;
         ${styles}
       `;
      modalInstance.appendChild(corner);
    };

    // Top-left corner
    createCorner(
      "top: 0; left: 0;",
      "border-top: 2px solid white; border-left: 2px solid white;"
    );
    // Top-right corner
    createCorner(
      "top: 0; right: 0;",
      "border-top: 2px solid white; border-right: 2px solid white;"
    );
    // Bottom-left corner
    createCorner(
      "bottom: 0; left: 0;",
      "border-bottom: 2px solid white; border-left: 2px solid white;"
    );
    // Bottom-right corner
    createCorner(
      "bottom: 0; right: 0;",
      "border-bottom: 2px solid white; border-right: 2px solid white;"
    );
    // Add horizontal line
    const horizontalLine = document.createElement("div");
    horizontalLine.style.cssText = `
       position: absolute;
       top: 8px;
       left: 8%;
       right: 8%;
       height: 1px;
       background: #00ffc1;
       pointer-events: none;
     `;
    modalInstance.appendChild(horizontalLine);

    // Create a grid container for the 8 buttons
    const gridContainer = document.createElement("div");
    gridContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 16px;
    `;

    // Define button parameters
    const buyAmounts = ["0.1", "0.2", "0.5", "1"];
    const buyKeys = ["q", "w", "e", "r"];
    const sellAmounts = ["25%", "50%", "75%", "100%"];
    const sellKeys = ["a", "s", "d", "f"];

    // Helper: create a button with glass morphism style
    function createButton(type, text, key) {
      const btn = document.createElement("button");
      btn.className = `bloom-btn ${type}-btn`;
      btn.dataset.key = key;
      btn.textContent = text;
      btn.style.cssText = `
        position: relative;
        padding: 10px 18px;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 8px;
        background: rgba(255,255,255,0.05);
        backdrop-filter: blur(8px);
        color: #ffffff;
        cursor: pointer;
        transition: all 0.2s;
        font-family: -apple-system, sans-serif;
      `;
      // Add key label (bottom-right)
      const keySpan = document.createElement("span");
      keySpan.textContent = key.toUpperCase();
      keySpan.style.cssText = `
        position: absolute;
        bottom: 2px;
        right: 4px;
        font-size: 10px;
        opacity: 0.7;
      `;
      btn.appendChild(keySpan);

      // Button functionality
      btn.addEventListener("click", (event) => handleTrade(event, type, text));

      // Hover effect
      btn.addEventListener("mouseover", () => {
        btn.style.filter = "brightness(1.2)";
      });
      btn.addEventListener("mouseout", () => {
        btn.style.filter = "none";
      });

      return btn;
    }

    // Create and append buy buttons
    buyAmounts.forEach((amount, index) => {
      gridContainer.appendChild(createButton("buy", amount, buyKeys[index]));
    });

    // Create and append sell buttons
    sellAmounts.forEach((amount, index) => {
      gridContainer.appendChild(createButton("sell", amount, sellKeys[index]));
    });

    modalInstance.appendChild(gridContainer);
    document.body.appendChild(modalInstance);

    // ======================== DRAG FUNCTIONALITY ========================
    let isDragging = false;
    let startX = 0,
      startY = 0;
    modalInstance.addEventListener("mousedown", (e) => {
      // Prevent dragging when clicking on a button
      if (e.target.tagName === "BUTTON") return;
      isDragging = true;
      startX = e.clientX - modalInstance.offsetLeft;
      startY = e.clientY - modalInstance.offsetTop;
      modalInstance.style.cursor = "grabbing";
    });
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      dragPosition.x = e.clientX - startX;
      dragPosition.y = e.clientY - startY;
      modalInstance.style.left = `${dragPosition.x}px`;
      modalInstance.style.top = `${dragPosition.y}px`;
    });
    document.addEventListener("mouseup", () => {
      isDragging = false;
      modalInstance.style.cursor = "grab";
    });

    // ======================== KEYBOARD SHORTCUTS ========================
    tradingKeyHandler = (e) => {
      if (!modalInstance) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      const key = e.key.toLowerCase();
      const buttons = [...modalInstance.querySelectorAll(".bloom-btn")];
      const targetBtn = buttons.find((btn) => btn.dataset.key === key);

      if (targetBtn && !targetBtn.classList.contains("loading")) {
        targetBtn.classList.add("key-active");
        setTimeout(() => targetBtn.classList.remove("key-active"), 150);
        targetBtn.click();
      }
    };

    document.addEventListener("keydown", tradingKeyHandler);
  }

  // ======================== TRADE FUNCTIONALITY ========================
  async function handleTrade(event, type, amount) {
    const btn = event.target;
    if (btn.classList.contains("loading")) return;

    try {
      btn.classList.add("loading");
      // Simulate async action
      await new Promise((resolve) => setTimeout(resolve, 500));
      showToast(`${type === "buy" ? "🟢 Bought" : "🔴 Sold"} ${amount}`);
    } finally {
      btn.classList.remove("loading");
    }
  }

  // ======================== TOAST SYSTEM ========================
  function showToast(message) {
    // Toast container at the TOP of the screen
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100000;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      margin-top: 8px;
      animation: toast-anim 2.5s;
      opacity: 0;
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255,255,255,0.2);
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // ======================== ADDITIONAL STYLES ========================
  const style = document.createElement("style");
  style.textContent = `
    .bloom-btn.key-active {
      transform: scale(0.95) !important;
      filter: brightness(1.2) !important;
    }
    .bloom-btn.loading {
      position: relative;
      color: transparent !important;
      pointer-events: none;
    }
    .bloom-btn.loading::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 18px;
      height: 18px;
      border: 2px solid;
      border-color: currentColor transparent currentColor currentColor;
      border-radius: 50%;
      animation: bloom-spin 0.6s linear infinite;
      margin: -9px 0 0 -9px;
    }
    @keyframes bloom-spin {
      100% { transform: rotate(360deg); }
    }
    @keyframes toast-anim {
      0% { opacity: 0; transform: translateY(-20px); }
      20% { opacity: 1; transform: translateY(0); }
      80% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-20px); }
    }
  `;
  document.head.appendChild(style);

  // ======================== MODAL TOGGLE SHORTCUT ========================
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "h" || !(e.ctrlKey || e.metaKey)) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

    e.preventDefault();
    if (!modalInstance) {
      createModal();
    } else {
      modalInstance.remove();
      modalInstance = null;
    }
  });

  // ======================== URL VALIDATION ========================
  let currentURL = window.location.href;
  setInterval(() => {
    if (window.location.href !== currentURL) {
      currentURL = window.location.href;
      if (
        !currentURL.includes("en/lp") &&
        !currentURL.includes("axiom.trade/meme") &&
        modalInstance
      ) {
        modalInstance.remove();
        modalInstance = null;
      }
    }
  }, 1000);
}