"""
FinPilot Privacy Shield
-----------------------
Masks Personally Identifiable Information (PII) from any text
before it is sent to an LLM or written to logs.

Masked patterns:
  - Email addresses       →  fi*****@gmail.com
  - Phone numbers         →  +1-***-***-4567
  - Credit/Debit cards    →  ****-****-****-9012
  - Bank account numbers  →  ACC-****1234
  - SSN (US)              →  ***-**-6789
  - IBAN                  →  ****...1234

The image binary sent for OCR is intentionally NOT passed through
this module — only text strings (prompts, logs, metadata) are masked.
"""

import re


# ── Pattern definitions ───────────────────────────────────────────────────────

_PATTERNS = [
    # Email addresses: keep first 2 chars + domain
    (
        re.compile(r'\b([a-zA-Z0-9._%+\-]{1,2})[a-zA-Z0-9._%+\-]*@([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b'),
        lambda m: m.group(1) + '*****@' + m.group(2)
    ),
    # Credit / debit card numbers (groups of 4 digits separated by space/dash)
    (
        re.compile(r'\b(\d{4})[\s\-](\d{4})[\s\-](\d{4})[\s\-](\d{4})\b'),
        lambda m: f'****-****-****-{m.group(4)}'
    ),
    # US SSN  XXX-XX-XXXX
    (
        re.compile(r'\b\d{3}-\d{2}-(\d{4})\b'),
        lambda m: f'***-**-{m.group(1)}'
    ),
    # US Phone  +1-555-123-4567 or (555) 123-4567 or 555-123-4567
    (
        re.compile(r'(\+?1[\s\-]?)?\(?\d{3}\)?[\s\-]\d{3}[\s\-](\d{4})\b'),
        lambda m: '***-***-' + m.group(2)
    ),
    # IBAN  (2 letters + up to 32 alphanumeric)
    (
        re.compile(r'\b([A-Z]{2}\d{2})[A-Z0-9]{8,28}([A-Z0-9]{4})\b'),
        lambda m: m.group(1) + '****' + m.group(2)
    ),
    # Generic bank account number (8–18 consecutive digits)
    (
        re.compile(r'\b(\d{4,6})\d{4,12}(\d{4})\b'),
        lambda m: m.group(1) + '****' + m.group(2)
    ),
]


# ── Public API ────────────────────────────────────────────────────────────────

def mask(text: str) -> str:
    """
    Apply all PII masking rules to *text* and return the sanitised string.
    Safe to call with None or non-string values — returns them unchanged.
    """
    if not isinstance(text, str) or not text:
        return text

    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)

    return text


def mask_dict(data: dict, fields: list = None) -> dict:
    """
    Return a copy of *data* with PII masked in every string value.
    If *fields* is provided, only those keys are masked.
    """
    if not isinstance(data, dict):
        return data

    masked = {}
    for key, value in data.items():
        if fields is None or key in fields:
            masked[key] = mask(value) if isinstance(value, str) else value
        else:
            masked[key] = value
    return masked


def safe_log(label: str, text: str) -> str:
    """
    Returns a masked version of *text* suitable for console logging.
    Usage:  print(safe_log("Processing email from", sender))
    """
    return f"{label}: {mask(text)}"


# ── Self-test (run: python privacy.py) ───────────────────────────────────────

if __name__ == '__main__':
    samples = [
        "Invoice from john.doe@acmecorp.com for account 1234567890123456",
        "Card: 4532-1234-5678-9012, SSN: 123-45-6789",
        "Call us at +1-800-555-9876 or (415) 867-5309",
        "IBAN: GB29NWBK60161331926819",
        "Bank account: 00123456789012",
    ]
    print("=== FinPilot Privacy Shield — Masking Test ===\n")
    for s in samples:
        print(f"  Original : {s}")
        print(f"  Masked   : {mask(s)}\n")
