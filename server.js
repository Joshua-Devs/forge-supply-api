const express = require('express');
const { Connection, PublicKey } = require('@solana/web3.js');
const { getMint, getAccount } = require('@solana/spl-token');
const app = express();

// Use the PORT environment variable provided by Render or default to 3000
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

// Connect to Solana mainnet
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Define the mint address and mint authority
const mintAddress = new PublicKey('2FKq2Bp8u1LbXqk74nSRWV87MXvELTgAHeRHXxHV94hk');
const mintAuthority = new PublicKey('J6kZJ7pM4tavNJdbv8fyv5VAiRUt4iWiFKBZgMDzhzsR');

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Forge Supply API. Visit /forge/supply to get token supply data.');
});

// Define the /forge/supply route
app.get('/forge/supply', async (req, res) => {
  try {
    // Fetch mint information
    const mintInfo = await getMint(connection, mintAddress);
    const totalSupply = mintInfo.supply;
    const decimals = mintInfo.decimals;

    // Fetch the token accounts associated with the mint authority
    const tokenAccounts = await connection.getTokenAccountsByOwner(mintAuthority, {
      mint: mintAddress,
    });

    let lockedSupply = 0n;

    // Sum the balances of all token accounts owned by the mint authority
    for (const { pubkey } of tokenAccounts.value) {
      const accountInfo = await getAccount(connection, pubkey);
      lockedSupply += accountInfo.amount;
    }

    // Calculate circulating supply
    const circulatingSupply = totalSupply - lockedSupply;

    // Convert BigInt to string and format with decimals
    const divisor = BigInt(10) ** BigInt(decimals);

    function formatSupply(amount) {
      const whole = amount / divisor;
      const fraction = amount % divisor;
      return `${whole.toString()}.${fraction.toString().padStart(decimals, '0')}`;
    }

    res.json({
      totalSupply: formatSupply(totalSupply),
      circulatingSupply: formatSupply(circulatingSupply),
    });
  } catch (error) {
    console.error('Error fetching supply information:', error);
    res.status(500).json({ error: 'Error fetching supply information.' });
  }
});

// Start the server
app.listen(port, host, () => {
  console.log(`API running at http://${host}:${port}`);
});
