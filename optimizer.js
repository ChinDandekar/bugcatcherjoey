// optimizer.js

import {
    Move, PokemonOptions, Pokemon, StatsTable, CalcResult,
    CounterOption, Threat, ThreatItem, CounterType
} from './pokemon_classes.js';
import { calculate, Pokemon as SmogonPokemon, Move as SmogonMove } from '@smogon/calc';
import { Generations } from '@pkmn/data';
import { Dex } from '@pkmn/dex';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

// Initialize the Generations object once globally to avoid overhead in every calculation
const gens = new Generations(Dex);
const gen9 = gens.get(9);

// Helper to normalize Pokemon and Move names for the calculator
function normalizeName(name) {
    return name.replace(/\s+/g, '-').toLowerCase();
}

// Helper to determine the offensive and defensive stats used by the move
function getMoveStatInteraction(move) {
    if (move.category === 'Status') {
        return null;
    }

    const offensiveStat = move.overrideOffensiveStat ?? (move.category === 'Physical' ? 'atk' : 'spa');
    const defensiveStat = move.overrideDefensiveStat ?? (move.category === 'Physical' ? 'def' : 'spd');

    return { offensiveStat, defensiveStat };
}

// Constants
const TOP_N_THREATS = 50;
const MIN_POKEMON_USAGE_PCT = 0.001;
const MIN_BUILD_USAGE_PCT = 0.01;
const MIN_MOVES_PCT = 0.1;
const MIN_ITEM_PCT = 0.1;
const MIN_SPREAD_PCT = 0.1;
const MIN_COUNTER_COVERAGE = 0.66;
const MAX_EVS = 508;
const MAX_STAT_EVS = 252;
const EV_STEP = 4;
const CALC_BRIDGE = "calc_bridge.js";
const STAT_MONTHS = ["2026-01", "2025-12", "2025-11", "2025-10"];
const STAT_RATINGS = ["1695", "1500", "0"];
const LEVEL = 50;
const EV_MIN = 0;
const EV_MAX = 252;
const MAX_TOTAL_EVS = 510;

const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
const NATURE_SPE_MOD = {
    "Timid": 1.1, "Jolly": 1.1, "Hasty": 1.1, "Naive": 1.1,
    "Brave": 0.9, "Quiet": 0.9, "Relaxed": 0.9, "Sassy": 0.9,
};

const ITEM_SPE_MOD = {
    "choicescarf": 1.5,
    "ironball": 0.5,
    "machobrace": 0.5,
};

function makeStats(kwargs) {
    return new StatsTable({
        hp: kwargs.hp || 0,
        atk: kwargs.atk || 0,
        def: kwargs.def || 0,
        spa: kwargs.spa || 0,
        spd: kwargs.spd || 0,
        spe: kwargs.spe || 0,
    });
}

function needsSpeed(counterType) {
    return [CounterType.OUTSPEED_3HKO, CounterType.OUTSPEED_OHKO, CounterType.OUTSPEED_2HKO].includes(counterType);
}

function statsFromDict(d) {
    return makeStats({
        hp: d.hp || 0,
        atk: d.atk || 0,
        def: d.def || d.def || 0,
        spa: d.spa || 0,
        spd: d.spd || 0,
        spe: d.spe || 0,
    });
}

// ---------------------------------------------------------------------------
// Smogon data fetching
// ---------------------------------------------------------------------------

function parseFormat(fmt) {
    const clean = fmt.toLowerCase().replace(/\s+/g, '');
    const m = clean.match(/gen(\d)/);
    const genNum = m ? parseInt(m[1], 10) : 9;
    return [clean, genNum];
}

