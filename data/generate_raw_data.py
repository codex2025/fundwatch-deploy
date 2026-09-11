import os
import csv
import random
from datetime import datetime, timedelta

os.makedirs('data/raw', exist_ok=True)
os.makedirs('data/processed', exist_ok=True)

# Set random seed for reproducibility
random.seed(42)

# States, Districts, Constituencies, MPs
REGIONS = [
    {
        "state": "Punjab",
        "district": "Ludhiana",
        "constituency": "Fatehgarh Sahib",
        "mp": "Harinder Singh Khalsa",
        "house": "17th Lok Sabha",
        "agencies": [
            "Jagatsinghpur Panchayat Samiti",
            "Executive Engineer PWD Ludhiana",
            "Block Development & Panchayat Officer (BDPO) Khanna",
            "Municipal Corporation Ludhiana",
            "Rural Water Supply & Sanitation Div Ludhiana"
        ]
    },
    {
        "state": "Punjab",
        "district": "Amritsar",
        "constituency": "Amritsar",
        "mp": "Gurjeet Singh Aujla",
        "house": "17th Lok Sabha",
        "agencies": [
            "BDPO Majitha",
            "Municipal Corporation Amritsar",
            "Amritsar Zilla Parishad",
            "Department of Public Health Eng Amritsar"
        ]
    },
    {
        "state": "Odisha",
        "district": "Jagatsinghpur",
        "constituency": "Jagatsinghpur",
        "mp": "Rajashree Mallick",
        "house": "17th Lok Sabha",
        "agencies": [
            "Jagatsinghpur Block Samiti Office",
            "Executive Engineer RWSS Jagatsinghpur",
            "R&B Division Jagatsinghpur",
            "Naugaon Panchayat Samiti",
            "Balikuda Block Development Authority"
        ]
    },
    {
        "state": "Odisha",
        "district": "Cuttack",
        "constituency": "Cuttack",
        "mp": "Bhartruhari Mahtab",
        "house": "17th Lok Sabha",
        "agencies": [
            "Cuttack Municipal Corporation",
            "BDPO Salepur",
            "Executive Engineer Drainage Div Cuttack",
            "Tangi Choudwar Panchayat Samiti"
        ]
    },
    {
        "state": "Maharashtra",
        "district": "Pune",
        "constituency": "Baramati",
        "mp": "Supriya Sule",
        "house": "17th Lok Sabha",
        "agencies": [
            "Pune Zilla Parishad",
            "Baramati Municipal Council",
            "BDPO Daund",
            "Public Works Department Division 2 Pune",
            "Indapur Panchayat Samiti"
        ]
    },
    {
        "state": "Maharashtra",
        "district": "Nagpur",
        "constituency": "Nagpur",
        "mp": "Nitin Gadkari",
        "house": "17th Lok Sabha",
        "agencies": [
            "Nagpur Municipal Corporation",
            "Nagpur Improvement Trust",
            "Zilla Parishad Nagpur Rural",
            "Executive Engineer Rural Electrification Nagpur"
        ]
    },
    {
        "state": "Karnataka",
        "district": "Bangalore Rural",
        "constituency": "Bangalore Rural",
        "mp": "D. K. Suresh",
        "house": "17th Lok Sabha",
        "agencies": [
            "Bangalore Rural Zilla Panchayat",
            "Hosakote Taluk Panchayat",
            "Nelamangala Town Municipal Council",
            "Executive Engineer PWD Bangalore Rural",
            "Kanakapura Taluka Development Board"
        ]
    },
    {
        "state": "Uttar Pradesh",
        "district": "Varanasi",
        "constituency": "Varanasi",
        "mp": "Narendra Modi",
        "house": "17th Lok Sabha",
        "agencies": [
            "Varanasi Development Authority",
            "Municipal Corporation Varanasi (Nagar Nigam)",
            "Zilla Panchayat Varanasi",
            "Executive Engineer Jal Nigam Varanasi",
            "Kashi Kshetra Vikas Parishad"
        ]
    }
]

