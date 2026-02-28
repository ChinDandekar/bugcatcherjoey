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

# @app.function()
def damage_calc_agent(attacker, defender, spa_evs, move):
    """Low-level tool to call the JS calculator."""
    # We use /app/calc_bridge.js because that's where we added it in the image
    cmd = ["node", "calc_bridge.js", attacker, defender, str(spa_evs), move]
    
    # Run the command
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
    
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
    name = pokemon_info["name"]
    move = pokemon_info["move"]
    meta_threats = pokemon_info["threats"]
    
    coverage_report = []
    
    for threat in meta_threats:
        # Check Shared Memory: Is someone else already handling this threat?
        if threat in team_memory :
            covered_by = team_memory.get(threat)
            coverage_report.append(f"⏭️ Skipping {threat} (Already covered by {covered_by})")
            continue
        
        # Calculation: Can we OHKO with 252 EVs?
        res = damage_calc_agent(name, threat, 252, move)
        
        if "error" in res:
            coverage_report.append(f"❌ Error calculating vs {threat}")
        elif res.get("ohko"):
            # Claim the threat in shared memory!
            team_memory[threat] = name
            coverage_report.append(f"🎯 COUNTER FOUND: {res['desc']}")
        else:
            coverage_report.append(f"⚠️ Cannot OHKO {threat} with {move}")

    return {"name": name, "report": coverage_report}

# @app.local_entrypoint()
def main():
    # Clear memory for a fresh run
    team_memory.clear()
    
    # Mock Data: User picks 3 Pokemon and their main moves
    user_team = [
        {"name": "Gengar", "move": "Shadow Ball"},
        {"name": "Incineroar", "move": "Flare Blitz"},
        {"name": "Iron Valiant", "move": "Moonblast"}
    ]
    
    # The Meta Threats we want to solve for
    meta_threats = ["Great Tusk", "Amoonguss", "Flutter Mane"]

    print("🚀 Spawning Parallel Agents...")
    
    # Prepare data for mapping
    tasks = [{"name": p["name"], "move": p["move"], "threats": meta_threats} for p in user_team]
    
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