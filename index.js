const SOLANA_ADDRESS_REGEX = /CA:\s*([A-Za-z0-9]{10,})/i;
let chintaddress = "CA: 7DdHyxLZQuudndfrX3ZDDqgK6zPFbm17wGwKJqgjpump";
let mintAddress = "";
const solanaMatch = chintaddress.match(SOLANA_ADDRESS_REGEX); // Use corrected regex without 'g' flag
if (solanaMatch) {
  mintAddress = solanaMatch[1].trim();
  console.log(mintAddress); // Correctly captures the address
}
