const { calculate, Pokemon, Move } = require('@smogon/calc');
const { Generations } = require('@pkmn/data');
const { Dex } = require('@pkmn/dex');

try {
    const gens = new Generations(Dex);
    const gen = gens.get(9);

    // Normalization to handle AI typos (e.g. "Hidden-Power-Fire" -> "Hidden Power")
    const toID = (str) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : "";

    // 1. Parse JSON Attacker Object
    const attackerData = JSON.parse(process.argv[2]);
    const defenderName = process.argv[3];

    const itemName = attackerData.item || "None";
    const attackerSpecies = Dex.species.get(attackerData.name);
    const defenderSpecies = Dex.species.get(defenderName);

    if (!attackerSpecies.exists || !defenderSpecies.exists) {
        process.stdout.write(JSON.stringify({
            range: [0, 0], ohko: false, desc: "Invalid Pokemon"
        }));
        process.exit(0);
    }

    const defaultEvs = attackerSpecies.baseStats.atk >= attackerSpecies.baseStats.spa ? { atk: 252, spe: 252 } : { spa: 252, spe: 252 };
    const evs = attackerData.new_evs || defaultEvs;

    const attacker = new Pokemon(gen, attackerSpecies.name, {
        evs: evs,
        item: (itemName !== "None" && itemName !== "null") ? itemName : undefined,
        nature: attackerData.new_nature && attackerData.new_nature !== '-' ? attackerData.new_nature : 'Hardy',
        ability: attackerData.new_ability || attackerSpecies.abilities[0]
    });
    const defender = new Pokemon(gen, defenderSpecies.name);

    let movesList = attackerData.moves;
    if (!movesList || !Array.isArray(movesList)) {
        movesList = [attackerData.move || "Splash"];
    }

    let bestMinRoll = -1;
    let bestResultObj = { range: [0, 0], ohko: false, desc: "No valid moves" };

    for (let currentMoveStr of movesList) {
        if (!currentMoveStr || currentMoveStr === "-" || currentMoveStr === "None") continue;

        let moveData = Dex.moves.get(currentMoveStr);
        if (!moveData.exists && currentMoveStr.includes('Hidden')) {
            moveData = Dex.moves.get('Hidden Power');
        }
        if (!moveData.exists) {
            moveData = Dex.moves.get(toID(currentMoveStr));
        }

        if (!moveData.exists) continue;

        const isImmune = defenderSpecies.types.some(t =>
            Dex.types.get(t).damageTaken[moveData.type] === 3
        );

        if (isImmune) {
            if (bestMinRoll < 0) {
                bestResultObj = { range: [0, 0], ohko: false, desc: "0% (Immune Matchup)" };
            }
            continue;
        }

        const move = new Move(gen, moveData.name);
        try {
            const result = calculate(gen, attacker, defender, move);
            const minRoll = result.range()[0];

            // Speed & Priority checks
            const movePriority = move.priority || 0;
            // Smogon calc computes final modified stats including natures/items/evs 
            // Accessible via attacker.rawStats.spe (or sometimes result.attacker.stats.spe depending on calc version)
            const attackerSpeed = attacker.stats.spe;
            const defenderSpeed = defender.stats.spe;

            // An OHKO requires dealing mortal damage AND moving first (priority advantage or speed tie/win)
            const dealsOhkoDamage = (result.kochance && result.kochance().n === 1) || minRoll >= defender.maxHP();
            const movesFirst = movePriority > 0 || (movePriority === 0 && attackerSpeed >= defenderSpeed);

            const isOhko = dealsOhkoDamage && movesFirst;

            // Generate contextual description including speed dynamics if failed
            let formattedDesc = result.desc();
            if (dealsOhkoDamage && !movesFirst) {
                formattedDesc += " (Outsped & KO'd first)";
            }

            if (minRoll > bestMinRoll || (isOhko && !bestResultObj.ohko)) {
                bestMinRoll = minRoll;
                bestResultObj = {
                    range: result.range(),
                    desc: formattedDesc,
                    ohko: isOhko
                };
            }
        } catch (calcErr) {
            // ignore failing moves
        }
    }

    process.stdout.write(JSON.stringify(bestResultObj));

} catch (e) {
    // Final safety fallback
    process.stdout.write(JSON.stringify({
        range: [0, 0], ohko: false, desc: "Calculation Error"
    }));
    process.exit(0);
}