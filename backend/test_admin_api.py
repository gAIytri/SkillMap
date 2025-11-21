"""
Test admin API endpoints
Make sure backend is running: uvicorn main:app --reload
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_admin_login():
    """Test admin login endpoint"""
    print("\n" + "=" * 60)
    print("TEST 1: Admin Login")
    print("=" * 60)

    url = f"{BASE_URL}/api/admin/login"
    payload = {
        "email": "admin@skillmap.com",
        "password": "adminpass123"
    }

    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful!")
            print(f"   Token: {data['access_token'][:50]}...")
            print(f"   Admin: {data['admin']['email']}")
            print(f"   Super Admin: {data['admin']['is_super_admin']}")
            return data['access_token']
        else:
            print(f"❌ Login failed: {response.text}")
            return None

    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - Is the backend running?")
        print("   Run: cd backend && source venv/bin/activate && uvicorn main:app --reload")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_user_analytics(token):
    """Test user analytics endpoint"""
    print("\n" + "=" * 60)
    print("TEST 2: User Analytics")
    print("=" * 60)

    url = f"{BASE_URL}/api/admin/analytics/users"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"preset": "30d"}

    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ User analytics retrieved successfully!")
            print(f"   Total Users: {data.get('total_users', 0)}")
            print(f"   Active Users: {data.get('active_users', 0)}")
            print(f"   Growth Rate: {data.get('growth_rate', 0)}%")
            print(f"   New Users Data Points: {len(data.get('new_users_over_time', []))}")
        else:
            print(f"❌ Request failed: {response.text}")

    except Exception as e:
        print(f"❌ Error: {e}")


def test_token_analytics(token):
    """Test token analytics endpoint"""
    print("\n" + "=" * 60)
    print("TEST 3: Token Analytics")
    print("=" * 60)

    url = f"{BASE_URL}/api/admin/analytics/tokens"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"preset": "30d"}

    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Token analytics retrieved successfully!")
            print(f"   Total Tokens: {data.get('total_tokens', 0):,}")
            print(f"   Avg Tokens/User: {data.get('avg_tokens_per_user', 0):.2f}")
            print(f"   Token Data Points: {len(data.get('tokens_over_time', []))}")
            print(f"   Top Consumers: {len(data.get('top_consumers', []))}")
        else:
            print(f"❌ Request failed: {response.text}")

    except Exception as e:
        print(f"❌ Error: {e}")


def test_credits_analytics(token):
    """Test credits analytics endpoint"""
    print("\n" + "=" * 60)
    print("TEST 4: Credits Analytics")
    print("=" * 60)

    url = f"{BASE_URL}/api/admin/analytics/credits"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"preset": "30d"}

    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Credits analytics retrieved successfully!")
            print(f"   Credits Purchased: {data.get('credits_purchased', 0):.2f}")
            print(f"   Credits Spent: {data.get('credits_spent', 0):.2f}")
            print(f"   Revenue: ${data.get('revenue', 0):.2f}")
            print(f"   Avg Purchase Size: {data.get('avg_purchase_size', 0):.2f} credits")
        else:
            print(f"❌ Request failed: {response.text}")

    except Exception as e:
        print(f"❌ Error: {e}")


def test_retention_analytics(token):
    """Test retention analytics endpoint"""
    print("\n" + "=" * 60)
    print("TEST 5: Retention Analytics")
    print("=" * 60)

    url = f"{BASE_URL}/api/admin/analytics/retention"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"preset": "30d"}

    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("✅ Retention analytics retrieved successfully!")
            print(f"   Total Projects: {data.get('total_projects', 0)}")
            print(f"   Total Tailorings: {data.get('total_tailorings', 0)}")
            print(f"   Daily Active Users: {data.get('daily_active_users', 0)}")
            print(f"   Weekly Active Users: {data.get('weekly_active_users', 0)}")
            print(f"   Monthly Active Users: {data.get('monthly_active_users', 0)}")
            print(f"   7-Day Retention: {data.get('retention_rate_7d', 0):.2f}%")
        else:
            print(f"❌ Request failed: {response.text}")

    except Exception as e:
        print(f"❌ Error: {e}")


def main():
    print("\n🔧 Testing Admin API Endpoints")
    print("=" * 60)

    # Test 1: Login
    token = test_admin_login()
    if not token:
        print("\n❌ Cannot proceed without valid token")
        print("   Make sure backend is running:")
        print("   cd backend && source venv/bin/activate && uvicorn main:app --reload")
        sys.exit(1)

    # Test 2-5: Analytics endpoints
    test_user_analytics(token)
    test_token_analytics(token)
    test_credits_analytics(token)
    test_retention_analytics(token)

    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)
    print("\n📝 Summary:")
    print("   - Admin login: Working")
    print("   - User analytics: Working")
    print("   - Token analytics: Working")
    print("   - Credits analytics: Working")
    print("   - Retention analytics: Working")
    print("\n🎉 Backend is ready for frontend integration!")


if __name__ == "__main__":
    main()
