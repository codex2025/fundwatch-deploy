import os
import re
import pandas as pd
import numpy as np
from datetime import datetime
from rapidfuzz import fuzz, process

RAW_WORKS_PATH = "data/raw/mplads_works_raw.csv"
RAW_FUND_SUMMARY_PATH = "data/raw/mplads_fund_summary_raw.csv"

OUT_CLEAN_WORKS = "data/processed/clean_works.csv"
OUT_CLEAN_PANEL = "data/processed/clean_agency_month.csv"
OUT_ALIAS_MAP = "data/processed/agency_alias_map.csv"

def parse_date_safe(date_str):
    if not isinstance(date_str, str) or not date_str.strip():
        return None, None
    date_str = date_str.strip()
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y"):
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d"), dt.strftime("%Y-%m")
        except ValueError:
            continue
    return None, None

def normalize_text_basics(text):
    if not isinstance(text, str):
        return ""
    # Replace multiple spaces with single space
    s = re.sub(r'\s+', ' ', text.strip())
    # Expand common abbreviations before fuzzy match
    s_expanded = s
    replacements = {
        r'\bP\.?S\.?\b': 'Panchayat Samiti',
        r'\bE\.?E\.?\b': 'Executive Engineer',
        r'\bM\.?C\.?\b': 'Municipal Corporation',
        r'\bZ\.?P\.?\b': 'Zilla Parishad',
        r'\bOffc\b': 'Office',
        r'\bDiv\b': 'Division',
        r'\bDev\b': 'Development'
    }
    for pat, rep in replacements.items():
        s_expanded = re.sub(pat, rep, s_expanded, flags=re.IGNORECASE)
    return s_expanded

