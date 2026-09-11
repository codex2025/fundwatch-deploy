import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import agencies, anomalies, investigate, dataset, cases, audit, public

app = FastAPI(
    title="FundWatch Intelligence API",
    description="Explainable MPLADS Spending-Anomaly Detection & Grounded Intelligence Service",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers with /api prefix and root aliases
app.include_router(anomalies.router)
app.include_router(agencies.router)
app.include_router(investigate.router)
app.include_router(dataset.router)
app.include_router(cases.router)
app.include_router(audit.router)
app.include_router(public.router)


@app.on_event("startup")
def seed_live_mode_cases():
    """Auto-detect Live Mode cases from the pre-computed anomaly panel on
    boot. Idempotent -- case_engine skips agencies that already have a case."""
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "detector"))
        from case_engine import generate_cases
        import case_store
        new_cases = generate_cases()
        for c in new_cases:
            case_store.write_audit(
                actor_role="system",
                actor_id="risk-engine",
                action="case_auto_detected",
                case_id=c["case_id"],
                detail=(
                    f"Risk score reached {c['trigger']['new_risk_score']:.0f} "
                    f"(baseline violated: {c['trigger']['baseline_violated']}). "
                    "Clarification notice drafted automatically."
                ),
            )
        if new_cases:
            print(f"[live-mode] Seeded {len(new_cases)} new case(s) on startup.")
    except Exception as e:
        print(f"[!] Live Mode case seeding skipped: {e}")


@app.get("/")
def root():
    return {
        "service": "FundWatch Intelligence Engine",
        "status": "operational",
        "version": "2.0.0",
        "problem_statement": "MoSPI Problem Statement 10",
        "features": [
            "4-Dimension Mathematical Risk Scoring (S1, S2, S3, S4)",
            "Dynamic User Dataset Auto-Labelling & Ingestion",
            "Top 5 Investigator Visualizations",
            "Grounded Investigation Copilot"
        ],
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=bool(os.environ.get("RELOAD")))
