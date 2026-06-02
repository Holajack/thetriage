"""
RevenueCat Dashboard Configuration Script

Sets up products, entitlements, offerings, and packages in RevenueCat
using their REST API v2. Run after filling in .env.local with your keys.

Usage:
    python execution/setup_revenuecat.py

Prerequisites:
    - REVENUECAT_SECRET_KEY set in .env.local
    - REVENUECAT_PROJECT_ID set in .env.local
    - REVENUECAT_APP_ID set in .env.local
    - Products already created in App Store Connect (run setup_asc_subscriptions.py first)
"""

import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path, override=True)

SECRET_KEY = os.getenv("REVENUECAT_SECRET_KEY", "")
PROJECT_ID = os.getenv("REVENUECAT_PROJECT_ID", "")
APP_ID = os.getenv("REVENUECAT_APP_ID", "")

BASE_URL = "https://api.revenuecat.com/v2"

HEADERS = {
    "Authorization": f"Bearer {SECRET_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

# ============================================
# PRODUCT DEFINITIONS
# ============================================

PRODUCTS = [
    {
        "store_identifier": "hikewise_basic_monthly",
        "display_name": "Basic Monthly",
        "app_id": APP_ID,
    },
    {
        "store_identifier": "hikewise_basic_yearly",
        "display_name": "Basic Yearly",
        "app_id": APP_ID,
    },
    {
        "store_identifier": "hikewise_premium_monthly",
        "display_name": "Premium Monthly",
        "app_id": APP_ID,
    },
    {
        "store_identifier": "hikewise_premium_yearly",
        "display_name": "Premium Yearly",
        "app_id": APP_ID,
    },
    {
        "store_identifier": "hikewise_elite_monthly",
        "display_name": "Elite Monthly",
        "app_id": APP_ID,
    },
    {
        "store_identifier": "hikewise_elite_yearly",
        "display_name": "Elite Yearly",
        "app_id": APP_ID,
    },
]

# Entitlement -> product mapping
ENTITLEMENTS = {
    "basic": {
        "display_name": "Basic",
        "products": ["hikewise_basic_monthly", "hikewise_basic_yearly"],
    },
    "premium": {
        "display_name": "Premium",
        "products": ["hikewise_premium_monthly", "hikewise_premium_yearly"],
    },
    "elite": {
        "display_name": "Elite",
        "products": ["hikewise_elite_monthly", "hikewise_elite_yearly"],
    },
}

# Offering packages
PACKAGES = [
    {
        "identifier": "$rc_monthly",
        "display_name": "Basic Monthly",
        "product_id": "hikewise_basic_monthly",
    },
    {
        "identifier": "$rc_annual",
        "display_name": "Basic Yearly",
        "product_id": "hikewise_basic_yearly",
    },
    {
        "identifier": "premium_monthly",
        "display_name": "Premium Monthly",
        "product_id": "hikewise_premium_monthly",
    },
    {
        "identifier": "premium_annual",
        "display_name": "Premium Yearly",
        "product_id": "hikewise_premium_yearly",
    },
    {
        "identifier": "elite_monthly",
        "display_name": "Elite Monthly",
        "product_id": "hikewise_elite_monthly",
    },
    {
        "identifier": "elite_annual",
        "display_name": "Elite Yearly",
        "product_id": "hikewise_elite_yearly",
    },
]


def check_config():
    """Validate configuration before proceeding."""
    errors = []
    if not SECRET_KEY or SECRET_KEY.startswith("PASTE"):
        errors.append("REVENUECAT_SECRET_KEY not set in .env.local")
    if not PROJECT_ID or PROJECT_ID.startswith("PASTE"):
        errors.append("REVENUECAT_PROJECT_ID not set in .env.local")
    if not APP_ID or APP_ID.startswith("PASTE"):
        errors.append("REVENUECAT_APP_ID not set in .env.local")

    if errors:
        print("Configuration errors:")
        for e in errors:
            print(f"  - {e}")
        print(
            "\nFill in your .env.local file first. See comments in that file for where to find each value."
        )
        sys.exit(1)


def api_get(path):
    """GET request to RevenueCat API."""
    resp = requests.get(f"{BASE_URL}{path}", headers=HEADERS)
    if resp.status_code == 200:
        return resp.json()
    return None


def api_post(path, data):
    """POST request to RevenueCat API."""
    resp = requests.post(f"{BASE_URL}{path}", headers=HEADERS, json=data)
    if resp.status_code in (200, 201):
        print(f"  Created: {path}")
        return resp.json()
    else:
        print(f"  Error {resp.status_code} on {path}: {resp.text[:200]}")
        return None


def list_existing_products():
    """Get all existing products in the project."""
    result = api_get(f"/projects/{PROJECT_ID}/products")
    if result and "items" in result:
        return {p["store_identifier"]: p for p in result["items"]}
    return {}


def list_existing_entitlements():
    """Get all existing entitlements in the project."""
    result = api_get(f"/projects/{PROJECT_ID}/entitlements")
    if result and "items" in result:
        return {e["lookup_key"]: e for e in result["items"]}
    return {}


def list_existing_offerings():
    """Get all existing offerings in the project."""
    result = api_get(f"/projects/{PROJECT_ID}/offerings")
    if result and "items" in result:
        return {o["lookup_key"]: o for o in result["items"]}
    return {}


def setup_products():
    """Create products in RevenueCat (must match App Store Connect product IDs)."""
    print("\n=== Setting up Products ===")
    existing = list_existing_products()

    created = 0
    for product in PRODUCTS:
        sid = product["store_identifier"]
        if sid in existing:
            print(f"  Already exists: {sid}")
            continue

        result = api_post(
            f"/projects/{PROJECT_ID}/products",
            {
                "store_identifier": sid,
                "app_id": APP_ID,
                "display_name": product["display_name"],
                "type": "subscription",
            },
        )
        if result:
            created += 1

    print(f"  Products: {created} created, {len(PRODUCTS) - created} already existed")
    return list_existing_products()


def setup_entitlements(products_map):
    """Create entitlements and attach products."""
    print("\n=== Setting up Entitlements ===")
    existing = list_existing_entitlements()

    for lookup_key, config in ENTITLEMENTS.items():
        if lookup_key in existing:
            ent = existing[lookup_key]
            print(f"  Already exists: {lookup_key} (id: {ent['id']})")
        else:
            result = api_post(
                f"/projects/{PROJECT_ID}/entitlements",
                {
                    "lookup_key": lookup_key,
                    "display_name": config["display_name"],
                },
            )
            if result:
                ent = result
            else:
                continue

        # Attach products to this entitlement
        ent_id = ent["id"]
        for product_sid in config["products"]:
            if product_sid in products_map:
                product_id = products_map[product_sid]["id"]
                attach_result = api_post(
                    f"/projects/{PROJECT_ID}/entitlements/{ent_id}/products",
                    {"product_id": product_id},
                )
                if attach_result:
                    print(f"    Attached {product_sid} -> {lookup_key}")

    return list_existing_entitlements()


def setup_offerings(products_map):
    """Create the default offering with all packages."""
    print("\n=== Setting up Offerings ===")
    existing = list_existing_offerings()

    if "default" in existing:
        offering = existing["default"]
        print(f"  Default offering already exists (id: {offering['id']})")
    else:
        result = api_post(
            f"/projects/{PROJECT_ID}/offerings",
            {
                "lookup_key": "default",
                "display_name": "Default",
                "is_current": True,
            },
        )
        if not result:
            print("  Failed to create default offering")
            return
        offering = result

    offering_id = offering["id"]

    # Create packages within the offering
    print("\n=== Setting up Packages ===")
    for pkg in PACKAGES:
        product_sid = pkg["product_id"]
        if product_sid not in products_map:
            print(f"  Skipping {pkg['identifier']} - product {product_sid} not found")
            continue

        product_id = products_map[product_sid]["id"]
        api_post(
            f"/projects/{PROJECT_ID}/offerings/{offering_id}/packages",
            {
                "lookup_key": pkg["identifier"],
                "display_name": pkg["display_name"],
                "product_id": product_id,
            },
        )


def verify_setup():
    """Print final state for verification."""
    print("\n" + "=" * 50)
    print("VERIFICATION")
    print("=" * 50)

    products = list_existing_products()
    entitlements = list_existing_entitlements()
    offerings = list_existing_offerings()

    print(f"\nProducts ({len(products)}):")
    for sid, p in products.items():
        print(f"  - {sid} (id: {p['id']})")

    print(f"\nEntitlements ({len(entitlements)}):")
    for key, e in entitlements.items():
        print(f"  - {key}: {e['display_name']} (id: {e['id']})")

    print(f"\nOfferings ({len(offerings)}):")
    for key, o in offerings.items():
        current = " [CURRENT]" if o.get("is_current") else ""
        print(f"  - {key}: {o['display_name']}{current} (id: {o['id']})")

    print("\nDone! RevenueCat is configured.")
    print(
        "Next: Run setup_asc_subscriptions.py to create products in App Store Connect."
    )


def main():
    print("RevenueCat Dashboard Configuration")
    print("=" * 50)

    check_config()

    # Test API connection by listing projects
    print("\nTesting API connection...")
    test = api_get("/projects")
    if not test or "items" not in test:
        print("Failed to connect to RevenueCat API. Check your SECRET_KEY.")
        sys.exit(1)
    project_names = [p["name"] for p in test["items"]]
    project_match = next((p for p in test["items"] if p["id"] == PROJECT_ID), None)
    if not project_match:
        print(f"Project ID {PROJECT_ID} not found. Available: {project_names}")
        sys.exit(1)
    print(f"Connected to project: {project_match['name']} ({PROJECT_ID})")

    # Run setup
    products_map = setup_products()
    setup_entitlements(products_map)
    setup_offerings(products_map)
    verify_setup()


if __name__ == "__main__":
    main()
