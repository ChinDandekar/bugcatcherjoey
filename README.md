# Bugcatcher Joey: AI Pokémon Meta Optimizer 🧢⚡️

**Built for HackIllinois 2026**

## 🚀 Elevator Pitch
Competitive Pokémon is a game of intense strategy, deep mathematical damage calculations, and predicting an ever-shifting metagame. **Bugcatcher Joey** is an intelligent, high-performance AI Strategist that takes your favorite custom Pokémon team and rigorously stress-tests it against the current top-tier Smogon OU metagame threats. Using a custom hybrid architecture—combining a cutting-edge React frontend, a Python FastAPI loop, and a raw Node.js mathematical damage engine deployed to the cloud via Modal—the AI autonomously evaluates your roster's weaknesses and algorithmically iterates through optimal items, moves, EVs, and full roster swaps until your team is mathematically proven to counter the global meta!

## 👥 Meet the Team
* **Steve Aby Tonio**
* **Chinmay Dandekar**
* **Pranav Premchand**

---

## 💻 Tech Stack
* **Frontend:** React, Vite, Framer Motion, PokeAPI
* **Backend:** Python (FastAPI, SSE Streams), Node.js (`@smogon/calc`)
* **Cloud Infrastructure:** Modal (Serverless Cloud Containers)
* **AI Agent Engine:** OpenRouter (LLM Strategist)

---

## 🛠️ Installation & Setup

This project uses a decoupled React Frontend and a Serverless Python Backend. You will need to run both simultaneously to interact with the application locally.

### 1. Clone the Repository
```bash
git clone https://github.com/ChinDandekar/bugcatcherjoey.git
cd bugcatcherjoey
```

### 2. Start the React Frontend
Open your first terminal tab and boot up the UI:
```bash
cd frontend
npm install
npm run dev
```
*(The beautiful glassmorphism dashboard will now be live on `http://localhost:5173`)*

### 3. Start the AI Backend
Open a **second, separate terminal tab** in the root of the project directory.

First, create a basic Python virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

Install the lightweight Python dependencies (including the serverless Modal SDK):
```bash
pip install modal openai requests fastapi sse-starlette uvicorn
```

Before running, you must configure Modal and provide your LLM API Key. Our backend pulls `OPENAI_API_KEY` from Modal's secure secrets vault:
1. Run `modal setup` to authenticate your terminal.
2. Create a Modal Secret named `my-ai-secret` containing your `OPENAI_API_KEY` (we route through OpenRouter for dynamic model switching).

Finally, deploy the live mathematical backend:
```bash
modal serve app.py
```

*(Note: Modal will automatically provision an isolated cloud container, install Node.js, and pull down the heavy `@smogon/calc` JavaScript library behind the scenes! You do not need to install `npm` dependencies in the root folder.)*

## 🎮 How to Play
1. Open the UI on `localhost:5173`.
2. Construct your starter team using the dynamic PokeAPI dropdowns.
3. Click "Initiate Simulation".
4. Watch as the AI rapidly calculates OHKO breakpoints and iteratively refines your roster!
5. Export your optimized team directly to Pokémon Showdown syntax!
