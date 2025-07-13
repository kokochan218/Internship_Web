#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class InternshipAPITester:
    def __init__(self, base_url="https://b2aa1220-62fc-496e-93e8-f586d11d8f59.preview.emergentagent.com"):
        self.base_url = base_url
        self.kaprodi_token = None
        self.student_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, form_data=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        if form_data:
            headers['Content-Type'] = 'application/x-www-form-urlencoded'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if form_data:
                    response = requests.post(url, data=data, headers=headers, timeout=10)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            if success:
                self.log_test(name, True)
                return True, response_data
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response_data}")
                return False, response_data

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test health check endpoint"""
        print("\n🔍 Testing Health Endpoint...")
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_login_endpoints(self):
        """Test login functionality for both user types"""
        print("\n🔍 Testing Login Endpoints...")
        
        # Test Kaprodi login
        success, response = self.run_test(
            "Kaprodi Login",
            "POST",
            "api/login",
            200,
            data={"username": "kaprodi", "password": "kaprodi123"}
        )
        
        if success and 'token' in response:
            self.kaprodi_token = response['token']
            print(f"   Kaprodi token obtained: {self.kaprodi_token[:20]}...")
        
        # Test Student login
        success, response = self.run_test(
            "Student Login",
            "POST",
            "api/login",
            200,
            data={"username": "student1", "password": "student123"}
        )
        
        if success and 'token' in response:
            self.student_token = response['token']
            print(f"   Student token obtained: {self.student_token[:20]}...")
        
        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST",
            "api/login",
            401,
            data={"username": "invalid", "password": "invalid"}
        )
        
        return self.kaprodi_token is not None and self.student_token is not None

    def test_protected_endpoints(self):
        """Test protected endpoints with authentication"""
        print("\n🔍 Testing Protected Endpoints...")
        
        if not self.kaprodi_token or not self.student_token:
            print("❌ Cannot test protected endpoints - missing tokens")
            return False
        
        # Test /api/me endpoint for both users
        self.run_test(
            "Get Kaprodi Profile",
            "GET",
            "api/me",
            200,
            token=self.kaprodi_token
        )
        
        self.run_test(
            "Get Student Profile",
            "GET",
            "api/me",
            200,
            token=self.student_token
        )
        
        # Test unauthorized access
        self.run_test(
            "Unauthorized Access",
            "GET",
            "api/me",
            401
        )
        
        return True

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoints"""
        print("\n🔍 Testing Dashboard Stats...")
        
        # Test Kaprodi dashboard stats
        self.run_test(
            "Kaprodi Dashboard Stats",
            "GET",
            "api/dashboard/stats",
            200,
            token=self.kaprodi_token
        )
        
        # Test Student dashboard stats
        self.run_test(
            "Student Dashboard Stats",
            "GET",
            "api/dashboard/stats",
            200,
            token=self.student_token
        )
        
        return True

    def test_students_management(self):
        """Test students management endpoints (Kaprodi only)"""
        print("\n🔍 Testing Students Management...")
        
        # Test get students (Kaprodi access)
        self.run_test(
            "Get Students (Kaprodi)",
            "GET",
            "api/students",
            200,
            token=self.kaprodi_token
        )
        
        # Test get students (Student access - should fail)
        self.run_test(
            "Get Students (Student - Should Fail)",
            "GET",
            "api/students",
            403,
            token=self.student_token
        )
        
        return True

    def test_internships_management(self):
        """Test internships management endpoints"""
        print("\n🔍 Testing Internships Management...")
        
        # Test get internships (both users should have access)
        self.run_test(
            "Get Internships (Kaprodi)",
            "GET",
            "api/internships",
            200,
            token=self.kaprodi_token
        )
        
        self.run_test(
            "Get Internships (Student)",
            "GET",
            "api/internships",
            200,
            token=self.student_token
        )
        
        return True

    def test_applications_management(self):
        """Test applications management endpoints"""
        print("\n🔍 Testing Applications Management...")
        
        # Test get applications
        self.run_test(
            "Get Applications (Kaprodi)",
            "GET",
            "api/applications",
            200,
            token=self.kaprodi_token
        )
        
        self.run_test(
            "Get Applications (Student)",
            "GET",
            "api/applications",
            200,
            token=self.student_token
        )
        
        return True

    def test_reports_management(self):
        """Test reports management endpoints"""
        print("\n🔍 Testing Reports Management...")
        
        # Test get reports
        self.run_test(
            "Get Reports (Kaprodi)",
            "GET",
            "api/reports",
            200,
            token=self.kaprodi_token
        )
        
        self.run_test(
            "Get Reports (Student)",
            "GET",
            "api/reports",
            200,
            token=self.student_token
        )
        
        return True

    def test_evaluations_management(self):
        """Test evaluations management endpoints"""
        print("\n🔍 Testing Evaluations Management...")
        
        # Test get evaluations
        self.run_test(
            "Get Evaluations (Kaprodi)",
            "GET",
            "api/evaluations",
            200,
            token=self.kaprodi_token
        )
        
        self.run_test(
            "Get Evaluations (Student)",
            "GET",
            "api/evaluations",
            200,
            token=self.student_token
        )
        
        return True

    def test_role_based_access_control(self):
        """Test role-based access control"""
        print("\n🔍 Testing Role-Based Access Control...")
        
        # Test student trying to access Kaprodi-only endpoints
        test_student_data = {
            "username": "test_student",
            "email": "test@student.com",
            "password": "password123",
            "role": "student",
            "full_name": "Test Student",
            "student_id": "1234567890"
        }
        
        self.run_test(
            "Create Student (Student Access - Should Fail)",
            "POST",
            "api/students",
            403,
            data=test_student_data,
            token=self.student_token
        )
        
        return True

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*60}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_run - self.tests_passed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['name']}: {result['details']}")
        
        print(f"{'='*60}")

def main():
    print("🚀 Starting Internship Monitoring System API Tests")
    print("="*60)
    
    tester = InternshipAPITester()
    
    # Run all tests
    try:
        # Basic functionality tests
        tester.test_health_endpoint()
        
        # Authentication tests
        if not tester.test_login_endpoints():
            print("❌ Login tests failed - cannot continue with protected endpoint tests")
            tester.print_summary()
            return 1
        
        # Protected endpoint tests
        tester.test_protected_endpoints()
        tester.test_dashboard_stats()
        
        # Feature-specific tests
        tester.test_students_management()
        tester.test_internships_management()
        tester.test_applications_management()
        tester.test_reports_management()
        tester.test_evaluations_management()
        
        # Security tests
        tester.test_role_based_access_control()
        
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error during testing: {str(e)}")
    
    # Print final summary
    tester.print_summary()
    
    # Return appropriate exit code
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())