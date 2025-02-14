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

    popover.querySelector("#devBuy").textContent = formatValue(
      data.holderStatSnap.devHoldingPct
    );
    popover.querySelector("#sniperBuy").textContent = formatValue(
      data.holderStatSnap.sniperHoldingPct
    );
    popover.querySelector("#t10HoldingPct").textContent =
      data.holderStatSnap.t10HoldingPct;
    popover.querySelector("#holders").textContent = data.holderStatSnap.holders;
    popover.querySelector("#susCount").textContent =
      data.holderStatSnap.susCount;
    popover.querySelector("#bundleCount").textContent =
      data.holderStatSnap.bundleCount;
    popover.querySelector("#termHoldingPct").textContent =
      data.holderStatSnap.termHoldingPct;

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
    <h3>${mintAddress ? "Address" : "Token"} <img src="${chrome.runtime.getURL(
    "logo16.png"
  )}" class="header-icon"></h3>
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
        <div><img src="${chrome.runtime.getURL(
          "crosshair.png"
        )}" class="data-icon"><span class="sniper-label">SNIPER : <span id="sniperBuy"></span>%</span></div>
        <div><img src="${chrome.runtime.getURL(
          "10.jpg"
        )}" class="data-icon"><span class="t10HoldingPct-label">TOP 10 : <span id="t10HoldingPct"></span>%</span></div>
        <div><img src="${chrome.runtime.getURL(
          "H.png"
        )}" class="data-icon"><span class="holders-label">HOLDERS : <span id="holders"></span></span></div>
        <div><img src="${chrome.runtime.getURL(
          "user.png"
        )}" class="data-icon"><span class="susCount-label">HUMAN : <span id="susCount"></span></span></div>
        <div><img src="${chrome.runtime.getURL(
          "package.png"
        )}" class="data-icon"><span class="bundleCount-label">BUNDLER : <span id="bundleCount"></span></span></div>
        <div ><img src="${chrome.runtime.getURL(
          "square-terminal.png"
        )}" class="data-icon"><span class="termHoldingPct-label">TERMINAL : <span id="termHoldingPct"></span>%</span></div>
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

if (window.location.href.includes("en/lp")) {
  // Create the buy button element
  const buyButton = document.createElement("button");
  buyButton.innerText = "Buy";

  // Style the button to appear at the top of the page
  Object.assign(buyButton.style, {
    position: "fixed",
    top: "10px",
    right: "10px",
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    zIndex: 10000,
    cursor: "pointer",
  });

  // Optionally add an event listener to handle button clicks
  buyButton.addEventListener("click", () => {
    // Your buy functionality or API call goes here
    console.log("Buy button clicked!");
    // For example, open a new tab or call your API
  });

  // Insert the button into the DOM (e.g., append to document body)
  document.body.appendChild(buyButton);
}

// // Create main panel container
// const panel = document.createElement("div");
// panel.innerHTML = `
//     <div class="trading-panel">
//       <div class="section buy-section">
//         <h3>Buy</h3>
//         <div class="button-grid">
//           <button data-key="q">0.01 (Q)</button>
//           <button data-key="w">0.02 (W)</button>
//           <button data-key="e">0.5 (E)</button>
//           <button data-key="r">1 (R)</button>
//         </div>
//       </div>
//       <div class="section sell-section">
//         <h3>Sell</h3>
//         <div class="button-grid">
//           <button data-key="a">25% (A)</button>
//           <button data-key="s">50% (S)</button>
//           <button data-key="d">75% (D)</button>
//           <button data-key="f">100% (F)</button>
//         </div>
//       </div>
//     </div>
//   `;

// // Panel styling
// const style = document.createElement("style");
// style.textContent = `
//     .trading-panel {
//       display: none;
//       position: fixed;
//       top: 50%;
//       left: 50%;
//       transform: translate(-50%, -50%);
//       background: rgba(0, 0, 0, 0.9);
//       padding: 20px;
//       border-radius: 12px;
//       color: white;
//       z-index: 10001;
//       box-shadow: 0 4px 12px rgba(0,0,0,0.25);
//       font-family: Arial, sans-serif;
//     }

// .trading-panel.visible {
//   display: grid; /* Changed from block for better layout */
//   gap: 15px; /* Add spacing between sections */
// }
//     .section {
//       margin-bottom: 20px;
//     }

//     .button-grid {
//       display: grid;
//       grid-template-columns: repeat(4, 1fr);
//       gap: 10px;
//     }

//     button {
//       padding: 8px 12px;
//       border: none;
//       border-radius: 6px;
//       cursor: pointer;
//       background: #333;
//       color: white;
//       transition: all 0.2s;
//     }

