"""
services/bill_parser.py — PDF regex extraction with Gemini vision fallback.
Supports multiple Indian DISCOMs.
"""
import pdfplumber
import re
import io
import json
import multiprocessing
from typing import Optional


DISCOM_PATTERNS = {
    'MSEDCL': {
        'total':       r'(?:Grand Total|Total Amount)[^\d]*([\d,]+\.?\d*)',
        'md_recorded': r'Maximum Demand[^\d]*([\d.]+)\s*KVA',
        'md_sanc':     r'(?:Sanctioned|Contract) Demand[^\d]*([\d.]+)',
        'pf':          r'Power Factor[^\d]*([\d.]+)',
        'units':       r'Units Consumed[^\d]*([\d,]+)',
        'peak_units':  r'Peak[^\d]*([\d,]+)\s*[Uu]nits',
        'offpeak':     r'Off.?Peak[^\d]*([\d,]+)\s*[Uu]nits',
        'fsa':         r'FPPPA[^\d]*([\d,]+\.?\d*)',
        'export':      r'Export[^\d]*([\d.]+)\s*[Uu]nits',
    },
    'BESCOM': {
        'total':       r'Net Amount Payable[^\d]*([\d,]+\.?\d*)',
        'md_recorded': r'Maximum Demand[^\d]*([\d.]+)',
        'pf':          r'Power Factor[^\d]*([\d.]+)',
        'units':       r'Total Units[^\d]*([\d,]+)',
        'fsa':         r'(?:FSA|Fuel)[^\d]*([\d,]+\.?\d*)',
    },
    'BSES_RAJDHANI': {
        'total':       r'GRAND TOTAL[^\d]*([\d,]+\.?\d*)',
        'md_recorded': r'Recorded Demand[^\d]*([\d.]+)',
        'pf':          r'P\.?F\.?[^\d]*([\d.]+)',
        'units':       r'Units Consumed[^\d]*([\d,]+)',
    },
    'BSES_YAMUNA': {
        'total':       r'GRAND TOTAL[^\d]*([\d,]+\.?\d*)',
        'md_recorded': r'Recorded Demand[^\d]*([\d.]+)',
        'pf':          r'P\.?F\.?[^\d]*([\d.]+)',
        'units':       r'Units Consumed[^\d]*([\d,]+)',
    },
    'TSSPDCL': {
        'total':       r'Total Amount[^\d]*([\d,]+\.?\d*)',
        'md_recorded': r'Maximum Demand[^\d]*([\d.]+)',
        'pf':          r'PF[^\d]*([\d.]+)',
        'units':       r'Units[^\d]*([\d,]+)',
    },
    'TANGEDCO': {
        'total':       r'Total[^\d]*([\d,]+\.?\d*)',
        'md_recorded': r'Maximum Demand[^\d]*([\d.]+)',
        'units':       r'Units[^\d]*([\d,]+)',
    },
    'CESC': {
        'total':       r'Amount Payable[^\d]*([\d,]+\.?\d*)',
        'md_recorded': r'Maximum Demand[^\d]*([\d.]+)',
        'pf':          r'Power Factor[^\d]*([\d.]+)',
        'units':       r'Units[^\d]*([\d,]+)',
    },
    'DHBVN': {
        'total':       r'Total[^\d]*([\d,]+\.?\d*)',
        'md_recorded': r'Maximum Demand[^\d]*([\d.]+)',
        'units':       r'Units[^\d]*([\d,]+)',
    },
    'TORRENT': {
        'total':       r'NET AMOUNT PAYABLE:[^\d]*([\d,]+\.?\d*)',
        'md_recorded': r'Max\. Demand VA:[^\d]*([\d.]+)',
        'md_sanc':     r'Contract Demand:[^\d]*([\d.]+)',
        'pf':          r'Average PF:[^\d]*([\d.]+)',
        'units':       r'Total Units Consumed:[^\d]*([\d,]+)',
        'peak_units':  r'Peak Hours:[^\d]*([\d,]+)',
        'offpeak':     r'Off-Peak Hours:[^\d]*([\d,]+)',
        'export':      r'Solar Export:[^\d]*([\d,.]+)',
    },
}

CANONICAL_DEFAULTS = {
    'total_bill': None,
    'billing_period_from': None,
    'billing_period_to': None,
    'billing_days': 30,
    'units_consumed_total': None,
    'units_peak_slot': None,
    'units_offpeak_slot': None,
    'md_recorded_kva': None,
    'md_sanctioned_kva': None,
    'md_penalty_billed': 0.0,
    'power_factor': None,
    'pf_penalty_billed': 0.0,
    'energy_charge': None,
    'demand_charge': None,
    'fsa_fac_charge': 0.0,
    'net_metering_export_units': 0.0,
    'net_metering_import_units': 0.0,
    'extraction_method': 'pdf_regex',
    'extraction_confidence': 0.0,
}


