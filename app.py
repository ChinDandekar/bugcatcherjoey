import modal
import subprocess
import json
import os
import asyncio

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# 1. Define the Container Environment
image = (
    modal.Image.debian_slim()
    .apt_install("curl", "ca-certificates")
    .pip_install("openai", "requests", "fastapi", "sse-starlette", "uvicorn") 
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        "mkdir -p /app",
        "cd /app && npm install --no-package-lock @smogon/calc @pkmn/data @pkmn/dex"
    )
    .add_local_file("calc_bridge.js", "/app/calc_bridge.js")
)

app = modal.App("pokemon-ai-optimizer", image=image)

# 1.5 Define the Web Application API
web_app = FastAPI()

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. The Strategist Agent (LLM Brain)
@app.function(secrets=[modal.Secret.from_name("my-ai-secret")])
def strategist_agent(analysis_results, all_meta_threats, team_data, cycle_num, history, force_instruction=""):
    import openai
    
    client = openai.OpenAI(
        base_url="https://openrouter.ai/api/v1", 
        api_key=os.environ["OPENAI_API_KEY"]
    )
    
    covered = set()
    for res in analysis_results:
        for match in res.get("meta_coverage", []):
            covered.add(match)
            
    prompt = f"""
    You are a Ruthless Competitive Pokemon Optimizer.
    GOAL: Counter >50% of the Meta Threats (6/10), and ensure all 6 team slots are filled with valid Pokemon (no '-').
    CURRENT SCORE: {len(covered)}/10
    CYCLE: {cycle_num} of 10
    HISTORY: {history}
    SYSTEM OVERRIDE: {force_instruction}

    HIERARCHY RULES:
    1. LEVEL 1 (Items & Natures): Tweak items or Natures (Adamant, Jolly, etc) for stat/damage boosts.
    2. LEVEL 2 (Moves): Change moves to fix immunities (0% damage) or gaps.
    3. LEVEL 3 (Stats): Tweak explicit EVs and Abilities.
    4. LEVEL 4 (Roster): Replace 1 Pokemon entirely if the above fail.

    CRITICAL RULES:
    - Prioritize EMPTY SLOTS: If a slot's name is "-", you MUST use a LEVEL 4 swap to fill it with a viable valid competitive Pokemon before optimizing anything else.
    - If a Pokemon is fundamentally useless (Ex: Magikarp), optimize for 1/2 cycles and then skip to LEVEL 4.
    - If 'SYSTEM OVERRIDE' is active, you MUST perform a LEVEL 4 swap this cycle.
    - Always provide a 'new_move', 'new_item', 'new_evs', 'new_nature', and 'new_ability' when swapping a Pokemon.

    MATH DATA: {json.dumps(analysis_results)}
    CURRENT TEAM: {json.dumps(team_data)}
    
    OUTPUT ONLY JSON:
    {{
      "step_taken": 1, 2, 3, or 4,
      "reasoning": "A brief explanation of why this change was made for the judges",
      "updates": [
        {{ 
            "name": "CurrentName", 
            "new_item": "Item", 
            "new_moves": ["Move1", "Move2", "Move3", "Move4"], 
            "new_evs": {{"atk": 252, "spe": 252}},
            "new_nature": "Adamant",
            "new_ability": "Ability",
            "replace_with": "NewPokemon" 
        }}
      ]
    }}
    """

    response = client.chat.completions.create(
        model="openrouter/auto",
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": "You are a professional Pokemon meta-strategist."},
                  {"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

# 3. The Damage Calculator (JS Bridge)
@app.function()
def damage_calc_agent(attacker_dict, defender):
    import subprocess
    import json
    
    # 🛡️ Shield: Prevent empty inputs from crashing the shell
    if not attacker_dict or not attacker_dict.get("name") or str(attacker_dict["name"]).lower() in ["none", "null"]:
        return {"range": [0, 0], "ohko": False, "desc": "No Attacker"}

    cmd = ["node", "/app/calc_bridge.js", json.dumps(attacker_dict), str(defender)]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd="/app", timeout=5)
        return json.loads(result.stdout)
    except Exception:
        return {"range": [0, 0], "ohko": False, "desc": "Calculation Mismatch"}

# 4. The Worker Agent (Parallelizes Calcs)
@app.function()
def counter_agent(pokemon_info):
    name = pokemon_info["name"]
    moves = pokemon_info.get("moves", [pokemon_info.get("move", "Earthquake")])
    item = pokemon_info.get("item", "None")
    new_evs = pokemon_info.get("new_evs")
    new_nature = pokemon_info.get("new_nature")
    new_ability = pokemon_info.get("new_ability")
    threats = pokemon_info["threats"]
    
    attacker_payload = {
        "name": name,
        "moves": moves,
        "item": item,
        "new_evs": new_evs,
        "new_nature": new_nature,
        "new_ability": new_ability
    }
    
    max_results = []
    for threat in threats:
        res = damage_calc_agent.local(attacker_payload, threat)
        if res.get("ohko"):
            max_results.append(threat)
            
    return {
        "name": name,
        "item_used": item,
        "meta_coverage": max_results,
        "results": [{"vs": t, "details": "Guaranteed OHKO"} for t in max_results]
    }

# 5. The Scraper (Live Meta Data)
@app.function()
def meta_scraper_agent():
    import requests
    import re
    # Pulls the most recent 1825 (Pro) stats
    urls = ["https://www.smogon.com/stats/2026-01/gen9ou-1825.txt", "https://www.smogon.com/stats/2025-12/gen9ou-1825.txt"]
    for url in urls:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                pattern = r"\|\s+\d+\s+\|\s+([A-Za-z0-9\-\. ]+?)\s+\|"
                all_pokemon = re.findall(pattern, response.text)
                threats = [p.strip().replace(" ", "-") for p in all_pokemon if p.strip() and p.strip() != "Pokemon"]
                if threats: return threats[:10]
        except: continue
    return ["Great-Tusk", "Gholdengo", "Kingambit", "Iron-Valiant", "Ogerpon-Wellspring"]

# 6. API SSE Web Server Entrypoint
@web_app.post("/simulate")
async def simulate_endpoint(request: Request):
    payload = await request.json()
    initial_team = payload.get("team", [])
    
    async def event_generator():
        # 1. Scrape the live meta first
        threats = await meta_scraper_agent.remote.aio()
        if not threats:
            threats = ["Great-Tusk", "Gholdengo", "Kingambit", "Iron-Valiant", "Ogerpon-Wellspring", "Dragonite", "Zamazenta", "Ting-Lu", "Gliscor", "Dragapult"]
        
        # 2. Starting Team (Fallback)
        current_team = initial_team if initial_team else [
            {"name": "Magikarp", "moves": ["Splash", "-", "-", "-"], "item": "None", "new_nature": "Hardy"},
            {"name": "Metapod", "moves": ["Harden", "-", "-", "-"], "item": "None", "new_nature": "Hardy"},
            {"name": "Unown", "moves": ["Hidden-Power", "-", "-", "-"], "item": "None", "new_nature": "Hardy"}
        ]
        
        optimization_history = []
        best_coverage = 0
        stagnation_counter = 0
        stagnation_threshold = 3 

        # 3. Optimization Loop (10 Cycles)
        for i in range(10):
            cycle_num = i + 1
            
            # Build tasks for parallel worker agents
            tasks = []
            for p in current_team:
                tasks.append({
                    "name": str(p["name"]), 
                    "moves": p.get("moves", [p.get("move", "Earthquake")]), 
                    "item": str(p.get("item", "None")), 
                    "new_evs": p.get("new_evs"),
                    "new_nature": p.get("new_nature"),
                    "new_ability": p.get("new_ability"),
                    "threats": threats
                })
                
            raw_results = await asyncio.gather(*[counter_agent.remote.aio(t) for t in tasks])
            
            current_coverage_set = set()
            for r in raw_results:
                for m in r.get("meta_coverage", []):
                    current_coverage_set.add(m)
            
            current_score = len(current_coverage_set)
            current_percent = (current_score / len(threats)) * 100

            if current_score <= best_coverage:
                stagnation_counter += 1
            else:
                best_coverage = current_score
                stagnation_counter = 0
            
            force_instr = ""
            if stagnation_counter >= stagnation_threshold:
                force_instr = f"CRITICAL SYSTEM OVERRIDE: Coverage has stalled for {stagnation_threshold} cycles. You MUST skip to LEVEL 4 and replace the weakest Pokemon now."

            report = await strategist_agent.remote.aio(raw_results, threats, current_team, cycle_num, optimization_history, force_instr)
            
            cycle_updates = []
            reasoning = "Analyzing meta impact..."
            try:
                data = json.loads(report)
                step = data.get("step_taken")
                cycle_updates = data.get("updates", [])
                
                if "reasoning" in data:
                    reasoning = data["reasoning"]

                if cycle_updates:
                    swapped_this_cycle = False 
                    
                    for update in cycle_updates:
                        target_name = update.get("name")
                        if not target_name: continue
                        
                        for p in current_team:
                            if p["name"].lower() == target_name.lower():
                                if step in [1, 2, 3]:
                                    if update.get("new_item"): p["item"] = update["new_item"]
                                    if update.get("new_moves"): p["moves"] = update["new_moves"]
                                    elif update.get("new_move"): p["moves"] = [update["new_move"]]
                                    if update.get("new_evs"): p["new_evs"] = update["new_evs"]
                                    if update.get("new_nature"): p["new_nature"] = update["new_nature"]
                                    if update.get("new_ability"): p["new_ability"] = update["new_ability"]
                                
                                if step == 4 and not swapped_this_cycle:
                                    new_mon = update.get("replace_with")
                                    if new_mon and str(new_mon).lower() not in ["none", "null"]:
                                        p["name"] = str(new_mon)
                                        p["moves"] = update.get("new_moves", [update.get("new_move", "Earthquake")])
                                        p["item"] = update.get("new_item", "None")
                                        if update.get("new_evs"): p["new_evs"] = update["new_evs"]
                                        if update.get("new_nature"): p["new_nature"] = update["new_nature"]
                                        if update.get("new_ability"): p["new_ability"] = update["new_ability"]
                                        
                                        stagnation_counter = 0
                                        best_coverage = 0 
                                        swapped_this_cycle = True
                    
                    optimization_history.append(f"Cycle {cycle_num}: Step {step}")

            except Exception as e:
                print(f"Extraction Error: {e}")
                
            # Formatting Battles for Frontend
            battles_ui = []
            for r in raw_results:
                for match in r["results"]:
                    battles_ui.append({"attacker": r["name"], "defender": match["vs"], "result": match["details"]})
                if not r["results"]:
                    battles_ui.append({"attacker": r["name"], "defender": threats[0], "result": "Failed attempt on meta threat"})

            # Yield Cycle Event payload
            payload = {
                "num": cycle_num,
                "coverage": round(current_percent, 1),
                "goal": 60.0,
                "battles": battles_ui,
                "log": reasoning,
                "changes": cycle_updates
            }
            yield f"data: {json.dumps(payload)}\n\n"
            
            # Add a slight delay to allow the frontend to animate the new changes before streaming the next massive block
            await asyncio.sleep(2.5)

            empty_count = sum(1 for p in current_team if str(p.get("name", "-")) == "-")
            if current_score >= 6 and empty_count == 0:
                break
                
        # Send Final Completed Team Event
        yield f"data: {json.dumps({'status': 'COMPLETE', 'finalTeam': current_team})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.function()
@modal.asgi_app()
def fastapi_app():
    return web_app