//     .buy-section button {
//       background: #28a745;
//     }

//     .sell-section button {
//       background: #dc3545;
//     }

//     button:hover {
//       opacity: 0.9;
//       transform: scale(0.98);
//     }
//   `;

// document.head.appendChild(style);
// document.body.appendChild(panel);

// // Keyboard handling
// let panelVisible = false;

// function handleKeyDown(e) {
//   // Open/close panel with Cmd/Ctrl + P
//   const key = e.key.toLowerCase();
//   if ((e.metaKey || e.ctrlKey) && key === "p") {
//     e.preventDefault();
//     panelVisible = !panelVisible;
//     panel.classList.toggle("visible", panelVisible);
//     return;
//   }

//   // Handle key presses only when panel is visible
//   if (panelVisible) {
//     e.preventDefault();
//     const key = e.key.toLowerCase();
//     const button = panel.querySelector(`[data-key="${key}"]`);

//     if (button) {
//       button.click();
//       // Add your trade execution logic here
//       console.log(`Executing ${button.innerText}`);
//     }

//     // Close panel on Escape
//     if (e.key === "Escape") {
//       panelVisible = false;
//       panel.classList.remove("visible");
//     }
//   }
// }

// // Close panel when clicking outside
// document.addEventListener("click", (e) => {
//   if (panelVisible && !panel.contains(e.target)) {
//     panelVisible = false;
//     panel.classList.remove("visible");
//   }
// });

// document.addEventListener("keydown", handleKeyDown);

// function createAndShowModal() {
//   // Create overlay
//   const modalOverlay = document.createElement("div");
//   modalOverlay.id = "trade-modal-overlay";
//   Object.assign(modalOverlay.style, {
//     position: "fixed",
//     top: "0",
//     left: "0",
//     width: "100vw",
//     height: "100vh",
//     background: "rgba(0, 0, 0, 0.5)",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     zIndex: "99999",
//   });

//   // Create modal container
//   const modalContainer = document.createElement("div");
//   modalContainer.id = "trade-modal-container";
//   modalContainer.innerHTML = `
//     <h2>Trade Options</h2>
//     <button id="buy-button-modal">Buy</button>
//     <button id="sell-button-modal">Sell</button>
//     <br/><br/>
//     <button id="close-modal">Close</button>
//   `;
//   Object.assign(modalContainer.style, {
//     background: "#fff",
//     padding: "20px",
//     borderRadius: "10px",
//     boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
//     textAlign: "center",
//     maxWidth: "300px",
//     fontFamily: "Arial, sans-serif",
//   });

//   // Append modal container to overlay and overlay to body
//   modalOverlay.appendChild(modalContainer);
//   document.body.appendChild(modalOverlay);

//   // Add event listeners
//   document.getElementById("close-modal").addEventListener("click", () => {
//     modalOverlay.remove();
//   });
//   document.getElementById("buy-button-modal").addEventListener("click", () => {
//     console.log("Buy button clicked!");
//   });
//   document.getElementById("sell-button-modal").addEventListener("click", () => {
//     console.log("Sell button clicked!");
//   });

//   console.log("Trade modal injected successfully.");
// }

// // Check URL condition firs

// if (window.location.href.includes("en/lp")) {
//   console.log("URL contains 'en/lp'");
//   let modalAdded = false; // Flag to track if modal was already added

//   function initModal() {
//     if (modalAdded) return;
//     modalAdded = true;
//     addBloomQuickPanel();
//   }

//   // Try injecting after window load
//   window.addEventListener("load", initModal);

//   // MutationObserver configuration
//   const observer = new MutationObserver((mutations) => {
//     if (!document.getElementById("trade-modal-overlay")) {
//       initModal();
//     }
//   });

//   observer.observe(document.body, {
//     childList: true,
//     subtree: true,
//     attributes: false,
//     characterData: false,
//   });
// } else {
//   console.log("URL does not contain 'en/lp'. No modal injected.");
// }

// // MODAL CREATION
// function addBloomQuickPanel() {
//   if (document.querySelector(".bloomModalContainer")) return;

//   const container = document.createElement("div");
//   container.classList.add("bloomModalContainer");
//   styleContainer(container);

//   // Header with region selector
//   const header = createHeader();
//   container.appendChild(header);

//   // Body with Buy/Sell sections
//   const bodyWrapper = document.createElement("div");
//   addBuySection(bodyWrapper);
//   addSellSection(bodyWrapper);
//   container.appendChild(bodyWrapper);