def parse_pdf(file_bytes: bytes, discom_code: str) -> dict:
    result = dict(CANONICAL_DEFAULTS)

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = '\n'.join(
                p.extract_text() or '' for p in pdf.pages)
    except Exception as e:
        result['extraction_method'] = 'failed'
        result['error'] = str(e)
        return result

    patterns = DISCOM_PATTERNS.get(
        discom_code.upper(),
        DISCOM_PATTERNS['MSEDCL'])

    hits = 0
    total_fields = len(patterns)

    def extract(pattern, text):
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(',', '')
            try:
                return float(raw), True
            except Exception:
                return None, False
        return None, False

    for field, pattern in patterns.items():
        val, found = extract(pattern, text)
        if found:
            hits += 1
        if field == 'total' and val:
            result['total_bill'] = val
        elif field == 'md_recorded' and val:
            result['md_recorded_kva'] = val
        elif field == 'md_sanc' and val:
            result['md_sanctioned_kva'] = val
        elif field == 'pf' and val:
            if 0.50 <= val <= 1.00:
                result['power_factor'] = val
        elif field == 'units' and val:
            result['units_consumed_total'] = val
        elif field == 'peak_units' and val:
            result['units_peak_slot'] = val
        elif field == 'offpeak' and val:
            result['units_offpeak_slot'] = val
        elif field == 'fsa' and val:
            result['fsa_fac_charge'] = val
        elif field == 'export' and val:
            result['net_metering_export_units'] = val

    confidence = hits / max(total_fields, 1)
    result['extraction_confidence'] = round(confidence, 2)
    result['extraction_method'] = 'pdf_regex'

    if result['total_bill'] and result['demand_charge']:
        result['energy_charge'] = (
            result['total_bill'] -
            (result['demand_charge'] or 0) -
            (result['fsa_fac_charge'] or 0))
    elif result['total_bill'] and not result['energy_charge']:
        result['energy_charge'] = result['total_bill'] * 0.72

    return result


def parse_bill_file(file_bytes: bytes, file_type: str,
                    discom_code: str) -> dict:
    """
    Entry point. PDF -> regex parser.
    Image or low-confidence -> Gemini vision.
    """
    if file_type in ['application/pdf', 'pdf']:
        try:
            result = parse_pdf(file_bytes, discom_code)

            if result.get('extraction_confidence', 0) < 0.60 or result['extraction_method'] == 'failed':
                print(f"Low confidence ({result['extraction_confidence']:.2f})"
                      f", falling back to LLM vision")
                try:
                    from services.llm_service import parse_bill_image
                    vision_res = parse_bill_image(file_bytes)
                    # Merge vision_res into result, prioritizing vision_res for non-None values
                    for key, value in vision_res.items():
                        if value is not None:
                            result[key] = value
                    result['extraction_method'] = 'llm_vision_fallback'
                    result['extraction_confidence'] = max(result.get('extraction_confidence', 0), vision_res.get('extraction_confidence', 0))
                except Exception as e:
                    print(f"LLM vision fallback failed: {e}")
                    # Keep low-confidence result if fallback fails
                    pass
            return result
        except Exception as e:
            print(f"PDF parsing failed: {e}, falling back to LLM vision")
            try:
                from services.llm_service import parse_bill_image
                vision_res = parse_bill_image(file_bytes)
                vision_res['extraction_method'] = 'llm_vision_fallback_on_pdf_fail'
                return vision_res
            except Exception as e_llm:
                print(f"LLM vision fallback also failed: {e_llm}")
                # Return a failed result if both fail
                failed_result = dict(CANONICAL_DEFAULTS)
                failed_result['extraction_method'] = 'failed_all'
                failed_result['error'] = f"PDF parse failed: {e}, LLM fallback failed: {e_llm}"
                return failed_result
    else:
        from services.llm_service import parse_bill_image
        return parse_bill_image(file_bytes)


def parse_batch_parallel(file_list: list) -> list:
    """
    AMD multi-core parallelism -- one AMD CPU core per bill.
    file_list: [(bytes, type, discom_code), ...]
    """
    cores = multiprocessing.cpu_count()
    print(f"Batch parsing {len(file_list)} bills "
          f"on {cores} AMD CPU cores")

    with multiprocessing.Pool(processes=cores) as pool:
        results = pool.starmap(parse_bill_file, file_list)
    return results
