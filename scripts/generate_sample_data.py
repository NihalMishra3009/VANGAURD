import os
import pandas as pd
from datetime import date, timedelta

os.makedirs("data/sample", exist_ok=True)

# 1. Compliant Sample Dataset (CSV)
compliant_rows = [
    {
        "borrower_id": "BW-20001",
        "name": "Rajesh Kumar Sharma",
        "phone": "+91 98765 43210",
        "preferred_language": "Hindi",
        "emi_amount": 14200.00,
        "outstanding_amount": 42600.00,
        "due_date": "2026-11-10",
        "account_number": "LOAN-HOM-109283"
    },
    {
        "borrower_id": "BW-20002",
        "name": "Sunita Sanjay Patil",
        "phone": "9823145678",
        "preferred_language": "Marathi",
        "emi_amount": 8500.00,
        "outstanding_amount": 25500.00,
        "due_date": "2026-11-05",
        "account_number": "LOAN-AUT-882910"
    },
    {
        "borrower_id": "BW-20003",
        "name": "Amitabh S. Roy",
        "phone": "+919900112233",
        "preferred_language": "English",
        "emi_amount": 19000.00,
        "outstanding_amount": 57000.00,
        "due_date": "2026-11-02",
        "account_number": "LOAN-PER-440192"
    },
    {
        "borrower_id": "BW-20004",
        "name": "Pooja V. Raman",
        "phone": "09845012345",
        "preferred_language": "English",
        "emi_amount": 6200.00,
        "outstanding_amount": 18600.00,
        "due_date": "2026-11-12",
        "account_number": "LOAN-ED-772910"
    },
    {
        "borrower_id": "BW-20005",
        "name": "Ganesh Eknath Deshmukh",
        "phone": "9422019283",
        "preferred_language": "Marathi",
        "emi_amount": 11500.00,
        "outstanding_amount": 34500.00,
        "due_date": "2026-11-08",
        "account_number": "LOAN-SME-551029"
    },
    {
        "borrower_id": "BW-20006",
        "name": "Vikramaditya Verma",
        "phone": "+91 97112 23344",
        "preferred_language": "Hindi",
        "emi_amount": 24000.00,
        "outstanding_amount": 72000.00,
        "due_date": "2026-10-28",
        "account_number": "LOAN-HOM-992014"
    },
    {
        "borrower_id": "BW-20007",
        "name": "Deepa Narayanan",
        "phone": "9840192837",
        "preferred_language": "English",
        "emi_amount": 9800.00,
        "outstanding_amount": 29400.00,
        "due_date": "2026-11-14",
        "account_number": "LOAN-GLD-330192"
    },
    {
        "borrower_id": "BW-20008",
        "name": "Manoj Baburao Shinde",
        "phone": "9850123987",
        "preferred_language": "Marathi",
        "emi_amount": 7200.00,
        "outstanding_amount": 21600.00,
        "due_date": "2026-11-07",
        "account_number": "LOAN-AUT-661029"
    }
]

df_compliant = pd.DataFrame(compliant_rows)
df_compliant.to_csv("data/sample/borrowers_sample_compliant.csv", index=False)
print("Created: data/sample/borrowers_sample_compliant.csv (8 records)")

# 2. Dataset with Deliberate Validation Scenarios (Excel .xlsx)
scenario_rows = [
    # Valid records
    {
        "Customer ID": "BW-30001",
        "Borrower Name": "Ramesh Chandra",
        "Mobile Number": "9810012345",
        "Preferred Language": "Hindi",
        "EMI Amount": 15000,
        "Total Outstanding": 45000,
        "Due Date": "2026-11-10",
        "Loan Account": "LOAN-EXP-001"
    },
    {
        "Customer ID": "BW-30002",
        "Borrower Name": "Aarti Dilip Kadam",
        "Mobile Number": "+91 98200 54321",
        "Preferred Language": "Marathi",
        "EMI Amount": 9500,
        "Total Outstanding": 28500,
        "Due Date": "2026-11-04",
        "Loan Account": "LOAN-EXP-002"
    },
    {
        "Customer ID": "BW-30003",
        "Borrower Name": "Siddharth Sen",
        "Mobile Number": "9930011223",
        "Preferred Language": "English",
        "EMI Amount": 22000,
        "Total Outstanding": 66000,
        "Due Date": "2026-10-30",
        "Loan Account": "LOAN-EXP-003"
    },
    # Edge Case: Zero Balance (Ineligible)
    {
        "Customer ID": "BW-30004",
        "Borrower Name": "Kiran Kumar Reddy",
        "Mobile Number": "9849012345",
        "Preferred Language": "English",
        "EMI Amount": 5000,
        "Total Outstanding": 0,
        "Due Date": "2026-11-12",
        "Loan Account": "LOAN-EXP-004"
    },
    # Error 1: Invalid short phone number
    {
        "Customer ID": "BW-30005",
        "Borrower Name": "Defective Phone User",
        "Mobile Number": "12345",
        "Preferred Language": "English",
        "EMI Amount": 4000,
        "Total Outstanding": 12000,
        "Due Date": "2026-11-10",
        "Loan Account": "LOAN-EXP-005"
    },
    # Error 2: Dummy repetitive phone number
    {
        "Customer ID": "BW-30006",
        "Borrower Name": "Dummy Repetitive Phone",
        "Mobile Number": "0000000000",
        "Preferred Language": "Hindi",
        "EMI Amount": 6000,
        "Total Outstanding": 18000,
        "Due Date": "2026-11-08",
        "Loan Account": "LOAN-EXP-006"
    },
    # Error 3: Duplicate Borrower ID within file
    {
        "Customer ID": "BW-30001",
        "Borrower Name": "Duplicate ID Person",
        "Mobile Number": "9819988776",
        "Preferred Language": "Hindi",
        "EMI Amount": 15000,
        "Total Outstanding": 45000,
        "Due Date": "2026-11-10",
        "Loan Account": "LOAN-EXP-007"
    },
    # Error 4: Missing Borrower Name
    {
        "Customer ID": "BW-30007",
        "Borrower Name": "",
        "Mobile Number": "9870011223",
        "Preferred Language": "Marathi",
        "EMI Amount": 8000,
        "Total Outstanding": 24000,
        "Due Date": "2026-11-06",
        "Loan Account": "LOAN-EXP-008"
    }
]

df_scenarios = pd.DataFrame(scenario_rows)
with pd.ExcelWriter("data/sample/borrowers_sample_with_validation_scenarios.xlsx", engine="openpyxl") as writer:
    df_scenarios.to_excel(writer, index=False, sheet_name="Borrowers")

print("Created: data/sample/borrowers_sample_with_validation_scenarios.xlsx (8 records with test scenarios)")
