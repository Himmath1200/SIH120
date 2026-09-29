# Baghewala Well-to-Surface Digital Twin

**SIH26120 - Digital Twin for Well-to-Surface Optimization of Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) Operations for Heavy Oil Wells of the Baghewala Field** - working prototype.

> **DEMO / SIMULATION ONLY**
> This application uses synthetic data and simplified physics/ML models for academic and SIH demonstration purposes. Results are not actual Baghewala field measurements and recommendations must not be used for field operation without engineering validation.

## What it does

| Page | Route | Function |
|---|---|---|
| Dashboard | `/dashboard` | Baseline KPIs, alerts, 90-day history, backend status (🟢 API ONLINE / 🟡 DEMO MODE) |
| Well Monitoring | `/well-monitoring` | Viscosity, temperature, rates, loads, fleet table |
| Digital Twin | `/simulation` | One CSS cycle: temperature, viscosity, pressure, production, pump/rod load, SOR, failure risk |
| CSS Optimization | `/css-optimization` | Recommended steam volume, injection pressure, soak time |
| SRP Optimization | `/srp-optimization` | Recommended stroke length, SPM, VFD frequency, pump efficiency, rod load/risk |
| Production | `/production` | ML-predicted oil rate + steam-volume sensitivity |
| Failure Prediction | `/failure-prediction` | Rod floating risk % and LOW/MEDIUM/HIGH |
| Energy & SOR | `/energy` | Steam energy, SOR, energy per m³ of oil, before/after |
| Analytics | `/analytics` | Before/after for the selected well and the whole synthetic fleet |

The UI has animated backdrop, count-up KPIs, a live animated well schematic, a risk gauge and CSV export.

## Architecture

```
GitHub ──► Vercel (frontend/)  ── HTTPS ──►  Render free web service (backend/)
           React + Vite + TS                  FastAPI + numpy + scikit-learn
           Tailwind + Recharts                physics engine + offline-trained RandomForest models (joblib)
              │
              └─ if the API is unreachable → local deterministic engine (DEMO SIMULATION MODE)
```

* **Frontend (`frontend/`)** - React 18, TypeScript, Vite, Tailwind, Recharts. All API calls go through [`src/services/api.ts`](frontend/src/services/api.ts); the base URL comes from `VITE_API_URL`.
* **Backend (`backend/`)** - FastAPI. `app/physics.py` is the deterministic CSS/SRP model, `app/ml.py` loads the models, `app/service.py` holds the logic, `app/main.py` exposes the endpoints (Swagger at `/docs`).
* **ML** - two `RandomForestRegressor` models (production, rod failure risk) trained **offline** on synthetic datasets (`backend/scripts/train_models.py`) and saved with `joblib` in `backend/models/` (~3.7 MB total). Nothing is trained at request time. Datasets (`backend/data/*.csv`, ~4 000 rows each) are synthetic. XGBoost was deliberately not used: it adds a large dependency for no benefit at this data size.
* **Demo / fallback mode** - `frontend/src/engine/` is a TypeScript port of the physics engine (parity-checked against the backend). If the backend is down, slow to wake, or the user clicks **Switch to Demo Mode**, every page keeps working from this engine, is labelled **DEMO SIMULATION MODE**, and results are never presented as API results. The app re-checks the backend every 15 s and can switch back.
* **Database** - none. The app is stateless (synthetic data generated deterministically), so nothing needs persistent storage.

### Why the backend is not on Vercel
Vercel Python functions have a ~250 MB unzipped bundle limit, short execution limits and cold starts. `numpy + scipy + scikit-learn + joblib` is close to that limit, the optimizers run hundreds of simulations per request, and a cold start would re-import all of it in the middle of a live demo. A small always-available web service is the more reliable choice, so the backend runs on **Render (free plan)** while the frontend is on **Vercel**. If Render is asleep or down, the frontend automatically falls back to DEMO SIMULATION MODE.

## API

Base URL = your backend. Interactive docs: `GET /docs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | `{"status":"ok","service":"Baghewala Digital Twin API"}` |
| GET | `/api/wells` | Wells with baseline KPIs |
| GET | `/api/dashboard/{well_id}` | KPIs, alerts, history |
| GET | `/api/wells/{well_id}/history` | Monitoring history |
| POST | `/api/predict/production` | ML oil-rate prediction (+ sensitivity) |
| POST | `/api/predict/failure` | ML rod floating / failure risk |
| POST | `/api/optimize/css` | CSS optimization |
| POST | `/api/optimize/srp` | SRP optimization |
| POST | `/api/optimize/all` | Joint optimization + before/after |
| POST | `/api/simulation/run` | Digital-twin simulation |
| GET | `/api/analytics/fleet` | Before/after for all wells |

## Local development

Backend:
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate      # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload                       # http://localhost:8000/docs
python scripts/smoke_test.py                        # optional: needs `pip install httpx`
python scripts/train_models.py                      # optional: regenerate datasets + models
```

