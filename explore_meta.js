/**
 * POKEMON META SCANNER - HACKILLINOIS 2026
 * * HOW TO RUN:
 * 1. Ensure Node.js is installed (node -v)
 * 2. In your terminal, run:
 * npm install axios
 * 3. Run the script:
 * node explore_meta.js
 * * USAGE:
 * Enter any generation and tier when prompted (e.g., "gen 9 ou doubles", "gen 7 ou").
 * Type "exit" to quit the program.
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function parseFormat(input) {
  const clean = input.toLowerCase();
  const genMatch = clean.match(/\d+/);
  const gen = genMatch ? `gen${genMatch[0]}` : 'gen9';
  const tiers = ['ou', 'uu', 'ru', 'nu', 'pu', 'uber', 'lc', 'vgc'];
  let tier = tiers.find(t => clean.includes(t)) || 'ou';
  const isDoubles = clean.includes('doubles');
  
  return {
    stats: isDoubles ? `${gen}doublesou` : `${gen}${tier}`,
    sets: isDoubles ? `${gen}doubles${tier}` : `${gen}${tier}`
  };
}

async function getMeta(userInput) {
  const formats = parseFormat(userInput);
  const months = ['2026-01', '2025-12', '2025-11'];
  const weights = ['1695', '1500', '0'];

  let stats = null;
  console.log(`\nScanning Smogon archives for ${formats.stats}...`);

  findStats: for (const month of months) {
    for (const weight of weights) {
      const url = `https://www.smogon.com/stats/${month}/chaos/${formats.stats}-${weight}.json`;
      try {
        const res = await axios.get(url, { timeout: 2000 });
        if (res.data && res.data.info) {
          stats = res.data;
          console.log(`Found data in ${month} (Rating ${weight})`);
          break findStats;
        }
      } catch (e) { continue; }
    }
  }

  if (!stats) {
    console.log(`Error: No data found for ${formats.stats}.`);
    return ask();
  }

  try {
    const setsUrl = `https://pkmn.github.io/smogon/data/sets/${formats.sets}.json`;
    const setsRes = await axios.get(setsUrl);
    const setsData = setsRes.data;

    const top10 = Object.entries(stats.data)
      .map(([name, data]) => ({
        name,
        count: data.raw_count || 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log(`\nTOP 10 THREATS:`);
    top10.forEach((mon, i) => {
      const buildInfo = setsData[mon.name];
      const setNames = buildInfo ? Object.keys(buildInfo) : ["Standard Set"];
      // Clean name output without usage stats
      console.log(`${i + 1}. ${mon.name}`);
      setNames.forEach(s => console.log(`   - [Set]: ${s}`));
    });

  } catch (error) {
    console.log(`Note: Stats loaded, but build sets for ${formats.sets} were missing.`);
  }
  ask();
}

function ask() {
  rl.question('\nEnter format: ', (ans) => {
    if (ans.toLowerCase() === 'exit') return rl.close();
    getMeta(ans);
  });
}

console.log("Smogon Meta Scanner (Clean Rank Mode)");
ask();