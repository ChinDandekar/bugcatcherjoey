const { calculate, Pokemon, Move } = require('@smogon/calc');
const { Generations } = require('@pkmn/data');
const { Dex } = require('@pkmn/dex');

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", chunk => {
      data += chunk;
    });

    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });

    process.stdin.on("error", reject);
  });
}

function normalizeName(name) {
  return name.replace(/\s+/g, '-').toLowerCase();
}

(async () => {
  try {
    const input = await readStdin();

    const attackerInput = input.attacker;
    const defenderInput = input.defender;

    if (!attackerInput || !defenderInput) {
      throw new Error("Missing attacker or defender in input JSON");
    }

    // Initialize generation
    const gens = new Generations(Dex);
    const genNumber =
      typeof attackerInput.gen === "object"
        ? attackerInput.gen.num
        : attackerInput.gen;

    const gen = gens.get(genNumber || 9);

    // Normalize names
    const attackerName = normalizeName(attackerInput.name);
    const defenderName = normalizeName(defenderInput.name);

    // Extract options safely
    const attackerOptions = attackerInput.options || {};
    const defenderOptions = defenderInput.options || {};

    // Build attacker
    const attacker = new Pokemon(gen, attackerName, {
      level: attackerOptions.level,
      ability: attackerOptions.ability,
      item: attackerOptions.item,
      nature: attackerOptions.nature,
      evs: attackerOptions.evs,
      ivs: attackerOptions.ivs,
      boosts: attackerOptions.boosts,
      curHP: attackerOptions.curHP,
    });

    // Build defender
    const defender = new Pokemon(gen, defenderName, {
      level: defenderOptions.level,
      ability: defenderOptions.ability,
      item: defenderOptions.item,
      nature: defenderOptions.nature,
      evs: defenderOptions.evs,
      ivs: defenderOptions.ivs,
      boosts: defenderOptions.boosts,
      curHP: defenderOptions.curHP,
    });

    // Extract move (first move if exists)
    const moveNameRaw = attackerOptions.moves?.[0];
    if (!moveNameRaw) {
      throw new Error("Attacker has no move specified");
    }

    const move = new Move(gen, normalizeName(moveNameRaw));

    // Run calculation
    const result = calculate(gen, attacker, defender, move);

    process.stdout.write(
      JSON.stringify({
        range: result.range(),
        desc: result.desc(),
        ohko: result.range()[0] >= 100
      })
    );

  } catch (e) {
    console.error("JS_ERROR: " + e.message);
    process.exit(1);
  }
})();