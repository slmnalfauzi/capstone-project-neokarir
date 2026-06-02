import datetime
import math
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional

router = APIRouter()

DOMAINS = [
    "Cyber Security",
    "Data Analytics",
    "Data Engineering",
    "Data Science & AI",
    "DevOps & Cloud",
    "Product Management",
    "Software Development",
    "UI/UX Design",
    "Web Development"
]

GROWTH_RATES = {
    "Cyber Security": 0.024,
    "Data Analytics": 0.018,
    "Data Engineering": 0.031,
    "Data Science & AI": 0.045,
    "DevOps & Cloud": 0.028,
    "Product Management": 0.012,
    "Software Development": 0.015,
    "UI/UX Design": 0.016,
    "Web Development": 0.011
}

class MonthRecord(BaseModel):
    date: str
    demand: Dict[str, float]

class ForecastReq(BaseModel):
    history: List[MonthRecord]
    n_months: int = 3
    domain: Optional[str] = None

@router.get("/domains")
def get_domains():
    return {
        "status": "success",
        "domains": DOMAINS,
        "total": len(DOMAINS)
    }

@router.post("/forecast")
def forecast(req: ForecastReq):
    if not (1 <= req.n_months <= 12):
        raise HTTPException(status_code=400, detail="n_months harus 1-12")
    if req.domain and req.domain not in DOMAINS:
        raise HTTPException(status_code=400, detail=f"Domain tidak dikenal: {req.domain}")
    if not req.history:
        raise HTTPException(status_code=422, detail="Riwayat data kosong.")

    # Get the last record's demand to use as the base for forward projection
    last_record = req.history[-1]
    
    results = []
    current_demand = {d: float(last_record.demand.get(d, 0.0)) for d in DOMAINS}
    
    for month_idx in range(1, req.n_months + 1):
        month_entry = {}
        for d in DOMAINS:
            rate = GROWTH_RATES[d]
            # Simple compounded growth + small deterministic oscillation for organic chart lines
            oscillation = 1.0 + 0.001 * math.sin(month_idx + len(d))
            projected = current_demand[d] * (1.0 + rate) * oscillation
            
            # Update current demand for next step projection
            current_demand[d] = projected
            month_entry[d] = round(projected, 1)
            
        if req.domain:
            month_entry = {req.domain: month_entry[req.domain]}
            
        results.append(month_entry)
        
    top = max(results[0], key=results[0].get) if not req.domain else req.domain
    
    return {
        "status": "success",
        "n_months": req.n_months,
        "predictions": results,
        "top_domain": top,
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z"
    }
