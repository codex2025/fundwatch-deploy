# FundWatch REST API Contract & Specification

Base URL: `http://localhost:8000/api`

---

### 1. `GET /api/stats`
Returns system-wide summary metrics for dashboard KPI cards.

**Response `200 OK`**:
```json
{
  "total_works_analyzed": 1420,
  "total_agencies_monitored": 85,
  "total_disbursed_inr": 1824500000.0,
  "total_anomalies_flagged": 24,
  "high_risk_count": 8,
  "states_covered": ["Punjab", "Odisha", "Maharashtra", "Karnataka", "Uttar Pradesh"]
}
```

---

### 2. `GET /api/anomalies`
Returns ranked list of flagged spending anomalies with filtering.

**Query Parameters**:
- `min_score` (float, optional, default: 40.0)
- `state` (string, optional)
- `month` (string, optional, format: `YYYY-MM`)
- `category` (string, optional)
- `search` (string, optional)

**Response `200 OK`**:
```json
[
  {
    "anomaly_id": "ANOM_AGN_PUN_LUD_001_2023_09",
    "agency_id": "AGN_PUN_LUD_001",
    "agency_name": "Jagatsinghpur Panchayat Samiti",
    "state": "Punjab",
    "district": "Ludhiana",
    "constituency": "Fatehgarh Sahib",
    "year_month": "2023-09",
    "monthly_amount": 8000000.0,
    "historical_median_monthly_inr": 1500000.0,
    "risk_score": 91.2,
    "risk_tier": "Critical",
    "signals": {
      "modified_z_score": 6.1,
      "iqr_ratio": 2.4,
      "velocity_ratio": 5.33,
      "acceleration": 3.85,
      "peer_ratio": 2.8,
      "insufficient_history": false
    },
    "top_contributing_works": [
      {
        "work_id": "WS/RS639/2017/00863",
        "description": "Installation of High-Capacity Tube Wells near Canal Bridge",
        "amount": 3200000.0
      },
      {
        "work_id": "WS/RS639/2017/00871",
        "description": "Emergency Road & Culvert Reconstruction, Sector 4",
        "amount": 2400000.0
      },
      {
        "work_id": "WS/RS639/2017/00879",
        "description": "Multi-purpose Community Center Complex",
        "amount": 2200000.0
      }
    ],
    "pct_of_spike_from_top3": 97.5,
    "primary_flag_reason": "High Velocity Surge (5.3x) & Robust Z-Score Spike (6.1 MAD)"
  }
]
```

---

### 3. `GET /api/agencies`
Returns list of implementing agencies and their latest risk overview.

**Response `200 OK`**:
```json
[
  {
    "agency_id": "AGN_PUN_LUD_001",
    "agency_name": "Jagatsinghpur Panchayat Samiti",
    "state": "Punjab",
    "district": "Ludhiana",
    "total_spend_inr": 28500000.0,
    "active_months_count": 14,
    "latest_risk_score": 91.2,
    "has_anomalies": true
  }
]
```

---

### 4. `GET /api/agencies/{agency_id}`
Returns complete historical monthly panel for an agency, including baseline references.

**Response `200 OK`**:
```json
{
  "agency_id": "AGN_PUN_LUD_001",
  "agency_name": "Jagatsinghpur Panchayat Samiti",
  "state": "Punjab",
  "district": "Ludhiana",
  "constituency": "Fatehgarh Sahib",
  "historical_median": 1500000.0,
  "iqr_upper_fence": 3200000.0,
  "months": [
    {
      "year_month": "2023-01",
      "monthly_amount": 1450000.0,
      "cumulative_amount": 1450000.0,
      "work_count": 2,
      "modified_z_score": 0.1,
      "velocity_ratio": 1.0,
      "risk_score": 12.0,
      "is_flagged": false
    },
    {
      "year_month": "2023-09",
      "monthly_amount": 8000000.0,
      "cumulative_amount": 24500000.0,
      "work_count": 5,
      "modified_z_score": 6.1,
      "velocity_ratio": 5.33,
      "risk_score": 91.2,
      "is_flagged": true
    }
  ]
}
```

---

### 5. `GET /api/agencies/{agency_id}/works?month={year_month}`
Returns granular sanctioned works for an agency during a given month.

**Response `200 OK`**:
```json
[
  {
    "work_id": "WS/RS639/2017/00863",
    "work_name": "Installation of High-Capacity Tube Wells",
    "work_description": "Installation of 10 Tube wells near Canal Bridge Road section",
    "work_category": "Water Supply & Sanitation",
    "sanction_date": "2023-09-14",
    "sanction_amount": 3200000.0,
    "status": "Financial Sanction Approved",
    "has_image_proof": true,
    "mp_name": "Harinder Singh Khalsa"
  }
]
```

---

### 6. `POST /api/investigate/{anomaly_id}`
Generates a grounded, evidence-backed narrative investigation brief.

**Response `200 OK`**:
```json
{
  "anomaly_id": "ANOM_AGN_PUN_LUD_001_2023_09",
  "agency_name": "Jagatsinghpur Panchayat Samiti",
  "headline": "Jagatsinghpur Panchayat Samiti — Risk Score 91.2/100 (Critical Surge)",
  "explanation": "Spending in September 2023 reached ₹80,00,000, 5.33x this agency's typical monthly pace and 6.10 robust standard deviations above its historical median of ₹15,00,000. 97.5% of this disbursement is concentrated in three major works. The agency's spend also exceeded peer agencies in the same state category by 2.80x.",
  "recommended_action": "Conduct an expedited audit of the 3 listed high-value works and verify completion milestone documentation before authorizing subsequent fund releases.",
  "grounded_stats": {
    "historical_median": 1500000.0,
    "this_month_inr": 8000000.0,
    "velocity_ratio": 5.33,
    "modified_z_score": 6.1,
    "pct_of_spike_from_top3": 97.5,
    "peer_ratio": 2.8
  },
  "audit_verified": true,
  "forbidden_words_detected": false
}
```

---

### 7. `GET /api/aliases`
Returns the agency fuzzy-matching audit records (`agency_alias_map.csv`).