//   // Inject into the page
//   document.body.appendChild(container);

//   // Restore saved position
//   const savedPos = localStorage.getItem("bloom.position");
//   if (savedPos) {
//     const { x, y } = JSON.parse(savedPos);
//     container.style.left = `${x}px`;
//     container.style.top = `${y}px`;
//   }

//   initializePanelDrag(container);
//   if (!window.bloomKeyboardHandlerAdded) {
//     const handleKeydown = (e) => {
//       const modal = document.querySelector(".bloomModalContainer");
//       if (!modal) return;

//       const key = e.key.toLowerCase();

//       // Buy mappings (q, w, e, r)
//       if (["q", "w", "e", "r"].includes(key)) {
//         const index = ["q", "w", "e", "r"].indexOf(key);
//         const buttons = modal.querySelectorAll(".bloom-buy-btn");
//         if (buttons[index]) {
//           buttons[index].click();
//           e.preventDefault();
//         }
//       }

//       // Sell mappings (a, s, d, f)
//       if (["a", "s", "d", "f"].includes(key)) {
//         const index = ["a", "s", "d", "f"].indexOf(key);
//         const buttons = modal.querySelectorAll(".bloom-sell-btn");
//         if (buttons[index]) {
//           buttons[index].click();
//           e.preventDefault();
//         }
//       }
//     };

//     document.addEventListener("keydown", handleKeydown);
//     window.bloomKeyboardHandlerAdded = true;
//   }
// }

// function addSellSection(parent) {
//   const sellSection = document.createElement("div");
//   sellSection.innerHTML = `<div style="color: #ff3b3b; margin: 16px 0 8px;">Quick Sell</div>`;

//   const percentages = ["25%", "50%", "75%", "100%"];
//   percentages.forEach((percent) => {
//     const btn = document.createElement("button");
//     btn.classList.add("bloom-sell-btn");
//     btn.textContent = percent;
//     Object.assign(btn.style, {
//       margin: "4px",
//       background: "transparent",
//       border: "1px solid #ff3b3b",
//       color: "#ff3b3b",
//       borderRadius: "4px",
//       padding: "6px 12px",
//       cursor: "pointer",
//       transition: "all 0.2s ease", // Add smooth hover effect
//     });

//     // Hover effects
//     btn.addEventListener("mouseenter", () => {
//       btn.style.background = "#ff3b3b33";
//     });
//     btn.addEventListener("mouseleave", () => {
//       btn.style.background = "transparent";
//     });

//     sellSection.appendChild(btn);
//   });

//   parent.appendChild(sellSection);
// }

// // STYLING FUNCTIONS
// function styleContainer(el) {
//   Object.assign(el.style, {
//     position: "fixed",
//     top: "100px",
//     left: "100px",
//     width: "280px",
//     background: "#1d2040",
//     borderRadius: "10px",
//     padding: "8px",
//     boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
//     zIndex: 99999,
//     border: "1px solid #5e5e68",
//     fontFamily: "sans-serif",
//     color: "white",
//     userSelect: "none",
//     cursor: "grab", // Default grab cursor
//   });
// }

// function createHeader() {
//   const header = document.createElement("div");
//   Object.assign(header.style, {
//     display: "flex",
//     justifyContent: "space-between",
//     padding: "4px",
//     cursor: "move", // Show move cursor
//   });

//   // Region Selector
//   const regionSelect = document.createElement("select");
//   ["EU1", "US1"].forEach((region) => {
//     const opt = document.createElement("option");
//     opt.value = region;
//     opt.textContent = region;
//     regionSelect.appendChild(opt);
//   });
//   header.appendChild(regionSelect);

//   const controls = document.createElement("div");
//   // Settings Gear
//   const settingsBtn = document.createElement("button");
//   settingsBtn.textContent = "⚙️";
//   settingsBtn.style.background = "none";
//   settingsBtn.style.border = "none";
//   settingsBtn.style.color = "white";
//   header.appendChild(settingsBtn);

//   const closeBtn = document.createElement("button");
//   closeBtn.innerHTML = "&times;";
//   Object.assign(closeBtn.style, {
//     background: "none",
//     border: "none",
//     color: "#fff",
//     cursor: "pointer",
//     fontSize: "24px",
//     lineHeight: "16px",
//     padding: "0",
//   });
//   closeBtn.addEventListener("click", () => {
//     document.querySelector(".bloomModalContainer")?.remove();
//   });
//   controls.appendChild(closeBtn);

//   header.appendChild(controls);

//   return header;
// }

