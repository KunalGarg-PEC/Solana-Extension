chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "fetchMintInfo") {
    fetch(
      `https://www.mightx.io/api/mint-info?mint-address=${request.mintAddress}`
    )
      .then((response) => {
        if (!response.ok) throw new Error("API response not OK");
        return response.json();
      })
      .then((data) => sendResponse({ data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Keep message channel open
  }
});