async function pickBestMove(moves, attacker, defender) {
    let bestMove = new Move("Tackle", "atk", "def");
    let bestRes = null, bestMax = -1.0, bestMin = -1.0;

    for (const move of moves) {
        const res = await runCalc(attacker, defender, move);
        if (!res) continue;

        if (res.max_damage > bestMax) {
            bestMax = res.max_damage;
            bestMin = res.min_damage;
            bestRes = res;
            bestMove = new Move(move, res.offensive_stat, res.defensive_stat);
        } else if (res.max_damage === bestMax && res.min_damage > bestMin) {
            bestMax = res.max_damage;
            bestMin = res.min_damage;
            bestRes = res;
            bestMove = new Move(move, res.offensive_stat, res.defensive_stat);
        }
    }
    return [bestMove, bestRes];
}

async function runCalc(attackerInput, defenderInput, moveInput) {
    let smogonMove, attacker, defender; // Scope these for the catch block
    try {
        const moveNameRaw = moveInput instanceof Move ? moveInput.name : moveInput;
        const genNumber = typeof attackerInput.gen === "object" ? attackerInput.gen.num : attackerInput.gen;
        const gen = gens.get(genNumber || 9);

        smogonMove = new SmogonMove(gen, normalizeName(moveNameRaw));
        if (smogonMove.category === 'Status') return null;

        const attackerOptions = attackerInput.options || {};
        const defenderOptions = defenderInput.options || {};

        attacker = new SmogonPokemon(gen, normalizeName(attackerInput.name), {
            level: attackerOptions.level,
            item: attackerOptions.item,
            nature: attackerOptions.nature,
            evs: attackerOptions.evs,
            ivs: attackerOptions.ivs,
        });

        defender = new SmogonPokemon(gen, normalizeName(defenderInput.name), {
            level: defenderOptions.level,
            item: defenderOptions.item,
            nature: defenderOptions.nature,
            evs: defenderOptions.evs,
            ivs: defenderOptions.ivs,
        });

        const result = calculate(gen, attacker, defender, smogonMove);

        // --- CRITICAL FIX START ---
        // Validate damage BEFORE calling any result methods
        if (!result.damage || (Array.isArray(result.damage) && result.damage[result.damage.length - 1] === 0)) {
            return new CalcResult("No damage dealt", 0, 0, 100, "atk", "def");
        }
        // --- CRITICAL FIX END ---

        let moveInfo = getMoveStatInteraction(smogonMove);



        const range = result.range();
        return new CalcResult(
            result.desc(),
            range[0],
            range[1],
            result.kochance().n,
            moveInfo.offensiveStat, moveInfo.defensiveStat // Simplification for debug
        );

    } catch (e) {
        // DETAILED DEBUG LOGGING
        console.error(`\n--- CALC CRASH REPORT ---`);
        console.error(`Move: ${moveInput?.name || moveInput}`);
        console.error(`Attacker: ${attackerInput.name} (EVs: ${JSON.stringify(attackerInput.options.evs)})`);
        console.error(`Defender: ${defenderInput.name} (Item: ${defenderInput.options.item})`);
        console.error(`Error: ${e.message}`);
        console.error(`-------------------------\n`);
        return null;
    }
}

async function fetchChaosJson(formatId) {
    for (const month of STAT_MONTHS) {
        for (const rating of STAT_RATINGS) {
            const url = `https://www.smogon.com/stats/${month}/chaos/${formatId}-${rating}.json`;
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                const r = await fetch(url, { signal: controller.signal });
                clearTimeout(timeout);

                if (r.ok) {
                    const data = await r.json();
                    if (data.info) {
                        // console.log (`  [meta] ${month} rating=${rating}`);
                        return data;
                    }
                }
            } catch (e) {
                // console.log(`could not fetch for ${month}, ${formatId}, ${rating}, error: ${e.message}`);
            }
        }
    }
    return null;
}

function parseSpreadStr(spreadStr) {
    try {
        const [nature, evPart] = spreadStr.split(":");
        const vals = evPart.split("/").map(Number);
        const keys = ["hp", "atk", "def", "spa", "spd", "spe"];
        const evDict = {};
        keys.forEach((key, i) => evDict[key] = vals[i]);
        return [nature.trim(), evDict];
    } catch (e) {
        const emptyEvs = Object.fromEntries(STAT_KEYS.map(k => [k, 0]));
        return ["Hardy", emptyEvs];
    }
}

