# import modal
import subprocess
import json

# Define the container environment
# image = (
#     modal.Image.debian_slim()
#     .apt_install("curl", "ca-certificates")
#     .run_commands(
#         "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
#         "apt-get install -y nodejs",
#         "mkdir -p /app",
#         "cd /app && npm install --no-package-lock @smogon/calc @pkmn/data @pkmn/dex"
#     )
#     .add_local_file("calc_bridge.js", "/app/calc_bridge.js")
# )

# app = modal.App("pokemon-optimizer", image=image)

# Shared Memory: Tracks which threats are already "covered" by the team
# team_memory = modal.Dict.from_name("pokemon-team-memory", create_if_missing=True)
team_memory = dict()

from dataclasses import dataclass, asdict
from typing import Optional, Union, List, Dict


# You can replace this with your real Generation enum/class
GenerationNum = int


@dataclass
class Generation:
    num: int


@dataclass
class StatsTable:
    hp: Optional[int] = None
    atk: Optional[int] = None
    def_: Optional[int] = None
    spa: Optional[int] = None
    spd: Optional[int] = None
    spe: Optional[int] = None
    spc: Optional[int] = None  # for Gen 1 compatibility


@dataclass
class PokemonOptions:
    # Fields from State.Pokemon except ability, item, nature, moves
    level: Optional[int] = None
    gender: Optional[str] = None
    shiny: Optional[bool] = None
    happiness: Optional[int] = None
    pokeball: Optional[str] = None

    # Overridden / explicitly allowed fields
    ability: Optional[str] = None
    item: Optional[str] = None
    nature: Optional[str] = None
    moves: Optional[List[str]] = None
    curHP: Optional[int] = None

    ivs: Optional[StatsTable] = None
    evs: Optional[StatsTable] = None
    boosts: Optional[StatsTable] = None


@dataclass
class Pokemon:
    gen: Union[GenerationNum, Generation]
    name: str
    options: Optional[PokemonOptions] = None

    def __post_init__(self):
        # Ensure options always exists (like TS optional param defaulting to {})
        if self.options is None:
            self.options = PokemonOptions()

# @app.function()
def damage_calc_agent(attacker_pokemon: Pokemon, defender_pokemon: Pokemon):
    """Low-level tool to call the JS calculator."""
    # We use /app/calc_bridge.js because that's where we added it in the image
    attacker_pokemon.options.evs.spa = 252
    payload = {
        "attacker": asdict(attacker_pokemon),
        "defender": asdict(defender_pokemon)
    }

    result = subprocess.run(
        ["node", "calc_bridge.js"],
        input=json.dumps(payload),  # <-- sent to stdin
        text=True,                  # required for string input
        capture_output=True
    )
        
    if result.returncode != 0:
        # This will print the actual JS error in your terminal
        print(f"DEBUG JS ERROR: {result.stderr}")
        return {"error": result.stderr}
    
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"error": "Invalid JSON returned from JS"}

# @app.function()
def counter_agent(pokemon_info):
    """The Agent: Optimizes 1 Pokemon while checking the Shared Memory."""
    meta_threats: List[Pokemon] = pokemon_info["meta_threats"]
    our_pokemon: Pokemon = pokemon_info["our_pokemon"]
    
    coverage_report = []
    
    for threat in meta_threats:
        # Check Shared Memory: Is someone else already handling this threat?
        if threat.name in team_memory :
            covered_by = team_memory.get(threat.name)
            coverage_report.append(f"⏭️ Skipping {threat.name} (Already covered by {covered_by})")
            continue
        
        # Calculation: Can we OHKO with 252 EVs?
        res = damage_calc_agent(our_pokemon, threat)
        
        if "error" in res:
            coverage_report.append(f"❌ Error calculating vs {threat.name}")
        elif res.get("ohko"):
            # Claim the threat in shared memory!
            team_memory[threat.name] = our_pokemon.name
            coverage_report.append(f"🎯 COUNTER FOUND: {res['desc']}")
        else:
            coverage_report.append(f"⚠️ Cannot OHKO {threat.name} with {our_pokemon.options.moves}")

    return {"name": our_pokemon.name, "report": coverage_report}

# @app.local_entrypoint()
def main():
    # Clear memory for a fresh run
    team_memory.clear()
    
   # Assume the Pokemon dataclass and related classes have already been defined:
# Pokemon, PokemonOptions, StatsTable

# Mock Data
user_team_data = [
    {"name": "Gengar", "move": "Shadow Ball"},
    {"name": "Incineroar", "move": "Flare Blitz"},
    {"name": "Iron Valiant", "move": "Moonblast"}
]

meta_threats_names = ["Great Tusk", "Amoonguss", "Flutter Mane"]

# Convert user team to Pokemon instances
user_team = [
    Pokemon(
        gen=9,
        name=p["name"],
        options=PokemonOptions(
            moves=[p["move"]],
            evs=StatsTable(),  # defaults to 0 / None
        )
    )
    for p in user_team_data
]

# Convert meta threats to Pokemon instances (no moves known, can be empty)
meta_threats = [
    Pokemon(
        gen=9,
        name=name,
        options=PokemonOptions(
            evs=StatsTable(),  # defaults
        )
    )
    for name in meta_threats_names
]

# Optional: verify
for p in user_team + meta_threats:
    print(p)

    print("🚀 Spawning Parallel Agents...")
    
    # Prepare data for mapping
    tasks = [{"our_pokemon": p, "meta_threats": meta_threats} for p in user_team]
    
    # Run all agents in parallel containers!
    results = list(counter_agent(task) for task in tasks )

    print("\n" + "="*40)
    print("      FINAL OPTIMIZED TEAM REPORT")
    print("="*40)
    for res in results:
        print(f"\n--- {res['name']} ---")
        for line in res["report"]:
            print(line)

if __name__ == '__main__':
    main()