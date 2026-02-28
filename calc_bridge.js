const { calculate, Pokemon, Move } = require('@smogon/calc');
const { Generations } = require('@pkmn/data');
const { Dex } = require('@pkmn/dex');

try {
    // Correct way to initialize Gen 9 data in latest @pkmn/data
    const gens = new Generations(Dex);
    const gen = gens.get(9);
    
    // Formatting names for the library (lowercase, hyphenated)
    const attackerName = process.argv[2].replace(/\s+/g, '-').toLowerCase();
    const defenderName = process.argv[3].replace(/\s+/g, '-').toLowerCase();
    const spaEvs = parseInt(process.argv[4]) || 0;
    const moveName = process.argv[5].replace(/\s+/g, '-').toLowerCase();

    const attacker = new Pokemon(gen, attackerName, { evs: { spa: spaEvs } });
    const defender = new Pokemon(gen, defenderName);
    const move = new Move(gen, moveName);

    const result = calculate(gen, attacker, defender, move);
    
    // Use process.stdout.write to avoid extra newlines from console.log
    process.stdout.write(JSON.stringify({
        range: result.range(),
        desc: result.desc(),
        ohko: result.range()[0] >= 100
    }));
} catch (e) {
    // Log the actual error message for debugging
    console.error("JS_ERROR: " + e.message);
    process.exit(1);
}