function createMostCommonThreatItems(obj, cutoffPct) {
    let sumUsage = 0;
    const entries = Object.entries(obj);
    for (const [_, usage] of entries) {
        sumUsage += usage;
    }

    const threatItemsArr = entries
        .map(([item, usage]) => new ThreatItem(item, usage / sumUsage))
        .sort((a, b) => b.usage_pct - a.usage_pct);

    if (threatItemsArr.length === 0) return [];

    const maxUsage = threatItemsArr[0].usage_pct;
    let idx = threatItemsArr.length;
    for (let i = 0; i < threatItemsArr.length; i++) {
        if (threatItemsArr[i].usage_pct / maxUsage < cutoffPct) {
            idx = i;
            break;
        }
    }
    return threatItemsArr.slice(0, idx);
}

function buildThreatPokemon(threatName, gen, item, moves, spread) {
    const [tNature, tEvs] = parseSpreadStr(spread);
    return new Pokemon(gen, threatName, new PokemonOptions({
        nature: tNature,
        level: LEVEL,
        item: item,
        moves: moves.map(m => m.value),
        evs: statsFromDict(tEvs),
        ivs: makeStats({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }),
    }));
}

function buildOurPokemon(name, gen, nature, evDict, moves) {
    return new Pokemon(gen, name, new PokemonOptions({
        nature: nature,
        level: LEVEL,
        moves: moves,
        evs: statsFromDict(evDict),
        ivs: makeStats({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }),
    }));
}

function createThreatBuilds(threat, gen) {
    const threatBuilds = [];
    for (const item of threat.items) {
        for (const spread of threat.spreads) {
            if (item.usage_pct * spread.usage_pct > MIN_BUILD_USAGE_PCT) {
                threatBuilds.push([
                    buildThreatPokemon(threat.name, gen, item.value, threat.best_moves, spread.value),
                    item.usage_pct * spread.usage_pct * threat.usage_pct
                ]);
            }
        }
    }
    return threatBuilds;
}

function canEverOutspeed(me, threat) {
    const myBase = calcSpeed(me);
    const threatBase = calcSpeed(threat);
    // Level 50 approx max vs min
    const myMax = Math.floor((myBase * 2 + 31 + 63) * 0.5) + 5;
    const threatMin = Math.floor((threatBase * 2 + 31) * 0.5) + 5;
    return myMax >= threatMin;
}

async function canCounter(ourPokemon, threatBuild, offensiveRes, defensiveRes, offensiveMove, defensiveMove, usagePct) {
    const doesOutspeed = await outspeeds(ourPokemon, threatBuild);



    if (doesOutspeed) {
        if (offensiveRes.num_hits_to_ko === 1) return new CounterOption(threatBuild, true, usagePct, CounterType.OUTSPEED_OHKO, offensiveMove, defensiveMove);
        if (offensiveRes.num_hits_to_ko === 2 && defensiveRes.num_hits_to_ko > 2) return new CounterOption(threatBuild, true, usagePct, CounterType.OUTSPEED_2HKO, offensiveMove, defensiveMove);
        if (offensiveRes.num_hits_to_ko === 3 && defensiveRes.num_hits_to_ko > 3) return new CounterOption(threatBuild, true, usagePct, CounterType.OUTSPEED_3HKO, offensiveMove, defensiveMove);
    } else {
        if (offensiveRes.num_hits_to_ko === 1 && defensiveRes.num_hits_to_ko > 2) return new CounterOption(threatBuild, false, usagePct, CounterType.NO_OUTSPEED_OHKO, offensiveMove, defensiveMove);
        if (offensiveRes.num_hits_to_ko === 2 && defensiveRes.num_hits_to_ko > 3) return new CounterOption(threatBuild, false, usagePct, CounterType.NO_OUTSPEED_2HKO, offensiveMove, defensiveMove);
        if (offensiveRes.num_hits_to_ko === 3 && defensiveRes.num_hits_to_ko > 4) return new CounterOption(threatBuild, false, usagePct, CounterType.NO_OUTSPEED_3HKO, offensiveMove, defensiveMove);
        if (offensiveRes.num_hits_to_ko === 4 && defensiveRes.num_hits_to_ko > 5) return new CounterOption(threatBuild, false, usagePct, CounterType.NO_OUTSPEED_4HKO, offensiveMove, defensiveMove);
    }
    return null;
}

