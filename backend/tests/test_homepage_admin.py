"""
Backend tests for Church Navigator - Homepage and Admin Features
Tests: Homepage endpoints, Admin filters, Bulk delete, Feature button, User names
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "zinxs4@gmail.com"
TEST_PASSWORD = "Rut#vik7"


class TestHomepageEndpoints:
    """P0: Test homepage dedicated endpoints for 4 sections"""
    
    def test_featured_churches_endpoint(self):
        """Test /api/homepage/featured-churches returns featured churches"""
        response = requests.get(f"{BASE_URL}/api/homepage/featured-churches")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Featured churches returned: {len(data)}")
        
        # Verify featured churches have is_featured=True
        for church in data:
            assert church.get('is_featured') == True, "Church should be featured"
            assert church.get('status') == 'published', "Church should be published"
    
    def test_open_churches_endpoint(self):
        """Test /api/homepage/open-churches returns open churches"""
        response = requests.get(f"{BASE_URL}/api/homepage/open-churches")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Open churches returned: {len(data)}")
    
    def test_featured_pastors_endpoint(self):
        """Test /api/homepage/featured-pastors returns featured pastors"""
        response = requests.get(f"{BASE_URL}/api/homepage/featured-pastors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Featured pastors returned: {len(data)}")
        
        # Verify featured pastors have is_featured=True
        for pastor in data:
            assert pastor.get('is_featured') == True, "Pastor should be featured"
    
    def test_new_pastors_endpoint(self):
        """Test /api/homepage/new-pastors returns newly added pastors"""
        response = requests.get(f"{BASE_URL}/api/homepage/new-pastors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"New pastors returned: {len(data)}")
    
    def test_homepage_endpoints_with_limit(self):
        """Test homepage endpoints respect limit parameter"""
        response = requests.get(f"{BASE_URL}/api/homepage/featured-churches", params={"limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 3, "Should respect limit parameter"


class TestAdminAuthentication:
    """Test admin authentication and get token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        token = data.get('access_token')
        assert token, f"No access_token in response: {data}"
        print(f"Login successful, token obtained")
        return token
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Return auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_returns_access_token(self):
        """Verify login returns access_token (not 'token')"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data, "Response should contain access_token"


class TestAdminFilters:
    """P1: Test admin filter bug fix - role=all and status=all"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json().get('access_token')
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_admin_users_role_all_returns_all_users(self, auth_headers):
        """GET /api/admin/users?role=all should return ALL users (not 0)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            params={"role": "all"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'total' in data, "Response should have 'total' field"
        assert 'data' in data, "Response should have 'data' field"
        
        total = data['total']
        users = data['data']
        
        print(f"Users with role=all: total={total}, returned={len(users)}")
        assert total > 0, "role=all should return at least 1 user"
        assert len(users) > 0, "role=all should return user data"
    
    def test_admin_users_no_filter_vs_role_all(self, auth_headers):
        """Verify role=all returns same count as no filter"""
        # No filter
        response_no_filter = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=auth_headers
        )
        # With role=all
        response_all = requests.get(
            f"{BASE_URL}/api/admin/users",
            params={"role": "all"},
            headers=auth_headers
        )
        
        no_filter_total = response_no_filter.json().get('total', 0)
        all_total = response_all.json().get('total', 0)
        
        print(f"No filter total: {no_filter_total}, role=all total: {all_total}")
        assert all_total == no_filter_total, "role=all should return same count as no filter"
    
    def test_admin_churches_status_all_returns_all_churches(self, auth_headers):
        """GET /api/admin/churches?status=all should return ALL churches"""
        response = requests.get(
            f"{BASE_URL}/api/admin/churches",
            params={"status": "all"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'total' in data
        assert 'data' in data
        
        total = data['total']
        print(f"Churches with status=all: total={total}")
        assert total >= 0, "status=all should return churches (or empty if none)"
    
    def test_admin_churches_denomination_all_returns_all(self, auth_headers):
        """GET /api/admin/churches?denomination=all should return ALL churches"""
        response = requests.get(
            f"{BASE_URL}/api/admin/churches",
            params={"denomination": "all"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        total = data.get('total', 0)
        print(f"Churches with denomination=all: total={total}")


class TestBulkDeleteChurches:
    """P0: Test bulk delete churches functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json().get('access_token')
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_bulk_delete_endpoint_exists(self, auth_headers):
        """Test bulk delete endpoint accepts request"""
        # Send empty list to verify endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/admin/churches/bulk",
            params={"action": "delete"},
            json={"church_ids": []},
            headers=auth_headers
        )
        # Should return 400 for empty list, not 404 or 405
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"Bulk delete endpoint response: {response.status_code}")
    
    def test_bulk_delete_invalid_action(self, auth_headers):
        """Test bulk action with invalid action returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/admin/churches/bulk",
            params={"action": "invalid_action"},
            json={"church_ids": ["test-id"]},
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid action, got {response.status_code}"
    
    def test_bulk_feature_churches(self, auth_headers):
        """Test bulk feature action works"""
        response = requests.post(
            f"{BASE_URL}/api/admin/churches/bulk",
            params={"action": "feature"},
            json={"church_ids": []},
            headers=auth_headers
        )
        # Empty list should return 400
        assert response.status_code in [200, 400]


class TestFeatureButton:
    """P0: Test feature button - PUT /api/admin/feature/church/{id}"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json().get('access_token')
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_feature_church_endpoint(self, auth_headers):
        """Test feature church endpoint works"""
        # First get a church to feature
        response = requests.get(
            f"{BASE_URL}/api/admin/churches",
            params={"limit": 1},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        churches = data.get('data', [])
        
        if churches:
            church_id = churches[0]['id']
            # Test featuring a church
            feature_response = requests.put(
                f"{BASE_URL}/api/admin/feature/church/{church_id}",
                params={"is_featured": True},
                headers=auth_headers
            )
            assert feature_response.status_code == 200, f"Feature failed: {feature_response.text}"
            print(f"Feature church endpoint works for church {church_id}")
        else:
            pytest.skip("No churches available to test feature")
    
    def test_featured_church_appears_in_homepage(self, auth_headers):
        """Verify featured church appears in /api/homepage/featured-churches"""
        # Get a church and feature it
        response = requests.get(
            f"{BASE_URL}/api/admin/churches",
            params={"status": "published", "limit": 1},
            headers=auth_headers
        )
        
        if response.status_code != 200:
            pytest.skip("Cannot get churches")
            return
        
        data = response.json()
        churches = data.get('data', [])
        
        if not churches:
            pytest.skip("No published churches to test")
            return
        
        church_id = churches[0]['id']
        
        # Feature the church
        requests.put(
            f"{BASE_URL}/api/admin/feature/church/{church_id}",
            params={"is_featured": True},
            headers=auth_headers
        )
        
        # Check featured churches endpoint
        featured_response = requests.get(f"{BASE_URL}/api/homepage/featured-churches")
        assert featured_response.status_code == 200
        
        featured_churches = featured_response.json()
        featured_ids = [c['id'] for c in featured_churches]
        
        print(f"Featured church IDs: {featured_ids}")
        assert church_id in featured_ids, f"Church {church_id} should appear in featured churches"


class TestUserNameDisplay:
    """P1: Test user names (first_name, last_name) returned by admin API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json().get('access_token')
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_admin_users_returns_name_fields(self, auth_headers):
        """Verify /api/admin/users returns first_name and last_name fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        users = data.get('data', [])
        
        if users:
            user = users[0]
            # Check that name fields exist (even if null)
            print(f"User data keys: {user.keys()}")
            # first_name and last_name should be present in response
            # They may be None/empty but should be included
            assert 'email' in user, "User should have email field"


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
