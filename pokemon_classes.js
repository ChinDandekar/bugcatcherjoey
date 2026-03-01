// pokemon_dataclasses.js

export class ThreatItem {
    constructor(value, usage_pct) {
        this.value = value;
        this.usage_pct = usage_pct;
    }
}

export class Threat {
    constructor(name, usage_pct, best_moves, items, spreads) {
        this.name = name;
        this.usage_pct = usage_pct;
        this.best_moves = best_moves;
        this.items = items;
        this.spreads = spreads;
    }
}

export class Generation {
    constructor(num) {
        this.num = num;
    }
}

export class StatsTable {
    constructor({ hp = null, atk = null, def = null, spa = null, spd = null, spe = null, spc = null } = {}) {
        this.hp = hp;
        this.atk = atk;
        this.def = def;
        this.spa = spa;
        this.spd = spd;
        this.spe = spe;
        this.spc = spc; // for Gen 1 compatibility
    }
}

export class PokemonOptions {
    constructor(options = {}) {
        this.level = options.level ?? null;
        this.gender = options.gender ?? null;
        this.shiny = options.shiny ?? null;
        this.happiness = options.happiness ?? null;
        this.pokeball = options.pokeball ?? null;
        this.ability = options.ability ?? null;
        this.item = options.item ?? null;
        this.nature = options.nature ?? null;
        this.moves = options.moves ?? null;
        this.curHP = options.curHP ?? null;
        this.ivs = options.ivs ?? null;
        this.evs = options.evs ?? null;
        this.boosts = options.boosts ?? null;
    }
}

export class Pokemon {
    constructor(gen, name, options = null) {
        this.gen = gen;
        this.name = name;
        this.options = options || new PokemonOptions();
    }
}

export class CalcResult {
    constructor(desc, min_damage, max_damage, num_hits_to_ko, offensive_stat, defensive_stat) {
        this.desc = desc;
        this.min_damage = min_damage;
        this.max_damage = max_damage;
        this.num_hits_to_ko = num_hits_to_ko;
        this.offensive_stat = offensive_stat;
        this.defensive_stat = defensive_stat;
    }
}

export const CounterType = Object.freeze({
    NO_OUTSPEED_4HKO: 1, // - no outspeed, take 4 hits, 4HKO
    NO_OUTSPEED_3HKO: 2, // - no outspeed, take 3 hits, 3HKO
    OUTSPEED_3HKO: 3,    // - outspeed, take 2 hits, 3HKO
    NO_OUTSPEED_2HKO: 4, // - no outspeed, take 2 hits, 2HKO
    OUTSPEED_2HKO: 5,    // - outspeed, take 1 hit, 2HKO
    NO_OUTSPEED_OHKO: 6, // - no outspeed, take 1 hit, OHKO
    OUTSPEED_OHKO: 7     // - outspeed, OHKO
});

export class Move {
    constructor(name, offensiveStat, defensiveStat) {
        this.name = name;
        this.offensiveStat = offensiveStat;
        this.defensiveStat = defensiveStat;
    }
}

export class CounterOption {
    constructor(threat_pokemon, is_offensive_counter, usage_pct, counter_type, offensive_move, defensive_move) {
        this.threat_pokemon = threat_pokemon;
        this.is_offensive_counter = is_offensive_counter;
        this.usage_pct = usage_pct;
        this.counter_type = counter_type;
        this.offensive_move = offensive_move;
        this.defensive_move = defensive_move;
    }
}