async function buildCounterList(ourPokemon, threatBuilds, threatUsagePct, moves) {
    const candidates = [];
    // console.log(`    checking if ${ourPokemon.name} can counter ${threatBuilds[0][0].name}, checking ${threatBuilds.length} builds...`);

    let totalUsagePctConsidered = 0;
    let counterCoverage = 0;
    let offensiveMove = null;
    let defensiveMove = null;
    let tempAttacker = new Pokemon(ourPokemon.gen.num, ourPokemon.name, ourPokemon.options);

    for (const [threatBuild, usagePct] of threatBuilds) {
        totalUsagePctConsidered += usagePct;
        let offensiveRes = null;
        let defensiveRes = null;

        if (!offensiveMove && !defensiveMove) {
            [offensiveMove, offensiveRes] = await pickBestMove(moves, ourPokemon, threatBuild);
            [defensiveMove, defensiveRes] = await pickBestMove(threatBuild.options.moves, threatBuild, ourPokemon);
        } else {
            offensiveRes = await runCalc(tempAttacker, threatBuild, offensiveMove);
            defensiveRes = await runCalc(threatBuild, tempAttacker, defensiveMove);
        }

        if (!offensiveRes || !defensiveRes) continue;

        const counterOption = await canCounter(ourPokemon, threatBuild, offensiveRes, defensiveRes, offensiveMove, defensiveMove, usagePct * threatUsagePct);

        if (counterOption) {
            candidates.push(counterOption);
            counterCoverage += usagePct;
        }
    }

    if (totalUsagePctConsidered > 0 && (counterCoverage / totalUsagePctConsidered > MIN_COUNTER_COVERAGE)) {
        // console.log(`${ourPokemon.name} can counter ${threatBuilds[0][0].name}. Counter coverage: ${counterCoverage}`);
        return candidates;
    }
    return [];
}

function getTopThreats(chaosData) {
    const totalBattles = chaosData.info["number of battles"] || 1;
    const entries = [];

    for (const [name, data] of Object.entries(chaosData.data)) {
        const raw = data["Raw count"] || 0;
        const usage = raw / Math.max(totalBattles, 1);

        if (usage < MIN_POKEMON_USAGE_PCT) continue;

        const bestMoves = createMostCommonThreatItems(data.Moves || {}, MIN_MOVES_PCT);
        const bestItems = createMostCommonThreatItems(data.Items || {}, MIN_ITEM_PCT);
        const bestSpreads = createMostCommonThreatItems(data.Spreads || {}, MIN_SPREAD_PCT);

        entries.push(new Threat(name, usage, bestMoves, bestItems, bestSpreads));
    }

    entries.sort((a, b) => b.usage_pct - a.usage_pct);
    return entries.slice(0, TOP_N_THREATS);
}

async function processThreat(threat, genNum, ourPokemon, moves) {
    // console.log(`\n  → ${threat.name} (${(threat.usage_pct * 100).toFixed(1)}% usage)`);
    const threatBuilds = createThreatBuilds(threat, genNum);
    if (threatBuilds.length === 0) return [];

    return await buildCounterList(ourPokemon, threatBuilds, threat.usage_pct, moves);
}