// function addBuySection(parent) {
//   const buySection = document.createElement("div");
//   buySection.innerHTML = `<div style="color: #00ffc1; margin-bottom: 8px;">Quick Buy</div>`;

//   const buttons = [0.5, 1, 2, 5, 10].map((amt) => {
//     const btn = document.createElement("button");
//     btn.textContent = amt;
//     Object.assign(btn.style, {
//       margin: "4px",
//       background: "transparent",
//       border: "1px solid #00ffc1",
//       color: "#00ffc1",
//       borderRadius: "4px",
//       padding: "6px 12px",
//       cursor: "pointer",
//     });
//     return btn;
//   });

//   buttons.forEach((btn) => {
//     btn.classList.add("bloom-buy-btn"); // Add this line
//     buySection.appendChild(btn);
//   });

//   parent.appendChild(buySection);
// }

// // DRAG FUNCTIONALITY
// function initializePanelDrag(panel) {
//   let isDragging = false;
//   let currentX = 0;
//   let currentY = 0;
//   let offsetX = 0;
//   let offsetY = 0;

//   // Load saved position from localStorage
//   const savedPosition = JSON.parse(
//     localStorage.getItem("bloom.position") || '{"x":0,"y":0}'
//   );
//   currentX = savedPosition.x;
//   currentY = savedPosition.y;

//   // Apply initial position
//   panel.style.transform = `translate(${currentX}px, ${currentY}px)`;
//   panel.style.willChange = "transform"; // Optimize for transform animations

//   const header = panel.querySelector("div:first-child");

//   const handleMouseDown = (e) => {
//     isDragging = true;
//     const rect = panel.getBoundingClientRect();

//     // Calculate offset based on current position
//     offsetX = e.clientX - currentX;
//     offsetY = e.clientY - currentY;

//     panel.style.cursor = "grabbing";
//     panel.style.userSelect = "none"; // Prevent text selection during drag
//   };

//   const handleMouseMove = (e) => {
//     if (!isDragging) return;

//     // Update position values
//     currentX = e.clientX - offsetX;
//     currentY = e.clientY - offsetY;

//     // Use requestAnimationFrame for smooth updates
//     requestAnimationFrame(() => {
//       panel.style.transform = `translate(${currentX}px, ${currentY}px)`;
//     });
//   };

//   const handleMouseUp = () => {
//     if (!isDragging) return;

//     isDragging = false;
//     panel.style.cursor = "grab";
//     panel.style.userSelect = "";

//     // Save final position
//     localStorage.setItem(
//       "bloom.position",
//       JSON.stringify({ x: currentX, y: currentY })
//     );
//   };

//   // Add event listeners
//   header.addEventListener("mousedown", handleMouseDown);
//   document.addEventListener("mousemove", handleMouseMove);
//   document.addEventListener("mouseup", handleMouseUp);

//   // Cleanup function (optional)
//   return () => {
//     header.removeEventListener("mousedown", handleMouseDown);
//     document.removeEventListener("mousemove", handleMouseMove);
//     document.removeEventListener("mouseup", handleMouseUp);
//   };
// }

