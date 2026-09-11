# Frozen Schema Specification — FundWatch Data Pipeline

## 1. Clean Agency-Month Panel (`clean_agency_month.csv`)

| Column | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `agency_id` | string (PK) | Canonical standardized agency ID generated via fuzzy-clustering | `AGN_PUN_LUD_001` |
| `agency_name` | string | Normalized display name (most frequent raw variant) | `Jagatsinghpur Panchayat Samiti` |
| `state` | string | State / Union Territory | `Punjab` |
| `district` | string | District of operation | `Ludhiana` |
| `constituency` | string | Lok Sabha / Rajya Sabha Constituency | `Fatehgarh Sahib` |
| `year_month` | string (YYYY-MM) | Reporting calendar month | `2023-09` |
| `monthly_amount` | float | Total sanctioned amount in Indian Rupees (INR) for this month | `8000000.0` |
| `work_count` | integer | Total distinct works sanctioned in this month | `5` |
| `cumulative_amount`| float | Running cumulative sum of sanctioned funds for this agency up to this month | `24500000.0` |
| `work_category` | string | Primary work category for peer-comparison (e.g. `Sanitation`, `Roads & Bridges`, `Public Infrastructure`) | `Roads & Bridges` |

---

## 2. Clean Granular Works Table (`clean_works.csv`)

| Column | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `work_id` | string (PK) | Canonical work ID or synthetic deterministic hash key | `WS/RS639/2017/00863` |
| `agency_id` | string (FK) | Reference to `clean_agency_month.agency_id` | `AGN_PUN_LUD_001` |
| `agency_name` | string | Display name of the implementing agency | `Jagatsinghpur Panchayat Samiti` |
| `state` | string | State / UT | `Punjab` |
| `district` | string | District | `Ludhiana` |
| `constituency` | string | Constituency | `Fatehgarh Sahib` |
| `mp_name` | string | Member of Parliament recommending/associated | `Harinder Singh Khalsa` |
| `house_name` | string | Lok Sabha term or Rajya Sabha | `17th Lok Sabha` |
| `work_name` | string | Work title / short name | `Installation of High-Capacity Tube Wells` |
| `work_description` | string | Detailed project description | `Installation of 10 Tube wells near Canal Bridge Road section` |
| `work_category` | string | Categorization tag for works | `Water Supply & Sanitation` |
| `sanction_date` | string (YYYY-MM-DD)| Standardized ISO 8601 sanction date | `2023-09-14` |
| `year_month` | string (YYYY-MM) | Sanction year-month key | `2023-09` |
| `sanction_amount` | float | Sanctioned amount in INR | `3200000.0` |
| `status` | string | Stage (e.g. `Financial Sanction Approved`, `Completed`) | `Financial Sanction Approved` |
| `has_image_proof` | boolean | Verification indicator if photo proof was submitted | `true` |

---

## 3. Agency Alias Audit Map (`agency_alias_map.csv`)

| Column | Type | Description |
| :--- | :--- | :--- |
| `raw_agency_name` | string | Raw uncleaned agency string as recorded in government export |
| `canonical_agency_id`| string | Canonical target agency ID |
| `canonical_name` | string | Standardized canonical display name |
| `match_score` | float (0-100)| RapidFuzz token sort ratio similarity score |
| `merge_reason` | string | Rule / rationale for merging (e.g. `Fuzzy similarity > 90%`, `Exact whitespace/casing normalization`) |