async function minimizeEvs(ourPokemon, counterOption, evCredit) {
    const baseline = counterOption.counter_type;
    const evs = ourPokemon.options.evs;

    // 1. If we already meet the requirement with current EVs, stop immediately
    const currentRes = await getCounterType(ourPokemon, counterOption.threat_pokemon, counterOption.offensive_move, counterOption.defensive_move, counterOption.usage_pct);
    if (currentRes !== null && currentRes >= baseline) return true;

    // 2. Prioritize stats based on the threat (Speed -> Bulk -> Offense, etc.)
    let statsToOptimize = rankStats(ourPokemon, counterOption, baseline);

    // 3. Optimize each stat, reducing the available credit as we go
    for (const stat of statsToOptimize) {
        if (evCredit <= 0) break;

        const originalVal = evs[stat] || 0;

        // binarySearchStat now returns the NEW value for that stat
        const newValue = await binarySearchStat(ourPokemon, stat, baseline, counterOption, evCredit);

        // Update the global credit based on the delta
        const delta = newValue - originalVal;
        evCredit -= delta;

        // If this stat change alone fixed the matchup, don't touch other stats for this threat
        const check = await getCounterType(ourPokemon, counterOption.threat_pokemon, counterOption.offensive_move, counterOption.defensive_move, counterOption.usage_pct);
        if (check !== null && check >= baseline) return true;
    }
    // 4. If we exhausted our prioritized stats and still haven't met the baseline, do a final check
    const finalCheck = await getCounterType(ourPokemon, counterOption.threat_pokemon, counterOption.offensive_move, counterOption.defensive_move, counterOption.usage_pct);
    return finalCheck !== null && finalCheck >= baseline;
}

async function binarySearchStat(ourPokemon, stat, baseline, counterOption, evCredit) {
    const startValue = ourPokemon.options.evs[stat] || 0;
    let low = startValue;
    // The highest this specific stat can go is its current value + whatever is left in the 510 budget
    let high = Math.min(252, startValue + evCredit);
    let bestFound = startValue;

    while (low <= high) {
        // Find mid point and snap to 4-EV increments
        let mid = low + Math.floor((high - low) / 8) * 4;

        // Safety: ensure mid actually moves if the range is small
        if (mid === low && low + 4 <= high) mid = low + 4;

        ourPokemon.options.evs[stat] = mid;

        const res = await getCounterType(ourPokemon, counterOption.threat_pokemon, counterOption.offensive_move, counterOption.defensive_move, counterOption.usage_pct);

        if (res !== null && res >= baseline) {
            bestFound = mid;
            high = mid - 4; // Try to go lower
        } else {
            low = mid + 4; // Need more investment
        }
    }

    ourPokemon.options.evs[stat] = bestFound;
    return bestFound;
}

function rankStats(ourPokemon, counterOption, baseline) {
    const stats = [];
    const isOutspeeded = calcSpeed(ourPokemon) < calcSpeed(counterOption.threat_pokemon);

    if (needsSpeed(baseline) && isOutspeeded) stats.push("spe");

    if (counterOption.defensive_move.num_hits_to_ko <= 2) {
        stats.push("hp", counterOption.defensive_move.defensiveStat === "def" ? "def" : "spd", counterOption.offensive_move.offensiveStat);
    } else {
        stats.push(counterOption.offensive_move.offensiveStat, "hp", counterOption.defensive_move.defensiveStat === "def" ? "def" : "spd");
    }
    return [...new Set(stats)]; // Remove duplicates
}

function finalAdaptiveDump(ourPokemon, evCredit) {
    const evs = ourPokemon.options.evs;
    const base = getBaseStats(ourPokemon.name);

    // Determine the "Role" based on where most EVs went during optimization
    const spentOnOffense = (evs.atk || 0) + (evs.spa || 0);
    const spentOnBulk = (evs.hp || 0) + (evs.def || 0) + (evs.spd || 0);
    const spentOnSpeed = (evs.spe || 0);

    let dumpOrder = [];

    if (spentOnSpeed > 100) {
        // Likely a fast attacker: Max Offense, then Speed, then HP
        dumpOrder = [base.atk > base.spa ? 'atk' : 'spa', 'spe', 'hp'];
    } else if (spentOnBulk > spentOnOffense) {
        // Likely a tank: Max HP, then primary Defense, then Offense
        dumpOrder = ['hp', base.def > base.spd ? 'def' : 'spd', base.atk > base.spa ? 'atk' : 'spa'];
    } else {
        // Likely a bulky attacker: Max Offense, then HP, then Defense
        dumpOrder = [base.atk > base.spa ? 'atk' : 'spa', 'hp', base.def > base.spd ? 'def' : 'spd'];
    }

    for (const stat of dumpOrder) {
        if (evCredit <= 0) break;
        const current = evs[stat] || 0;
        const canAdd = Math.min(252 - current, Math.floor(evCredit / 4) * 4);
        evs[stat] = current + canAdd;
        evCredit -= canAdd;
    }
}