if (window.location.href.includes("en/lp")) {
  console.log("URL contains 'en/lp'");

  function initModal() {
    console.log("inside initModal");
    if (document.querySelector(".bloomModalContainer")) return;
    addBloomQuickPanel();
  }

  // Try injecting when DOM is ready
  if (document.readyState === "complete") {
    initModal();
  } else {
    window.addEventListener("load", initModal);
    document.addEventListener("DOMContentLoaded", initModal);
  }

  // MutationObserver to maintain modal presence
  const observer = new MutationObserver(() => {
    if (!document.querySelector(".bloomModalContainer")) {
      initModal();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// MODAL CREATION
function addBloomQuickPanel() {
  console.log("inside addBloomQuickPanel");
  if (document.querySelector(".bloomModalContainer")) return;

  const container = document.createElement("div");
  container.classList.add("bloomModalContainer");
  styleContainer(container);

  // Header with region selector
  const header = createHeader();
  container.appendChild(header);

  // Body with Buy/Sell sections
  const bodyWrapper = document.createElement("div");
  addBuySection(bodyWrapper);
  addSellSection(bodyWrapper);
  container.appendChild(bodyWrapper);

  document.body.appendChild(container);

  // Position initialization
  initializePanelPosition(container);
  initializePanelDrag(container);
  initializeKeyboardShortcuts();
}

// POSITION MANAGEMENT
function initializePanelPosition(container) {
  const savedPos = localStorage.getItem("bloom.position");
  if (savedPos) {
    const { x, y } = JSON.parse(savedPos);
    container.style.transform = `translate(${x}px, ${y}px)`;
  }
}

// DRAG FUNCTIONALITY (improved)
function initializePanelDrag(panel) {
  let isDragging = false;
  let startX = 0,
    startY = 0,
    translateX = 0,
    translateY = 0;

  const savePosition = () => {
    localStorage.setItem(
      "bloom.position",
      JSON.stringify({
        x: translateX,
        y: translateY,
      })
    );
  };

  const handleMouseDown = (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    panel.style.cursor = "grabbing";
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    translateX += dx;
    translateY += dy;
    startX = e.clientX;
    startY = e.clientY;

    panel.style.transform = `translate(${translateX}px, ${translateY}px)`;
  };

  const handleMouseUp = () => {
    isDragging = false;
    panel.style.cursor = "grab";
    savePosition();
  };

  panel
    .querySelector(".bloom-header")
    .addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

// KEYBOARD SHORTCUTS (error-safe)
function initializeKeyboardShortcuts() {
  if (window.bloomKeyboardHandlerAdded) return;

  const handleKeydown = (e) => {
    const modal = document.querySelector(".bloomModalContainer");
    if (!modal || e.target.tagName === "INPUT") return;

    const key = e.key.toLowerCase();
    const buyKeys = ["q", "w", "e", "r"];
    const sellKeys = ["a", "s", "d", "f"];

    try {
      if (buyKeys.includes(key)) {
        const index = buyKeys.indexOf(key);
        const btn = modal.querySelectorAll(".bloom-buy-btn")[index];
        if (btn) {
          console.log("buyKeys before");
          btn.click();
          console.log("buyKeys after");
        }
      }

      if (sellKeys.includes(key)) {
        const index = sellKeys.indexOf(key);
        const btn = modal.querySelectorAll(".bloom-sell-btn")[index];
        if (btn) {
          console.log("buyKeys before");
          btn.click();
          console.log("buyKeys after");
        }
      }
    } catch (error) {
      console.error("Bloom panel shortcut error:", error);
    }
  };

  document.addEventListener("keydown", handleKeydown);
  window.bloomKeyboardHandlerAdded = true;
}

// UI COMPONENTS
function createHeader() {
  const header = document.createElement("div");
  header.className = "bloom-header";
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #2a2e50;
    border-radius: 8px 8px 0 0;
    cursor: move;
  `;

  // Region Selector
  const regionSelect = document.createElement("select");
  regionSelect.innerHTML = `<option>EU1</option><option>US1</option>`;
  header.appendChild(regionSelect);

  // Close Button
  const closeBtn = document.createElement("div");
  closeBtn.innerHTML = "×";
  closeBtn.style.cssText = `
    cursor: pointer;
    font-size: 24px;
    padding: 0 8px;
    transition: opacity 0.2s;
  `;
  closeBtn.addEventListener("click", () => {
    document.querySelector(".bloomModalContainer")?.remove();
  });
  header.appendChild(closeBtn);

  return header;
}

function addBuySection(parent) {
  const section = document.createElement("div");
  section.innerHTML = `<div class="section-title">Quick Buy</div>`;
  [0.5, 1, 2, 5, 10].forEach((amt) => {
    const btn = createButton(amt.toString(), "buy");
    section.appendChild(btn);
  });
  parent.appendChild(section);
}

function addSellSection(parent) {
  const section = document.createElement("div");
  section.innerHTML = `<div class="section-title">Quick Sell</div>`;
  ["25%", "50%", "75%", "100%"].forEach((text) => {
    const btn = createButton(text, "sell");
    section.appendChild(btn);
  });
  parent.appendChild(section);
}

function createButton(text, type) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.className = `bloom-${type}-btn`;
  btn.style.cssText = `
    margin: 4px;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: ${type === "buy" ? "#00ffc122" : "#ff3b3b22"};
    color: ${type === "buy" ? "#00ffc1" : "#ff3b3b"};
    cursor: pointer;
    transition: all 0.2s;
  `;

  btn.addEventListener("mouseenter", () => {
    btn.style.background = type === "buy" ? "#00ffc144" : "#ff3b3b44";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = type === "buy" ? "#00ffc122" : "#ff3b3b22";
  });

  return btn;
}

// STYLING
function styleContainer(el) {
  el.style.cssText = `
    position: fixed;
    top: 100px;
    left: 100px;
    width: 300px;
    background: #1a1d38;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    z-index: 99999;
    transform: translate(0,0);
    transition: transform 0.15s ease-out;
    font-family: -apple-system, sans-serif;
  `;
}