# Work descriptions template by category
WORK_TEMPLATES = {
    "Roads & Bridges": [
        ("Construction of CC Road from {loc1} to {loc2}", 800000, 2500000),
        ("Emergency Interlock Tile Pavement near {loc1}", 300000, 1200000),
        ("Widening & Culvert Reconstruction at {loc1} Junction", 1500000, 4500000),
        ("Bituminous Road Overhaul between Village {loc1} and Main Highway", 2000000, 6000000)
    ],
    "Water Supply & Sanitation": [
        ("Installation of Solar Powered Submersible Tube Wells at {loc1}", 250000, 850000),
        ("Overhead Drinking Water Reservoir & Distribution Line at {loc1}", 1800000, 5000000),
        ("Community Public Sanitation Block with Bio-Digester at {loc1}", 600000, 1800000),
        ("Desilting and Renovation of Village Water Pond at {loc1}", 400000, 1200000)
    ],
    "Public Infrastructure & Community Halls": [
        ("Construction of Multi-purpose Community Kalyan Mandap at {loc1}", 2500000, 8500000),
        ("Erection of Open Gymnasium and Youth Sports Complex at {loc1}", 800000, 2200000),
        ("Public Library and Reading Room Building at {loc1}", 1200000, 3500000),
        ("High-Mast LED Street Lighting System across 8 junctions in {loc1}", 500000, 1500000)
    ],
    "Health & Education": [
        ("Addition of Two Classrooms and Laboratory Block at Govt High School {loc1}", 1400000, 4000000),
        ("Installation of Medical Oxygen Supply & Diagnostic Unit at PHC {loc1}", 2200000, 6500000),
        ("Procurement of Advance Life Support Ambulance for Sub-district Hospital {loc1}", 1800000, 3200000)
    ]
}

LOCATIONS = [
    "Sector 4", "Main Bazaar", "Canal Bridge", "Gram Panchayat Office",
    "Bus Stand", "Railway Station Road", "Ward 12", "Shiv Mandir Chowk",
    "Primary Health Centre", "Govt School Campus", "Outer Ring Road", "Kalyan Puram"
]

# Agency Name Aliases to simulate real government messiness (casing, abbreviations, typos)
def introduce_agency_noise(name: str) -> str:
    roll = random.random()
    if roll < 0.20:
        return name.upper()
    elif roll < 0.35:
        return name.lower()
    elif roll < 0.50:
        # Abbreviate some keywords
        abbr = name.replace("Panchayat Samiti", "P.S.").replace("Executive Engineer", "EE").replace("Municipal Corporation", "MC").replace("Zilla Parishad", "ZP")
        return abbr
    elif roll < 0.60:
        # Extra spaces
        return name.replace(" ", "  ")
    elif roll < 0.68:
        # Slight typo
        return name.replace("Office", "Offc").replace("Division", "Div").replace("Development", "Dev")
    return name

# Build Months timeline: 2022-01 to 2024-03 (27 months)
MONTHS = []
start_date = datetime(2022, 1, 1)
for i in range(27):
    cur_date = start_date + timedelta(days=30.5 * i)
    MONTHS.append(cur_date.strftime("%Y-%m"))

# Specific Injected High-Risk Spike Profiles
SPIKE_CONFIGS = [
    {
        "region_idx": 0,
        "agency_name": "Jagatsinghpur Panchayat Samiti",
        "month": "2023-09",
        "spike_multiplier": 5.5,
        "extra_large_works": 3
    },
    {
        "region_idx": 2,
        "agency_name": "Naugaon Panchayat Samiti",
        "month": "2023-11",
        "spike_multiplier": 6.2,
        "extra_large_works": 4
    },
    {
        "region_idx": 4,
        "agency_name": "Indapur Panchayat Samiti",
        "month": "2023-08",
        "spike_multiplier": 4.8,
        "extra_large_works": 3
    },
    {
        "region_idx": 6,
        "agency_name": "Hosakote Taluk Panchayat",
        "month": "2023-12",
        "spike_multiplier": 5.1,
        "extra_large_works": 3
    },
    {
        "region_idx": 7,
        "agency_name": "Zilla Panchayat Varanasi",
        "month": "2023-10",
        "spike_multiplier": 4.5,
        "extra_large_works": 4
    },
    {
        "region_idx": 1,
        "agency_name": "BDPO Majitha",
        "month": "2023-07",
        "spike_multiplier": 5.8,
        "extra_large_works": 3
    }
]

# Generate raw works dataset
raw_works = []
work_id_counter = 1000