async function allocateEvs(ourPokemon, allCounters, countered_data) {
    // 1. Partition all counters by Pokemon name
    // Structure: { "Togekiss": [CounterOption, CounterOption], "Gholdengo": [...] }
    const partitioned = allCounters.reduce((acc, counter) => {
        const name = counter.threat_pokemon.name;
        if (!acc[name]) acc[name] = [];
        acc[name].push(counter);
        return acc;
    }, {});

    // 2. Sort the unique Pokemon names by their total usage impact
    const sortedPokemonNames = Object.keys(partitioned).sort((a, b) => {
        const usageA = partitioned[a].reduce((sum, c) => sum + c.usage_pct, 0);
        const usageB = partitioned[b].reduce((sum, c) => sum + c.usage_pct, 0);
        return usageB - usageA;
    });

    // Start with fresh EVs
    ourPokemon.options.evs = new StatsTable({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });

    // console.log (`Starting allocation. Already covering ${(countered_data.percentage_covered * 100).toFixed(2)}% of meta.`);

    for (const name of sortedPokemonNames) {
        // Skip if this Pokemon was already countered by a previous teammate
        if (name in countered_data.pokemon_countered) continue;

        const builds = partitioned[name];
        const totalThreatUsage = builds.reduce((sum, c) => sum + c.usage_pct, 0);
        let usageHandledByOurMon = 0;

        // Try to minimize EVs for each build of this specific Pokemon
        for (const counterOption of builds) {
            let currentTotal = computeEvTotal(ourPokemon.options.evs);
            let currentEvsLeft = MAX_TOTAL_EVS - currentTotal;

            if (currentEvsLeft <= 0) break;

            // Attempt to meet the counter requirement
            const success = await minimizeEvs(ourPokemon, counterOption, currentEvsLeft);
            if (success) {
                usageHandledByOurMon += counterOption.usage_pct;
            }
        }

        // 3. Check if we countered the weighted majority (e.g., > 50% of this Pokemon's builds)
        if (usageHandledByOurMon > (totalThreatUsage / 2) && usageHandledByOurMon > 0) {
            countered_data.pokemon_countered[name] = ourPokemon.name;
            delete countered_data.pokemon_lost_to[name];
            countered_data.percentage_covered += usageHandledByOurMon;

            // console.log (`  [Success] ${ourPokemon.name} covered ${name} (${(usageHandledByOurMon * 100).toFixed(2)}% meta usage)`);
        }
    }

    // Final dump of remaining points
    let finalTotal = computeEvTotal(ourPokemon.options.evs);
    if (finalTotal < MAX_TOTAL_EVS) {
        finalAdaptiveDump(ourPokemon, MAX_TOTAL_EVS - finalTotal);
    }

    // console.log (`\nFinal EV Total: ${computeEvTotal(ourPokemon.options.evs)}`);
    // console.log (`Current allocated evs:`, ourPokemon.options.evs);
    // console.log (`Total Meta Coverage: ${(countered_data.percentage_covered * 100).toFixed(2)}%`);
}

function computeEvTotal(evSpread) {
    return (evSpread.hp || 0) + (evSpread.atk || 0) + (evSpread.def || 0) + (evSpread.spa || 0) + (evSpread.spc || 0) + (evSpread.spd || 0) + (evSpread.spe || 0);
}

