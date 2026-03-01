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
        # Ensure your local optimizer2.js is added and dependencies installed
        "cd /app && npm install --no-package-lock @smogon/calc @pkmn/data @pkmn/dex"
    )
    .add_local_file("optimizer2.js", "/app/optimizer2.js")
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
def strategist_agent(calc_results, current_team, cycle_num, history):
    import openai
    client = openai.OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENAI_API_KEY"])
    
    prompt = f"""
    You are a Pokemon Strategy Engine.
    CURRENT COVERAGE: {calc_results.get('percentage_covered') * 100:.1f}%
    WEAKNESSES (Lost To): {json.dumps(calc_results.get('pokemon_lost_to'))}
    TEAM: {json.dumps(current_team)}
    CYCLE: {cycle_num}/10

    GOAL: Replace weak links or adjust moves to counter the 'pokemon_lost_to' list.
    
    RULES:
    1. If coverage is low, replace the Pokemon with the fewest counters in 'pokemon_countered'.
    2. Always provide a full update object for a Pokemon if you change it.
    
    OUTPUT ONLY JSON:
    {{
      "reasoning": "Explain why you are swapping X for Y to beat [High Threat]",
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

# 3. The Math Engine: Calls optimizer2.js
@app.function()
def run_optimizer_script(team_data):
    import subprocess
    import json
    
    # We pass the team as a JSON string to the Node script
    cmd = ["node", "/app/optimizer2.js", json.dumps(team_data), "gen9doublesou"]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd="/app", timeout=15)
        return json.loads(result.stdout)
    except Exception as e:
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

        for i in range(1, 11):
            # Step A: Run the JS Heavy Lifting
            calc_results = await run_optimizer_script.remote.aio(current_team)
            
            # Step B: Auto-Apply the optimal EVs found by the script
            ev_map = calc_results.get("assigned_evs_per_pokemon", {})
            for p in current_team:
                if p["name"] in ev_map:
                    p["new_evs"] = ev_map[p["name"]]

            # Step C: Get Strategy from LLM
            report = await strategist_agent.remote.aio(calc_results, current_team, i, optimization_history)
            
            # Step D: Parse and Apply Changes
            reasoning = "Optimizing..."
            try:
                data = json.loads(report)
                reasoning = data.get("reasoning", "")
                for up in data.get("updates", []):
                    for p in current_team:
                        if p["name"].lower() == up["name"].lower():
                            p["name"] = up.get("replace_with", p["name"])
                            p["moves"] = up.get("new_moves", p["moves"])
                            p["item"] = up.get("new_item", p["item"])
                            p["new_nature"] = up.get("new_nature", p.get("new_nature"))
            except: pass

            # Step E: Format for Frontend (Maintain original UI structure)
            battles_ui = []
            counters = calc_results.get("pokemon_countered", {})
            for victim, counterer in counters.items():
                battles_ui.append({
                    "attacker": counterer, 
                    "defender": victim, 
                    "result": "Guaranteed Check"
                })

            yield f"data: {json.dumps({
                'num': i,
                'coverage': round(calc_results.get('percentage_covered', 0) * 100, 1),
                'goal': 60.0,
                'battles': battles_ui[:15], # Limit UI clutter
                'log': reasoning,
                'changes': data.get('updates', [])
            })}\n\n"
            
            await asyncio.sleep(2)

        yield f"data: {json.dumps({'status': 'COMPLETE', 'finalTeam': current_team})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.function()
@modal.asgi_app()
def fastapi_app():
    return web_app