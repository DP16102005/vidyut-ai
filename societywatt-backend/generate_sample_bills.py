import os
import sys

try:
    from fpdf import FPDF
except ImportError:
    import subprocess
    print("Installing fpdf...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf"])
    from fpdf import FPDF

# Target directory
output_dir = r"c:\Users\panch\Desktop\AMD\sample_bills"
os.makedirs(output_dir, exist_ok=True)

class AuthenticBillPDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, 'This is a computer-generated bill. Please pay before the due date.', 0, 0, 'C')

class BillPDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, 'Thank you for your prompt payment!', 0, 0, 'C')

def create_bill(filename, total, md_rec, md_sanc, pf, units, peak, offpeak, fpppa):
    pdf = BillPDF()
    pdf.add_page()
    pdf.set_font('Arial', '', 12)
    
    pdf.cell(0, 8, 'Consumer No: 123456789012', 0, 1)
    pdf.cell(0, 8, 'Billing Cycle: SEP-2024', 0, 1)
    pdf.cell(0, 8, 'Tariff Category: HT-VIII B Public Water Works', 0, 1)
    pdf.ln(5)
    
    pdf.cell(0, 8, f'Sanctioned Demand: {md_sanc}', 0, 1)
    pdf.cell(0, 8, f'Maximum Demand: {md_rec} KVA', 0, 1)
    pdf.cell(0, 8, f'Power Factor: {pf}', 0, 1)
    pdf.ln(5)
    
    pdf.cell(0, 8, f'Units Consumed: {units}', 0, 1)
    pdf.cell(0, 8, f'Peak: {peak} Units', 0, 1)
    pdf.cell(0, 8, f'Off-Peak: {offpeak} Units', 0, 1)
    pdf.ln(5)
    
    pdf.cell(0, 8, f'FPPPA: {fpppa}', 0, 1)
    pdf.ln(5)
    
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, f'Grand Total: {total}', 0, 1)
    
    out_path = os.path.join(output_dir, filename)
    pdf.output(out_path, 'F')
    print(f"Generated: {out_path}")

def create_torrent_power_bill(filename, service_no, bill_month, cd, md_va, pf, units, peak_units, export_units, net_payable):
    pdf = AuthenticBillPDF()
    pdf.add_page()
    
    # Header
    pdf.set_font('Arial', 'B', 16)
    pdf.cell(0, 10, 'TORRENT POWER LIMITED, AHMEDABAD', 0, 1, 'C')
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 6, 'BILL OF SUPPLY FOR ELECTRICITY', 0, 1, 'C')
    pdf.ln(5)

    # Details
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 8, 'CONSUMER AND BILL DETAILS', 0, 1)
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 6, f'Consumer Name: Residency CHS Ltd.', 0, 1)
    pdf.cell(0, 6, f'Service No: {service_no}', 0, 1)
    pdf.cell(0, 6, f'Billing Cycle: {bill_month}', 0, 1)
    pdf.cell(0, 6, f'Tariff Category: HT MD Residential', 0, 1)
    pdf.ln(5)

    # Meter
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 8, 'METER & LOAD DETAILS', 0, 1)
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 6, f'Contract Demand: {cd} KVA', 0, 1)
    pdf.cell(0, 6, f'Max. Demand VA: {md_va}', 0, 1)
    pdf.cell(0, 6, f'Average PF: {pf}', 0, 1)
    pdf.cell(0, 6, f'Total Units Consumed: {units}', 0, 1)
    pdf.cell(0, 6, f'Solar Export: {export_units}', 0, 1)
    pdf.ln(5)

    # TOD
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 8, 'ToD (Time of Day) Units Breakup', 0, 1)
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 6, f'Peak Hours: {peak_units}', 0, 1)
    normal = int(units) - int(peak_units) - 5000
    pdf.cell(0, 6, f'Normal Hours: {normal}', 0, 1)
    pdf.cell(0, 6, f'Off-Peak Hours: 5000', 0, 1)
    pdf.ln(5)
    pdf.set_font('Arial', 'B', 16)
    pdf.cell(0, 10, 'TORRENT POWER LIMITED, AHMEDABAD', 0, 1, 'C')
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 6, 'BILL OF SUPPLY FOR ELECTRICITY', 0, 1, 'C')
    pdf.ln(5)

    # Details

    # Calcs
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 8, 'BILL CALCULATION DETAILS', 0, 1)
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 6, f'Fixed / Demand Charges: 50,450.00', 0, 1)
    pdf.cell(0, 6, f'Energy Charges: 1,35,000.00', 0, 1)
    pdf.cell(0, 6, f'ToD Peak Surcharge: 15,000.00', 0, 1)
    pdf.cell(0, 6, f'FPPPA Charges @ 2.80/Unit: 89,600.00', 0, 1)
    pf_pen = '8,400.00' if float(pf) < 0.9 else '0.00'
    pdf.cell(0, 6, f'Power Factor Penalty: {pf_pen}', 0, 1)
    pdf.cell(0, 6, f'Solar Export Credit (Net Metering): -4,800.00', 0, 1)
    pdf.cell(0, 6, f'Electricity Duty: 11,400.00', 0, 1)
    pdf.ln(5)

    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, f'NET AMOUNT PAYABLE: {net_payable}', 0, 1)

    out_path = os.path.join(output_dir, filename)
    pdf.output(out_path, 'F')
    print(f"Generated: {out_path}")

if __name__ == "__main__":
    
    # Highly Authentic Torrent Power Bills
    
    # 1. Torrent Healthy Solar Bill
    create_torrent_power_bill(
        filename="Torrent_Solar_Healthy_Bill_Actual.pdf",
        service_no="9823481023",
        bill_month="OCT-2024",
        cd="300",
        md_va="280.5",
        pf="0.99",
        units="45000",
        peak_units="12000",
        export_units="2400.5",
        net_payable="3,20,400.00"
    )

    # 2. Torrent Anomalous Solar Bill (High Penalty)
    create_torrent_power_bill(
        filename="Torrent_Solar_Anomalous_Bill_Actual.pdf",
        service_no="9823481023",
        bill_month="NOV-2024",
        cd="300",
        md_va="345.0", # Exceeded!
        pf="0.84", # Awful PF
        units="58000",
        peak_units="28000", # Huge Peak
        export_units="600.0", # Low Export
        net_payable="5,15,600.00"
    )

    # 3. MSEDCL Healthy Bill
    create_bill(
        filename="MSEDCL_Healthy_Bill.pdf",
        total="4,50,000",
        md_rec="380.0",
        md_sanc="450",
        pf="0.99",
        units="55000",
        peak="10000",
        offpeak="15000",
        fpppa="12,000.50"
    )

    # 4. MSEDCL Anomalous Bill
    create_bill(
        filename="MSEDCL_Anomalous_Bill.pdf",
        total="6,80,000",
        md_rec="510.5",  # Exceeded MD warning
        md_sanc="450",
        pf="0.82",      # Penalty warning
        units="62000",
        peak="25000",   # Huge peak
        offpeak="8000",
        fpppa="18,000.00"
    )