async function getCounterType(ourPokemon, threatPokemon, offensiveMove, defensiveMove, usagePct) {
    const offensiveRes = await runCalc(ourPokemon, threatPokemon, offensiveMove);
    if (!offensiveRes) return null;

    const defensiveRes = await runCalc(threatPokemon, ourPokemon, defensiveMove);
    if (!defensiveRes) return null;

    const counterOption = await canCounter(ourPokemon, threatPokemon, offensiveRes, defensiveRes, offensiveMove, defensiveMove, usagePct);
    return counterOption ? counterOption.counter_type : null;
}

async function optimize(ourMon, fmt, countered_data, threats, ourMoves = [], nature = "Hardy") {
    // console.log (`\n${'='.repeat(55)}`);
    // console.log (`  Optimizing ${ourMon} for ${fmt}`);
    // console.log (`${'='.repeat(55)}`);

    const [formatId, genNum] = parseFormat(fmt);

    // console.log ("\n[1/3] Fetching meta threats...");


    // console.log (`      ${threats.length} threats above ${(MIN_POKEMON_USAGE_PCT * 100).toFixed(0)}% usage`);

    // console.log ("\n[2/3] Binary-searching counter conditions per threat...");
    const ourPokemon = buildOurPokemon(ourMon, genNum, nature, {
        hp: MAX_STAT_EVS, atk: MAX_STAT_EVS, def: MAX_STAT_EVS, spa: MAX_STAT_EVS, spd: MAX_STAT_EVS, spe: MAX_STAT_EVS
    }, ourMoves);

    // Run parallel processes (ThreadPoolExecutor equivalent)
    const promises = threats.map(threat => processThreat(threat, genNum, ourPokemon, ourMoves));
    const results = await Promise.all(promises);

    const allCounters = results.flat().filter(Boolean);

    // console.log (`Pokemon countered before allocateEvs: ${countered_data.pokemon_countered.size}, Percentage of meta covered: ${(countered_data.percentage_covered * 100).toFixed(2)}%`);
    await allocateEvs(ourPokemon, allCounters, countered_data);
    return ourPokemon;
}

const baseStatsCache = {};

function getBaseStats(pokemonName) {
    // .get() is synchronous and handles normalization (e.g., "Toxapex" vs "toxapex")
    const species = gen9.species.get(pokemonName);

    if (!species || !species.exists) {
        console.error(`Pokemon ${pokemonName} not found in Dex.`);
        return null;
    }

    // species.baseStats returns: {hp: 114, atk: 85, def: 70, spa: 85, spd: 80, spe: 30}
    return species.baseStats;
}

function calcSpeed(pokemon) {
    const baseStats = getBaseStats(pokemon.name);
    const baseSpe = baseStats.spe;
    const opts = pokemon.options;

    const ev = (opts.evs && opts.evs.spe !== null) ? opts.evs.spe : 0;
    const iv = (opts.ivs && opts.ivs.spe !== null) ? opts.ivs.spe : 31;
    const level = opts.level || 50;
    const nature = opts.nature || "Hardy";
    const item = (opts.item || "").toLowerCase().replace(/ /g, "");

    let stat = Math.floor(((2 * baseSpe + iv + Math.floor(ev / 4)) * level / 100) + 5);
    stat = Math.floor(stat * (NATURE_SPE_MOD[nature] || 1.0));
    stat = Math.floor(stat * (ITEM_SPE_MOD[item] || 1.0));

    return stat;
}

function outspeeds(ourPokemon, threatPokemon) {
    const ourSpeed = calcSpeed(ourPokemon);
    const threatSpeed = calcSpeed(threatPokemon);
    return ourSpeed >= threatSpeed;
}

// ---------------------------------------------------------------------------
// CLI Execution
// ---------------------------------------------------------------------------
// if (process.argv[1] === fileURLToPath(import.meta.url) || require.main === module) {
//     const args = process.argv.slice(2);
//     if (args.length < 2) {
//         console.log("Usage: node optimizer.js <Pokemon> <format> [move1,move2,...] [nature]");
//         console.log('  e.g. node optimizer.js "Greninja" "gen9doublesou" "Surf,Dark Pulse,Ice Beam,U-turn" "Modest"');
//         process.exit(1);
//     }

