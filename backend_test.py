#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class CheckpointHubAPITester:
    def __init__(self, base_url="https://checkpoint-hub-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.tenant_id = None
        self.user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                except:
                    pass
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response text: {response.text[:200]}")

            return success, response.json() if response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API",
            "GET",
            "",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@checkpointhub.com", "password": "admin123"}
        )
        if success:
            self.admin_user = response
            # Store cookies for subsequent requests
            print(f"   Logged in as: {response.get('name')} ({response.get('role')})")
        return success

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200
        )
        return success

    def test_list_tenants(self):
        """Test list tenants endpoint"""
        success, response = self.run_test(
            "List Tenants",
            "GET",
            "admin/tenants",
            200
        )
        return success

    def test_create_tenant(self):
        """Test create tenant"""
        tenant_data = {
            "name": f"Test Tenant {datetime.now().strftime('%H%M%S')}",
            "industry": "auto_detailing",
            "description": "Test tenant for API testing"
        }
        success, response = self.run_test(
            "Create Tenant",
            "POST",
            "admin/tenants",
            200,
            data=tenant_data
        )
        if success:
            self.tenant_id = response.get('tenant_id')
            print(f"   Created tenant: {self.tenant_id}")
        return success

    def test_seed_sample_data(self):
        """Test seeding sample data for tenant"""
        if not self.tenant_id:
            print("❌ No tenant ID available for seeding")
            return False
            
        success, response = self.run_test(
            "Seed Sample Data",
            "POST",
            f"admin/seed-sample-data?tenant_id={self.tenant_id}",
            200
        )
        return success

    def test_list_users(self):
        """Test list all users"""
        success, response = self.run_test(
            "List All Users",
            "GET",
            "admin/users",
            200
        )
        return success

    def test_register_new_user(self):
        """Test user registration"""
        user_data = {
            "email": f"testuser{datetime.now().strftime('%H%M%S')}@test.com",
            "name": "Test User",
            "password": "testpass123"
        }
        success, response = self.run_test(
            "Register New User",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        if success:
            self.user_id = response.get('user_id')
            print(f"   Created user: {self.user_id}")
        return success

    def test_update_user_role(self):
        """Test updating user role"""
        if not self.user_id or not self.tenant_id:
            print("❌ No user ID or tenant ID available for role update")
            return False
            
        success, response = self.run_test(
            "Update User Role",
            "PUT",
            f"admin/users/{self.user_id}/role",
            200,
            data={"role": "technician", "tenant_id": self.tenant_id}
        )
        return success

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

def main():
    print("🚀 Starting CheckpointHub API Tests")
    print("=" * 50)
    
    tester = CheckpointHubAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_endpoint),
        ("Root API", tester.test_root_endpoint),
        ("Admin Login", tester.test_admin_login),
        ("Auth Me", tester.test_auth_me),
        ("Admin Stats", tester.test_admin_stats),
        ("List Tenants", tester.test_list_tenants),
        ("Create Tenant", tester.test_create_tenant),
        ("Seed Sample Data", tester.test_seed_sample_data),
        ("List Users", tester.test_list_users),
        ("Register New User", tester.test_register_new_user),
        ("Update User Role", tester.test_update_user_role),
        ("Logout", tester.test_logout),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())