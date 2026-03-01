import modal
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
        # Ensure your local optimizer.js is added and dependencies installed
        "cd /app && npm install --no-package-lock @smogon/calc @pkmn/data @pkmn/dex"
    )
    .add_local_file("optimizer.js", "/app/optimizer.js")
    .add_local_file("pokemon_classes.js", "/app/pokemon_classes.js")
)

app = modal.App("pokemon-ai-optimizer-v2", image=image)
web_app = FastAPI()

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. The Brain: Receives the "Lost To" list and decides on Roster/Move changes
@app.function(secrets=[modal.Secret.from_name("my-ai-secret")])
def strategist_agent(calc_results, current_team, cycle_num, history, force_instruction=""):
    import openai
    client = openai.OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENAI_API_KEY"])
    
    prompt = f"""
    You are a Ruthless Competitive Pokemon Optimizer.
    GOAL: Counter >50% of the Meta Threats, and ensure all 6 team slots are filled with valid Pokemon (no '[EMPTY_SLOT]').
    SYSTEM OVERRIDE: {force_instruction}
    CURRENT COVERAGE: {calc_results.get('percentage_covered') * 100:.1f}%
    WEAKNESSES (Lost To): {json.dumps(calc_results.get('pokemon_lost_to'))}
    TEAM: {json.dumps(current_team)}
    CYCLE: {cycle_num}/10

    HIERARCHY PROGRESSION RULES:
    You are strictly forbidden from replacing a Pokémon (LEVEL 4) unless you have already attempted to fix it using LEVEL 1, 2, and 3 tweaks in previous cycles.
    
    1. LEVEL 1 (Items & Natures): Tweak items or Natures (Adamant, Jolly, etc) to patch stats.
    2. LEVEL 2 (Moves): Change moves to fix immunities or coverage gaps.
    3. LEVEL 3 (Stats): Tweak explicit EVs and Abilities.
    4. LEVEL 4 (Roster): Replace 1 Pokemon entirely ONLY if Levels 1-3 mathematically failed to gain 50% coverage.

    CRITICAL RULES:
    - If a slot's name is "[EMPTY_SLOT]", you MUST bypass the Hierarchy and use a LEVEL 4 swap to fill it immediately.
    - If 'SYSTEM OVERRIDE' is active, the Hierarchy is bypassed and you MUST perform a LEVEL 4 swap this cycle.
    - Otherwise, you MUST attempt Level 1, 2, or 3 edits before ever using a Level 4 swap.
    - Always provide a full update object for a Pokemon if you change it.
    - You may ONLY replace a MAXIMUM of 1 Pokemon per cycle.
    
    OUTPUT ONLY JSON:
    {{
      "step_taken": 1, 2, 3, or 4,
      "reasoning": "Explain why you are taking this action to beat [High Threat]",
      "updates": [
        {{ 
            "name": "OldName", 
            "replace_with": "NewName", 
            "new_moves": ["Move1", "Move2", "Move3", "Move4"], 
            "new_item": "Item",
            "new_ability": "Ability",
            "new_nature": "Nature"
        }}
      ]
    }}
    """

    response = client.chat.completions.create(
        model="openrouter/auto",
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": "Professional Smogon Strategist."},
                  {"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

# 3. The Math Engine: Calls optimizer.js
def run_optimizer_script(team_data):
    import subprocess
    import json
    
    # We pass the team as a JSON string to the Node script
    cmd = ["node", "/app/optimizer.js", json.dumps({"team": team_data}), "gen9doublesou"]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd="/app", timeout=15)
        if result.returncode != 0:
            print(f"\n[JS FATAL ERROR]: {result.stderr}\n")
        return json.loads(result.stdout)
    except Exception as e:
        print(f"\n[PYTHON EXECUTION ERROR]: {e}")
        try:
             print(f"STDOUT: {result.stdout}")
        except: pass
        return {"error": str(e), "percentage_covered": 0, "pokemon_lost_to": {}, "pokemon_countered": {}}

# 4. API & Simulation Loop
@web_app.post("/simulate")
async def simulate_endpoint(request: Request):
    payload = await request.json()
    current_team = payload.get("team", [
        {"name": "Magikarp", "moves": ["Splash"], "item": "None"},
        {"name": "Metapod", "moves": ["Harden"], "item": "None"}
    ])
    
    async def event_generator():
        optimization_history = []
        best_coverage = 0.0
        stagnation_counter = 0
        
        # === CYCLE 0: BASELINE STRESS TEST ===
        baseline_results = run_optimizer_script(current_team)
        baseline_battles = []
        
        # Wins
        for victim, counterer in baseline_results.get("pokemon_countered", {}).items():
            baseline_battles.append({"attacker": counterer, "defender": victim, "result": "Guaranteed OHKO"})
            
        import random
        # Losses
        for threat, _ in baseline_results.get("pokemon_lost_to", {}).items():
            valid_members = [p for p in current_team if str(p.get("name", "-")) != "-"]
            victim = random.choice(valid_members).get("name") if valid_members else "Unknown"
            baseline_battles.append({"attacker": threat, "defender": victim, "result": "Team Swept"})

        if len(baseline_battles) == 0:
            valid_members = [p for p in current_team if str(p.get("name", "-")) != "-"]
            victim = random.choice(valid_members).get("name") if valid_members else "Unknown"
            baseline_battles.append({"attacker": victim, "defender": "Meta Threat", "result": "Failed attempt on meta threat"})

        cycle_zero_payload = {
            'num': 0,
            'coverage': round(baseline_results.get('percentage_covered', 0) * 100, 1),
            'goal': 50.0,
            'battles': baseline_battles,
            'log': "INITIAL STRESS TEST: Analyzing original roster against global Smogon meta usage statistics.",
            'changes': []
        }
        
        print("\n" + "="*50)
        print("CYCLE 0: BASELINE LOG:")
        print(json.dumps(cycle_zero_payload, indent=2))
        print("="*50 + "\n")
        
        yield f"data: {json.dumps(cycle_zero_payload)}\n\n"
        await asyncio.sleep(3) # Dramatic pause for the UI

        # === AI OPTIMIZATION LOOP ===
        for i in range(1, 11):
            # Step A: Run the JS Heavy Lifting
            calc_results = run_optimizer_script(current_team)
            
            # Step B: Auto-Apply the optimal EVs found by the script
            ev_map = calc_results.get("assigned_evs_per_pokemon", {})
            for p in current_team:
                if p["name"] in ev_map:
                    p["new_evs"] = ev_map[p["name"]]

            # Step C: Check for Stagnation
            current_coverage = calc_results.get('percentage_covered', 0)
            if current_coverage <= best_coverage:
                stagnation_counter += 1
            else:
                best_coverage = current_coverage
                stagnation_counter = 0
                
            force_instr = ""
            if stagnation_counter >= 3:
                force_instr = "CRITICAL METAGAME OVERRIDE: Coverage has stalled for 3 cycles. EV and move tweaks are mathematically insufficient. You MUST skip to LEVEL 4 and execute a Roster Replacement this cycle!"
                stagnation_counter = 0 # Reset after forcing

            # Step D: Get Strategy from LLM
            report = await strategist_agent.remote.aio(calc_results, current_team, i, optimization_history, force_instr)
            
            # Step E: Parse and Apply Changes
            reasoning = "Optimizing..."
            try:
                data = json.loads(report)
                reasoning = data.get("reasoning", "")
                for up in data.get("updates", []):
                    for p in current_team:
                        if str(p.get("name", "")).lower() == str(up.get("name", "")).lower():
                                if up.get("replace_with") and str(up.get("replace_with")).strip() != "" and up.get("replace_with") != p["name"]:
                                    p["name"] = up["replace_with"]
                                    p.pop("new_evs", None)
                                elif p["name"] in ev_map:
                                    p["new_evs"] = ev_map[p["name"]]
                                    
                                if up.get("new_moves") is not None:
                                    p["moves"] = up["new_moves"]
                                if up.get("new_item") is not None:
                                    p["item"] = up["new_item"]
                                if up.get("new_nature") is not None:
                                    p["new_nature"] = up["new_nature"]

            except: pass

            # Step E: Format for Frontend (Maintain original UI structure)
            battles_ui = []
            counters = calc_results.get("pokemon_countered", {})
            for victim, counterer in counters.items():
                battles_ui.append({
                    "attacker": counterer, 
                    "defender": victim, 
                    "result": "Guaranteed OHKO"
                })
            
            import random
            losses = calc_results.get("pokemon_lost_to", {})
            for threat, _ in losses.items():
                 # Pick a random existing team member to show getting swept
                 valid_members = [p for p in current_team if str(p.get("name", "-")) != "-"]
                 victim = random.choice(valid_members).get("name") if valid_members else "Unknown"
                 
                 battles_ui.append({
                    "attacker": threat, 
                    "defender": victim, 
                    "result": "Team Swept"
                 })
                 
            if len(battles_ui) == 0:
                 valid_members = [p for p in current_team if str(p.get("name", "-")) != "-"]
                 victim = random.choice(valid_members).get("name") if valid_members else "Unknown"
                 battles_ui.append({
                    "attacker": victim, 
                    "defender": "Meta Threat", 
                    "result": "Failed attempt on meta threat"
                 })

            out_payload = {
                'num': i,
                'coverage': round(calc_results.get('percentage_covered', 0) * 100, 1),
                'goal': 50.0,
                'battles': battles_ui, # ALL battles (wins & losses)
                'log': reasoning,
                'changes': data.get('updates', [])
            }
            
            print("\n" + "="*50)
            print(f"CYCLE {i} LOG:")
            print(json.dumps(out_payload, indent=2))
            print("="*50 + "\n")

            yield f"data: {json.dumps(out_payload)}\n\n"
            
            await asyncio.sleep(2)
            
            if calc_results.get('percentage_covered', 0) >= 0.50:
                break

        yield f"data: {json.dumps({'status': 'COMPLETE', 'finalTeam': current_team})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.function()
@modal.asgi_app()
def fastapi_app():
    return web_app