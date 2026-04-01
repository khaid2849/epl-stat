# EPL Stats & FPL Predictions

A full-stack web application combining a **Premier League data dashboard** with an **FPL points prediction engine** powered by machine learning.

## Features

- **League Standings** — Full table with form, zone indicators, and gameweek selector (GW13–38)
- **Fixtures** — Upcoming and past fixtures with Fixture Difficulty Ratings (FDR)
- **Player Browser** — Searchable, filterable player list with stats (xG, xA, ICT, price, ownership)
- **Player Detail** — GW-by-GW points chart, radar chart, injury news, and prediction breakdown
- **Team Detail** — Team stats and squad list
- **FPL Predictions** — ML-powered predicted points for next gameweek per player
- **Best XI Builder** — Optimal 11-player team within a £100M budget
- **FPL API Proxy** — All FPL API calls routed through the backend (CORS bypass)

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python, FastAPI, SQLite, pandas |
| ML | XGBoost, LightGBM, scikit-learn, SHAP |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Data fetching | React Query, Axios |
| Deployment | Docker, Nginx |

## Data Sources

1. **`epl_tables_dataset/`** — Premier League standings per gameweek (CSV, GW13–GW26)
2. **`fpl_dataset/players.csv`** — FPL player season stats (Kaggle)
3. **FPL Official API** — Live fixtures, player histories, dream team, set-piece notes

## Project Structure

```
epl-stat/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── config.py                # Settings and paths
│   ├── database.py              # SQLite schema and connection
│   ├── routers/                 # API route handlers
│   │   ├── teams.py
│   │   ├── players.py
│   │   ├── fixtures.py
│   │   ├── predictions.py
│   │   └── fpl_proxy.py
│   ├── services/
│   │   ├── data_loader.py       # CSV ingestion + FPL API seeding
│   │   ├── fpl_client.py        # Async FPL API client
│   │   ├── team_normalizer.py   # Team name normalization
│   │   └── scheduler.py        # Auto-refresh jobs
│   ├── ml/
│   │   ├── features.py          # Feature engineering (40+ features)
│   │   ├── train.py             # Model training (XGBoost + LightGBM per position)
│   │   ├── predict.py           # Inference + SHAP explanations
│   │   ├── evaluate.py          # MAE, RMSE, Spearman rank metrics
│   │   └── saved_models/        # Serialized .joblib model files
│   ├── data/
│   │   ├── raw/                 # Cached FPL API responses
│   │   └── processed/           # Feature matrix (parquet)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/               # Home, Standings, Fixtures, Players, Predictions, ...
│       ├── components/          # Reusable UI components
│       ├── api/                 # Axios API calls
│       └── types/               # TypeScript interfaces
├── epl_tables_dataset/          # Source CSV files
├── fpl_dataset/                 # Source CSV files
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- pip
- A [Kaggle account](https://www.kaggle.com) (free) for automatic dataset downloads

### 0. Kaggle credentials setup

The backend automatically downloads the latest datasets from Kaggle on first start. To enable this:

1. Go to [kaggle.com](https://www.kaggle.com) → your profile → **Settings** → **API** → **Create New Token**
2. This downloads a `kaggle.json` file. Place it at:
   - **Linux/macOS:** `~/.kaggle/kaggle.json`
   - **Windows:** `C:\Users\<your-username>\.kaggle\kaggle.json`
3. Set file permissions (Linux/macOS only): `chmod 600 ~/.kaggle/kaggle.json`

Alternatively, set environment variables:
```bash
export KAGGLE_USERNAME=your_username
export KAGGLE_KEY=your_api_key
```

> If credentials are not configured, the backend will skip the download and use whatever CSV files are already present locally.

### 1. Backend setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

On first start the backend automatically:
- **Downloads** the latest EPL tables and FPL player datasets from Kaggle
- Seeds the SQLite database from the downloaded CSV files
- Fetches current standings, fixtures, and team data from the FPL API
- Loads ML models if they exist in `ml/saved_models/`

**Manual dataset management:**
```bash
# Download datasets only (without seeding DB)
python -m services.data_loader --download-only

