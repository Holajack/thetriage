"""
App Store Connect Subscription Product Creation Script

Creates subscription group and products in App Store Connect
using the App Store Connect API. Run before setup_revenuecat.py.

Usage:
    python execution/setup_asc_subscriptions.py

Prerequisites:
    - ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH set in .env.local
    - App already exists in App Store Connect (ID: 6756673693)
    - pip install pyjwt cryptography requests
"""

import os
import sys
import time
import jwt
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

KEY_ID = os.getenv("ASC_KEY_ID", "")
ISSUER_ID = os.getenv("ASC_ISSUER_ID", "")
KEY_PATH = os.path.expanduser(os.getenv("ASC_KEY_PATH", ""))
APP_ID = "6756673693"  # HikeWise App Store Connect ID (from eas.json ascAppId)

BASE_URL = "https://api.appstoreconnect.apple.com/v1"

# ============================================
# SUBSCRIPTION DEFINITIONS
# ============================================

SUBSCRIPTION_GROUP_NAME = "HikeWise Plans"

SUBSCRIPTIONS = [
    {
        "product_id": "hikewise_basic_monthly",
        "name": "Basic Monthly",
        "duration": "ONE_MONTH",
        "price_tier": "3",  # ~$2.99
        "display_name": "Basic",
        "description": "Essential focus tools and study tracking",
        "sort_order": 6,
    },
    {
        "product_id": "hikewise_basic_yearly",
        "name": "Basic Yearly",
        "duration": "ONE_YEAR",
        "price_tier": "25",  # ~$23.99
        "display_name": "Basic (Annual)",
        "description": "Essential focus tools - save with annual plan",
        "sort_order": 5,
    },
    {
        "product_id": "hikewise_premium_monthly",
        "name": "Premium Monthly",
        "duration": "ONE_MONTH",
        "price_tier": "15",  # ~$14.99
        "display_name": "Premium",
        "description": "Advanced analytics, all trails, and AI study tools",
        "sort_order": 4,
    },
    {
        "product_id": "hikewise_premium_yearly",
        "name": "Premium Yearly",
        "duration": "ONE_YEAR",
        "price_tier": "108",  # ~$107.99
        "display_name": "Premium (Annual)",
        "description": "Advanced analytics and AI tools - save with annual plan",
        "sort_order": 3,
    },
    {
        "product_id": "hikewise_elite_monthly",
        "name": "Elite Monthly",
        "duration": "ONE_MONTH",
        "price_tier": "30",  # ~$29.99
        "display_name": "Elite",
        "description": "Everything unlocked: Nora AI, all trails, unlimited rooms",
        "sort_order": 2,
    },
    {
        "product_id": "hikewise_elite_yearly",
        "name": "Elite Yearly",
        "duration": "ONE_YEAR",
        "price_tier": "216",  # ~$215.99
        "display_name": "Elite (Annual)",
        "description": "Full access to everything - best value",
        "sort_order": 1,
    },
]


def generate_token():
    """Generate a JWT for App Store Connect API authentication."""
    if not KEY_PATH or not os.path.exists(KEY_PATH):
        print(f"Error: ASC key file not found at: {KEY_PATH}")
        print("Set ASC_KEY_PATH in .env.local to your AuthKey .p8 file path")
        sys.exit(1)

    with open(KEY_PATH, "r") as f:
        private_key = f.read()

    now = int(time.time())
    payload = {
        "iss": ISSUER_ID,
        "iat": now,
        "exp": now + 1200,  # 20 minutes
        "aud": "appstoreconnect-v1",
    }

    token = jwt.encode(payload, private_key, algorithm="ES256", headers={"kid": KEY_ID})
    return token


def get_headers():
    """Get authorization headers."""
    token = generate_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def api_get(path):
    """GET from App Store Connect API."""
    resp = requests.get(f"{BASE_URL}{path}", headers=get_headers())
    if resp.status_code == 200:
        return resp.json()
    print(f"  GET {path}: {resp.status_code} - {resp.text[:200]}")
    return None


def api_post(path, data):
    """POST to App Store Connect API."""
    resp = requests.post(f"{BASE_URL}{path}", headers=get_headers(), json=data)
    if resp.status_code in (200, 201):
        return resp.json()
    print(f"  POST {path}: {resp.status_code} - {resp.text[:300]}")
    return None