Frontend:
```bash
cd frontend
cp .env.example .env.local        # set VITE_API_URL=http://localhost:8000  (leave empty for demo-only)
npm install
npm run dev                       # http://localhost:5173
npm run build && npm run preview  # production build check
```

## Deployment

Order: **backend first** (you need its URL), then the frontend, then one CORS update.

### 1. Push to GitHub
```bash
git init                      # skip if already a repo
git add .
git commit -m "Prepare Baghewala Digital Twin for deployment"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. Backend - Render (free)
1. https://render.com → sign in with GitHub → **New +** → **Blueprint** → pick this repo (uses [`render.yaml`](render.yaml)). *Or* **New + → Web Service** with:
   * Root Directory: `backend`
   * Runtime: Python 3
   * Build Command: `pip install -r requirements.txt`
   * Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   * Health Check Path: `/api/health`
2. Environment variables:
   * `PYTHON_VERSION` = `3.11.9`
   * `ALLOWED_ORIGINS` = `https://YOUR-PROJECT.vercel.app` (add after step 3; comma-separate multiple origins; no trailing slash)
   * optional `ALLOWED_ORIGIN_REGEX` = `https://YOUR-PROJECT(-[a-z0-9-]+)?\.vercel\.app` to also allow Vercel preview URLs
3. Deploy, then open `https://YOUR_BACKEND_URL/api/health` - expect `{"status":"ok",...}` - and `https://YOUR_BACKEND_URL/docs`.

> **Free-tier note:** Render free services sleep after ~15 min idle and take ~30-60 s to wake. Open `/api/health` a few minutes before presenting (or ping it with a free monitor such as UptimeRobot every 10 min). Even if you forget, the frontend falls back to DEMO SIMULATION MODE and the demo still works.

### 3. Frontend - Vercel
1. https://vercel.com → log in with GitHub → **Add New… → Project** → import the repo.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite (auto-detected)
4. **Build Command:** `npm run build` · **Output Directory:** `dist` · **Install Command:** `npm install`
5. **Environment Variables:** `VITE_API_URL` = `https://YOUR_BACKEND_URL` (replace with the real Render URL, no trailing slash; it is public by design - never put secrets in `VITE_*`).
6. **Deploy**, then open the Vercel URL. `frontend/vercel.json` rewrites all paths to `index.html`, so deep links such as `/simulation` work.
7. Copy the Vercel URL into Render's `ALLOWED_ORIGINS` and let Render redeploy. `VITE_API_URL` is baked in at build time - after changing it, **Redeploy** the Vercel project.

### 4. Verify
The dashboard header must show **🟢 API ONLINE**. If it shows **🟡 DEMO MODE**: check `VITE_API_URL`, that the backend is awake, and that `ALLOWED_ORIGINS` contains the exact Vercel origin (browser console shows a CORS error otherwise).

## Environment variables

| Where | Name | Purpose |
|---|---|---|
| Frontend | `VITE_API_URL` | Public backend base URL. Empty ⇒ demo-only. |
| Backend | `ALLOWED_ORIGINS` | Comma-separated CORS origins. Default: localhost dev origins. |
| Backend | `ALLOWED_ORIGIN_REGEX` | Optional extra CORS origin regex (Vercel previews). |
| Backend | `PORT` | Provided by the host. |

No secrets, API keys, tokens or databases are used anywhere.

## Model notes (honest summary)

* Physics: Arrhenius viscosity(T); steam-heated zone with exponential cooling; inflow ∝ (μ_cold/μ)^0.55; SRP pump capacity, buoyed rod weight, dynamic factor, viscous downstroke drag; sigmoid rod-float/overload risk.
* All well data, datasets and coefficients are **synthetic** and hand-calibrated so trends are plausible; they are not fitted to Baghewala data.
* Improvement figures shown in the UI read e.g. "Prototype simulation indicates a potential production improvement of X% under the modeled scenario". They are model outputs, not field results.

## Repository layout
```
frontend/   React + Vite app (vercel.json, .env.example)
backend/    FastAPI app, models/, data/, scripts/ (train, smoke test, parity check)
render.yaml Render blueprint for the backend
```