for region in REGIONS:
    for agency in region["agencies"]:
        # Determine agency behavior profile
        # Some cold start (active in only 1-2 months)
        is_cold_start = random.random() < 0.12
        active_months = random.sample(MONTHS, random.randint(1, 2)) if is_cold_start else [m for m in MONTHS if random.random() > 0.25]
        if not active_months:
            active_months = [MONTHS[0], MONTHS[1]]
        
        # Base monthly typical spend (e.g. 5L to 25L)
        agency_base_spend = random.randint(600000, 2500000)
        
        for ym in active_months:
            # Check if this agency has an injected spike in this month
            spike_match = next((s for s in SPIKE_CONFIGS if s["agency_name"] == agency and s["month"] == ym), None)
            
            if spike_match:
                # Sudden massive surge
                target_spend = int(agency_base_spend * spike_match["spike_multiplier"])
                num_works = spike_match["extra_large_works"]
            else:
                # Normal variation
                variation = random.uniform(0.6, 1.4)
                target_spend = int(agency_base_spend * variation)
                num_works = random.randint(1, 4)
            
            allocated_spend = 0
            for w_idx in range(num_works):
                work_id_counter += 1
                cat = random.choice(list(WORK_TEMPLATES.keys()))
                tpl, min_amt, max_amt = random.choice(WORK_TEMPLATES[cat])
                loc1 = random.choice(LOCATIONS)
                loc2 = random.choice(LOCATIONS)
                work_name = tpl.format(loc1=loc1, loc2=loc2)
                work_desc = f"{work_name}. Approved under MPLADS scheme guidelines. Phase {w_idx+1} execution."
                
                # If last work, allocate remaining balance or proportion
                if w_idx == num_works - 1:
                    amt = max(150000, target_spend - allocated_spend)
                else:
                    amt = random.randint(int(target_spend / num_works * 0.7), int(target_spend / num_works * 1.3))
                    allocated_spend += amt
                
                # Sanction date within that month
                day = random.randint(1, 28)
                y, m = ym.split("-")
                sanction_dt_str = f"{day:02d}-{m}-{y}" # DD-MM-YYYY format
                
                # Introduce noisy agency name
                raw_agency_str = introduce_agency_noise(agency)
                
                # Work ID format like WS/RS639/2017/00863
                w_id = f"WS/{region['constituency'][:3].upper()}{random.randint(100,999)}/{y}/{work_id_counter:05d}"
                
                status = random.choice(["Financial Sanction Approved", "Work Completed", "Administrative Sanction Accorded"])
                has_image = random.choice(["Yes", "No", "Yes", "Yes"])
                
                raw_works.append({
                    "state": region["state"],
                    "district": region["district"],
                    "loksabha_constituency": region["constituency"],
                    "house_name": region["house"],
                    "mp_type": "Lok Sabha MP",
                    "mp_name": region["mp"],
                    "implementing_agency_name": raw_agency_str,
                    "work_id": w_id,
                    "work_name": work_name,
                    "work_description": work_desc,
                    "work_category": cat,
                    "sanction_date": sanction_dt_str,
                    "sanction_amount": amt,
                    "units": "sanction_amount in Rupees",
                    "status": status,
                    "image_status": has_image
                })

# Write raw_works.csv
with open("data/raw/mplads_works_raw.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(raw_works[0].keys()))
    writer.writeheader()
    writer.writerows(raw_works)

print(f"Generated {len(raw_works)} raw works records in data/raw/mplads_works_raw.csv")

# Generate Dataset A: Fund Summary
fund_summaries = []
for region in REGIONS:
    as_on_date = "15-03-2024"
    entitlement_cr = 25.0
    released_cr = 22.5
    sanctioned_cr = 21.8
    expenditure_cr = 18.9
    unspent_cr = 3.6
    
    categories = [
        ("Entitlement of Constituency", entitlement_cr),
        ("Total Funds Released by Government of India", released_cr),
        ("Cumulative amount of works sanctioned by District Authority", sanctioned_cr),
        ("Total Expenditure Incurred", expenditure_cr),
        ("Unspent Amount", unspent_cr)
    ]
    for cat_name, val in categories:
        fund_summaries.append({
            "data_as_on": as_on_date,
            "state": region["state"],
            "house_name": region["house"],
            "mp_name": region["mp"],
            "constituency": region["constituency"],
            "category": cat_name,
            "value": val,
            "unit": "value in Rupees Crores",
            "note": ""
        })

with open("data/raw/mplads_fund_summary_raw.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(fund_summaries[0].keys()))
    writer.writeheader()
    writer.writerows(fund_summaries)

print(f"Generated {len(fund_summaries)} fund summary records in data/raw/mplads_fund_summary_raw.csv")