def check_config():
    """Validate configuration."""
    errors = []
    if not KEY_ID:
        errors.append("ASC_KEY_ID not set")
    if not ISSUER_ID:
        errors.append("ASC_ISSUER_ID not set")
    if not KEY_PATH or not os.path.exists(KEY_PATH):
        errors.append(f"ASC_KEY_PATH not found: {KEY_PATH}")

    if errors:
        print("Configuration errors:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)


def find_existing_subscription_group():
    """Check if subscription group already exists."""
    result = api_get(f"/apps/{APP_ID}/subscriptionGroups")
    if result and "data" in result:
        for group in result["data"]:
            if group["attributes"]["referenceName"] == SUBSCRIPTION_GROUP_NAME:
                return group["id"]
    return None


def create_subscription_group():
    """Create the subscription group."""
    print("\n=== Subscription Group ===")

    existing_id = find_existing_subscription_group()
    if existing_id:
        print(f"  Already exists: {SUBSCRIPTION_GROUP_NAME} (id: {existing_id})")
        return existing_id

    result = api_post(
        "/subscriptionGroups",
        {
            "data": {
                "type": "subscriptionGroups",
                "attributes": {
                    "referenceName": SUBSCRIPTION_GROUP_NAME,
                },
                "relationships": {
                    "app": {
                        "data": {
                            "type": "apps",
                            "id": APP_ID,
                        }
                    }
                },
            }
        },
    )

    if result:
        group_id = result["data"]["id"]
        print(f"  Created: {SUBSCRIPTION_GROUP_NAME} (id: {group_id})")
        return group_id

    print("  Failed to create subscription group")
    return None


def find_existing_subscriptions(group_id):
    """Get existing subscriptions in the group."""
    result = api_get(f"/subscriptionGroups/{group_id}/subscriptions")
    if result and "data" in result:
        return {s["attributes"]["productId"]: s for s in result["data"]}
    return {}


def create_subscriptions(group_id):
    """Create subscription products."""
    print("\n=== Creating Subscriptions ===")

    existing = find_existing_subscriptions(group_id)

    for sub in SUBSCRIPTIONS:
        pid = sub["product_id"]
        if pid in existing:
            print(f"  Already exists: {pid}")
            continue

        result = api_post(
            "/subscriptions",
            {
                "data": {
                    "type": "subscriptions",
                    "attributes": {
                        "productId": pid,
                        "name": sub["name"],
                        "subscriptionPeriod": sub["duration"],
                        "reviewNote": f"HikeWise {sub['name']} subscription",
                        "familySharable": False,
                    },
                    "relationships": {
                        "group": {
                            "data": {
                                "type": "subscriptionGroups",
                                "id": group_id,
                            }
                        }
                    },
                }
            },
        )

        if result:
            sub_id = result["data"]["id"]
            print(f"  Created: {pid} (id: {sub_id})")

            # Add localization
            api_post(
                "/subscriptionLocalizations",
                {
                    "data": {
                        "type": "subscriptionLocalizations",
                        "attributes": {
                            "locale": "en-US",
                            "name": sub["display_name"],
                            "description": sub["description"],
                        },
                        "relationships": {
                            "subscription": {
                                "data": {
                                    "type": "subscriptions",
                                    "id": sub_id,
                                }
                            }
                        },
                    }
                },
            )
            print("    Added en-US localization")
        else:
            print(f"  Failed to create: {pid}")


def verify_setup(group_id):
    """Print final state."""
    print("\n" + "=" * 50)
    print("VERIFICATION")
    print("=" * 50)

    subs = find_existing_subscriptions(group_id)
    print(f"\nSubscription Group: {SUBSCRIPTION_GROUP_NAME} (id: {group_id})")
    print(f"Subscriptions ({len(subs)}):")
    for pid, sub in subs.items():
        state = sub["attributes"].get("state", "unknown")
        print(f"  - {pid}: {sub['attributes']['name']} [{state}]")

    if len(subs) < len(SUBSCRIPTIONS):
        missing = set(s["product_id"] for s in SUBSCRIPTIONS) - set(subs.keys())
        print(f"\nMissing ({len(missing)}):")
        for m in missing:
            print(f"  - {m}")

    print("\nDone! Products created in App Store Connect.")
    print("\nNEXT STEPS:")
    print("  1. Go to App Store Connect and set pricing for each subscription")
    print(
        "  2. Generate an App-Specific Shared Secret (App Information > Shared Secret)"
    )
    print("  3. Set ASC_SHARED_SECRET in .env.local")
    print("  4. Run: python execution/setup_revenuecat.py")


def main():
    print("App Store Connect Subscription Setup")
    print("=" * 50)

    check_config()

    # Test connection
    print("\nTesting API connection...")
    app = api_get(f"/apps/{APP_ID}")
    if not app:
        print("Failed to connect to App Store Connect API.")
        sys.exit(1)
    app_name = app["data"]["attributes"]["name"]
    print(f"Connected to app: {app_name} (id: {APP_ID})")

    # Create subscription group
    group_id = create_subscription_group()
    if not group_id:
        sys.exit(1)

    # Create subscriptions
    create_subscriptions(group_id)

    # Verify
    verify_setup(group_id)


if __name__ == "__main__":
    main()