# Force re-download even if files exist (e.g. mid-season refresh)
python -m services.data_loader --force-download

# Seed DB from existing local files without downloading
python -m services.data_loader --no-download
```

### 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

The Vite dev server proxies all `/api` requests to `http://localhost:8000`.

### 3. Train ML models

Before predictions are available, train the models:

```bash
cd backend
python -m ml.train
```

This trains 4 XGBoost + 4 LightGBM models (one per position) using TimeSeriesSplit cross-validation and saves them to `ml/saved_models/`. Training time is ~1–2 minutes.

> **For better rolling features:** first fetch per-player GW history from the FPL API (825 API calls, ~4 minutes):
> ```bash
> python -m services.data_loader --fetch-history
> ```

## API Endpoints

### Standings & Teams
```
GET /api/standings?gw=26          League table at a given gameweek
GET /api/standings/history         Available gameweek numbers
GET /api/teams                     All 20 teams with current stats
GET /api/teams/{team_short}        Team detail + squad
```

### Players
```
GET /api/players?position=MID&min_cost=60&page=1   Filtered, paginated player list
GET /api/players/{id}              Player detail + GW history
GET /api/players/search?q=salah    Name search
```

### Fixtures
```
GET /api/fixtures?gw=27           Fixtures for a gameweek
GET /api/fixtures/current          Current/next GW fixtures
```

### Predictions
```
GET /api/predictions/next-gw       All players with predicted points
GET /api/predictions/player/{id}   Single player prediction + SHAP breakdown
GET /api/predictions/top-picks     Top 3 picks per position
GET /api/predictions/best-xi       Optimal 11 within budget
POST /api/predictions/transfer-suggest   Transfer recommendations for a squad
```

### FPL API Proxy
```
GET /api/fpl/bootstrap             FPL bootstrap-static
GET /api/fpl/fixtures?gw=27        FPL fixtures
GET /api/fpl/player/{id}/history   Player GW history
GET /api/fpl/live/{gw}             Live GW stats
GET /api/fpl/dream-team/{gw}       Dream team
```

## ML Model Details

**Target variable:** FPL points scored in the next gameweek

**Models trained per position (GKP / DEF / MID / FWD):**
- XGBoost Regressor
- LightGBM Regressor
- Ensemble: `0.6 × XGB + 0.4 × LGB`

**Key features (40+):**
- Season-level: form, total_points, ep_next, xG, xA, ICT, selected_by%, price
- Rolling (last 3/5 GWs): avg points, minutes, goals, assists, xG, xA, bonus
- Fixture: FDR difficulty, is_home, is_double_gameweek, opponent conceded avg
- Team: goals per GW, clean sheet rate

**Evaluation metrics:** MAE, RMSE, Spearman rank correlation, Top-N precision

**Confidence score:** `abs(xgb_prediction − lgbm_prediction)` — large disagreement = lower confidence

## Docker

Run everything with one command:

```bash
docker-compose up --build
```

- Backend → `http://localhost:8000`
- Frontend → `http://localhost:80`

## Configuration

Create a `backend/.env` file to override defaults:

```env
DB_PATH=./epl_stat.db
FPL_API_BASE=https://fantasy.premierleague.com/api
```

## Notes

- **FPL API CORS:** The official FPL API blocks browser requests. All FPL calls must go through the FastAPI proxy — never call `fantasy.premierleague.com` directly from the frontend.
- **Team name normalization:** The two CSV datasets use different team name conventions. The backend normalizes both to FPL short names (e.g. "Manchester City" → "Man City") before any database writes.
- **Player photos and crests** are loaded from the Premier League CDN and require an internet connection. Fallback initials are shown if images fail to load.
- **`now_cost`** is stored in tenths of millions (60 = £6.0M) in the database and divided by 10 in all API responses.