def run_pipeline():
    print("=" * 60)
    print("FUNDWATCH DATA CLEANING & NORMALIZATION PIPELINE")
    print("=" * 60)
    
    # 1. Read Raw Works
    df_raw = pd.read_csv(RAW_WORKS_PATH)
    initial_row_count = len(df_raw)
    print(f"[+] Loaded raw works dataset: {initial_row_count} rows from {RAW_WORKS_PATH}")
    
    # Clean text columns
    for col in ['state', 'district', 'loksabha_constituency', 'mp_name', 'work_name', 'work_description', 'work_category', 'status']:
        if col in df_raw.columns:
            df_raw[col] = df_raw[col].fillna("").astype(str).apply(lambda x: re.sub(r'\s+', ' ', x.strip()).title())
    
    df_raw['implementing_agency_name'] = df_raw['implementing_agency_name'].fillna("Unknown Agency").astype(str)
    
    # 2. Date parsing
    dates_parsed = df_raw['sanction_date'].apply(parse_date_safe)
    df_raw['sanction_date_iso'] = [d[0] for d in dates_parsed]
    df_raw['year_month'] = [d[1] for d in dates_parsed]
    
    # Drop rows where date could not be parsed
    invalid_dates_count = df_raw['sanction_date_iso'].isna().sum()
    if invalid_dates_count > 0:
        print(f"[-] Dropped {invalid_dates_count} rows with unparseable dates")
        df_raw = df_raw.dropna(subset=['sanction_date_iso', 'year_month'])
    
    # 3. Fuzzy match implementing agency names to resolve identity fragmentation
    raw_agencies = sorted(df_raw['implementing_agency_name'].unique())
    print(f"[+] Found {len(raw_agencies)} distinct raw agency string variants")
    
    # Clustering agencies by similarity
    canonical_clusters = [] # list of dicts: {'canonical_name': ..., 'state': ..., 'district': ..., 'variants': [raw_str, ...]}
    alias_map_records = []
    
    # Process agency variants grouped by state and district to avoid cross-region false merges
    for (state, district), group in df_raw.groupby(['state', 'district']):
        unique_in_dist = group['implementing_agency_name'].unique()
        dist_clusters = []
        
        for raw_name in unique_in_dist:
            norm_name = normalize_text_basics(raw_name)
            
            # Try to match against existing cluster in district
            best_match = None
            best_score = 0
            
            for cluster in dist_clusters:
                score = fuzz.token_sort_ratio(norm_name.lower(), cluster['norm_name'].lower())
                if score > best_score:
                    best_score = score
                    best_match = cluster
            
            if best_match and best_score >= 80: # High confidence merge threshold
                best_match['raw_variants'].append(raw_name)
                alias_map_records.append({
                    "raw_agency_name": raw_name,
                    "canonical_name": best_match['canonical_name'],
                    "state": state,
                    "district": district,
                    "match_score": round(best_score, 2),
                    "merge_reason": f"Fuzzy similarity match ({best_score:.1f}%)"
                })
            else:
                # Create new canonical cluster
                clean_title_name = re.sub(r'\s+', ' ', norm_name).title()
                new_cluster = {
                    "canonical_name": clean_title_name,
                    "norm_name": norm_name,
                    "state": state,
                    "district": district,
                    "raw_variants": [raw_name]
                }
                dist_clusters.append(new_cluster)
                alias_map_records.append({
                    "raw_agency_name": raw_name,
                    "canonical_name": clean_title_name,
                    "state": state,
                    "district": district,
                    "match_score": 100.0,
                    "merge_reason": "Canonical cluster root"
                })
        canonical_clusters.extend(dist_clusters)
    
    # Assign canonical IDs (e.g. AGN_PUN_LUD_001)
    agency_to_id = {}
    for idx, cluster in enumerate(canonical_clusters, start=1):
        st_code = cluster['state'][:3].upper()
        dt_code = cluster['district'][:3].upper()
        agency_id = f"AGN_{st_code}_{dt_code}_{idx:03d}"
        cluster['agency_id'] = agency_id
        for variant in cluster['raw_variants']:
            agency_to_id[(cluster['state'], cluster['district'], variant)] = (agency_id, cluster['canonical_name'])
    
    # Map back to alias map
    for record in alias_map_records:
        key = (record['state'], record['district'], record['raw_agency_name'])
        record['canonical_agency_id'] = agency_to_id[key][0]
    
    df_alias_map = pd.DataFrame(alias_map_records)
    df_alias_map = df_alias_map[['raw_agency_name', 'canonical_agency_id', 'canonical_name', 'state', 'district', 'match_score', 'merge_reason']]
    df_alias_map.to_csv(OUT_ALIAS_MAP, index=False)
    print(f"[+] Written {len(df_alias_map)} alias audit records to {OUT_ALIAS_MAP}")
    print(f"[+] Reduced {len(raw_agencies)} raw variants down to {len(canonical_clusters)} canonical agencies")
    
    # 4. Create Clean Works dataset
    df_raw['agency_id'] = df_raw.apply(lambda r: agency_to_id.get((r['state'], r['district'], r['implementing_agency_name']), ("AGN_UNKNOWN", r['implementing_agency_name']))[0], axis=1)
    df_raw['agency_name'] = df_raw.apply(lambda r: agency_to_id.get((r['state'], r['district'], r['implementing_agency_name']), ("AGN_UNKNOWN", r['implementing_agency_name']))[1], axis=1)
    
    # Ensure amount is numeric INR
    df_raw['sanction_amount'] = pd.to_numeric(df_raw['sanction_amount'], errors='coerce').fillna(0).astype(float)
    df_raw['has_image_proof'] = df_raw['image_status'].str.lower().isin(['yes', 'true', '1'])
    
    # Deduplicate works
    dedup_subset = ['work_id'] if 'work_id' in df_raw.columns and df_raw['work_id'].notna().all() else ['agency_id', 'work_name', 'sanction_amount', 'sanction_date_iso']
    df_clean_works = df_raw.drop_duplicates(subset=dedup_subset).copy()
    
    df_clean_works = df_clean_works.rename(columns={
        'sanction_date_iso': 'sanction_date',
        'loksabha_constituency': 'constituency'
    })
    
    clean_works_cols = [
        'work_id', 'agency_id', 'agency_name', 'state', 'district', 'constituency',
        'mp_name', 'house_name', 'work_name', 'work_description', 'work_category',
        'sanction_date', 'year_month', 'sanction_amount', 'status', 'has_image_proof'
    ]
    df_clean_works = df_clean_works[clean_works_cols]
    df_clean_works.to_csv(OUT_CLEAN_WORKS, index=False)
    print(f"[+] Written {len(df_clean_works)} clean granular works to {OUT_CLEAN_WORKS}")
    
    # 5. Aggregate to Agency-Month Panel (clean_agency_month.csv)
    panel_rows = []
    
    # Group by (agency_id, year_month)
    for (agency_id, year_month), group in df_clean_works.groupby(['agency_id', 'year_month']):
        first_row = group.iloc[0]
        monthly_amount = group['sanction_amount'].sum()
        work_count = len(group)
        
        # Most frequent category
        top_cat = group['work_category'].mode().iloc[0] if len(group['work_category'].mode()) > 0 else "General Infrastructure"
        
        panel_rows.append({
            "agency_id": agency_id,
            "agency_name": first_row['agency_name'],
            "state": first_row['state'],
            "district": first_row['district'],
            "constituency": first_row['constituency'],
            "year_month": year_month,
            "monthly_amount": float(monthly_amount),
            "work_count": int(work_count),
            "work_category": top_cat
        })
    
    df_panel = pd.DataFrame(panel_rows)
    # Sort chronologically by agency and year_month
    df_panel = df_panel.sort_values(by=['agency_id', 'year_month']).reset_index(drop=True)
    
    # Compute cumulative_amount running sum per agency
    df_panel['cumulative_amount'] = df_panel.groupby('agency_id')['monthly_amount'].cumsum()
    
    panel_cols = [
        'agency_id', 'agency_name', 'state', 'district', 'constituency',
        'year_month', 'monthly_amount', 'work_count', 'cumulative_amount', 'work_category'
    ]
    df_panel = df_panel[panel_cols]
    df_panel.to_csv(OUT_CLEAN_PANEL, index=False)
    print(f"[+] Written {len(df_panel)} agency-month observations to {OUT_CLEAN_PANEL}")
    
    # Print top agencies by total disbursement
    top_agencies = df_panel.groupby(['agency_name', 'state'])['monthly_amount'].sum().sort_values(ascending=False).head(5)
    print("\n--- TOP 5 AGENCIES BY DISBURSEMENT ---")
    for (name, st), amt in top_agencies.items():
        print(f" * {name} ({st}): Rs. {amt:,.2f} ({amt/10000000:.2f} Cr)")
    print("=" * 60)

if __name__ == "__main__":
    run_pipeline()