//     const mon = args[0];
//     const fmt = args[1];
//     const moves = args[2] ? args[2].split(",") : [];
//     const nature = args[3] || "Hardy";

//     optimize(mon, fmt, moves, nature).catch(err => {
//         console.error("Optimization failed:", err);
//     });
// }

if (process.argv[1] === fileURLToPath(import.meta.url) || require.main === module) {

    const jsonInput = process.argv[2];

    if (!jsonInput) {
        console.error("Error: No team data provided in arguments.");
        console.log("Usage: node optimizer.js '<JSON_STRING>'");
        process.exit(1);
    }

    try {
        const parsed = JSON.parse(jsonInput);

        if (!parsed.team || !Array.isArray(parsed.team)) {
            throw new Error("Invalid JSON: 'team' array not found.");
        }

        // Use the format from the JSON if available, or default
        const fmt = parsed.format || "gen9doublesou";


        //     const args = process.argv.slice(2);

        //     if (args.length < 1) {
        // // console.log ("Usage: node optimizer.js <path_to_json_file> [format]");
        // // console.log ('  e.g. node optimizer.js team.json "gen9doublesou"');
        //         process.exit(1);
        //     }

        //     const filePath = args[0];
        //     const fmt = args[1] || "gen9ou"; // Default format if not provided

        // Read and parse the JSON file
        // const rawData = fs.readFileSync(filePath, 'utf8');

        if (!Array.isArray(parsed.team)) {
            throw new Error("JSON must contain a 'team' array.");
        }

        // console.log (`Starting optimization for ${input.team.length} Pokémon...`);

        const chaos = await fetchChaosJson(fmt);
        if (!chaos) throw new Error(`Could not fetch chaos data for: ${fmt}`);
        const threats = getTopThreats(chaos);

        let countered_data = {
            pokemon_countered: {},
            pokemon_lost_to: {},
            percentage_covered: 0
        }

        for (const threat of threats) {
            countered_data.pokemon_lost_to[threat.name] = threat.usage_pct; // Initialize with null (not yet countered)
        }

        // Run optimizations sequentially to avoid race conditions or log spam

        const runOptimizations = async () => {
            let assigned_evs_per_pokemon = {};
            for (const member of parsed.team) {
                const { name, new_nature, moves } = member;

                // Clean up moves (remove "-" placeholders and trim)
                const cleanMoves = moves ? moves.filter(m => m !== "-").map(m => m.trim()) : [];
                const nature = new_nature || "Hardy";

                // console.log (`\n--- Optimizing ${name} (${nature}) ---`);
                let assigned_evs = null;
                try {
                    assigned_evs = (await optimize(name, fmt, countered_data, threats, cleanMoves, nature)).options.evs;
                } catch (err) {
                    console.error(`Failed to optimize ${name}:`, err.message);
                }
                assigned_evs_per_pokemon[name] = assigned_evs;
                // break
            }
            // console.log ("\nAll optimizations complete.");
            // console.log (`Our team counters ${Object.keys(countered_data.pokemon_countered).length} threats covering ${(countered_data.percentage_covered * 100).toFixed(2)}% of the meta.`);
            for (const member of Object.keys(countered_data.pokemon_countered)) {
                // console.log (`  - ${member} (countered by ${countered_data.pokemon_countered[member]})`);
            }
            // console.log ("\nFinal EV spreads assigned to each Pokémon:");
            for (const [pokemon, evs] of Object.entries(assigned_evs_per_pokemon)) {
                // console.log (`  - ${pokemon}: ${JSON.stringify(evs)}`);
            }

            let output_data = {
                pokemon_countered: countered_data.pokemon_countered,
                pokemon_lost_to: countered_data.pokemon_lost_to,
                percentage_covered: countered_data.percentage_covered,
                assigned_evs_per_pokemon: assigned_evs_per_pokemon
            }

            process.stdout.write(JSON.stringify(output_data, null, 2));


        };

        runOptimizations();

    } catch (err) {
        console.error("Error processing JSON file:", err.message);
        process.exit(1);
    }
}