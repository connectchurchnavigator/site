"""
Test suite for Analytics Dashboard API endpoint
Tests: GET /api/analytics/user-dashboard

Coverage:
- Response structure validation (overview, views, unique_views, chart, top_*, button_clicks, listings)
- Scope filter (sitewide vs account)
- Listing ID filter
- Authentication requirement
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://church-explore-test.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "zinxs4@gmail.com"
TEST_PASSWORD = "Rut#vik7"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "Response missing access_token"
    return data["access_token"]


@pytest.fixture(scope="module")
def authenticated_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestAnalyticsDashboardEndpoint:
    """Tests for GET /api/analytics/user-dashboard"""

    def test_dashboard_requires_authentication(self):
        """Test that endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/analytics/user-dashboard")
        assert response.status_code == 403, "Endpoint should require authentication"

    def test_dashboard_sitewide_scope_response_structure(self, authenticated_client):
        """Test sitewide scope returns correct structure with all required keys"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/analytics/user-dashboard",
            params={"scope": "sitewide"}
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        # Verify all required top-level keys
        required_keys = [
            'overview', 'views', 'unique_views', 'chart',
            'top_referrers', 'top_browsers', 'top_devices', 
            'top_countries', 'top_platforms', 'button_clicks', 'listings'
        ]
        for key in required_keys:
            assert key in data, f"Missing required key: {key}"
        
        # Verify overview structure
        overview = data['overview']
        assert 'published' in overview, "overview missing 'published'"
        assert 'pending' in overview, "overview missing 'pending'"
        assert 'promotions' in overview, "overview missing 'promotions'"
        assert 'visits_week' in overview, "overview missing 'visits_week'"
        
        # Verify views structure
        views = data['views']
        assert 'last_24h' in views, "views missing 'last_24h'"
        assert 'last_7d' in views, "views missing 'last_7d'"
        assert 'last_30d' in views, "views missing 'last_30d'"
        
        # Verify unique_views structure
        unique_views = data['unique_views']
        assert 'last_24h' in unique_views, "unique_views missing 'last_24h'"
        assert 'last_7d' in unique_views, "unique_views missing 'last_7d'"
        assert 'last_30d' in unique_views, "unique_views missing 'last_30d'"
        
        # Verify chart structure with all 5 periods
        chart = data['chart']
        chart_periods = ['last_24h', 'last_7d', 'last_30d', 'last_6m', 'last_12m']
        for period in chart_periods:
            assert period in chart, f"chart missing period: {period}"
            assert isinstance(chart[period], list), f"chart[{period}] should be a list"
        
        # Verify top lists are arrays
        assert isinstance(data['top_referrers'], list)
        assert isinstance(data['top_browsers'], list)
        assert isinstance(data['top_devices'], list)
        assert isinstance(data['top_countries'], list)
        assert isinstance(data['top_platforms'], list)
        assert isinstance(data['button_clicks'], list)
        assert isinstance(data['listings'], list)

    def test_dashboard_sitewide_scope_has_listings(self, authenticated_client):
        """Test sitewide scope returns all listings for filter dropdown"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/analytics/user-dashboard",
            params={"scope": "sitewide"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Sitewide should return all listings
        listings = data['listings']
        assert len(listings) > 0, "Sitewide scope should return listings for filter dropdown"
        
        # Each listing should have id, name, type
        for listing in listings:
            assert 'id' in listing, "Listing missing 'id'"
            assert 'name' in listing, "Listing missing 'name'"
            assert 'type' in listing, "Listing missing 'type'"
            assert listing['type'] in ['church', 'pastor'], f"Invalid listing type: {listing['type']}"

    def test_dashboard_account_scope_response(self, authenticated_client):
        """Test account scope returns data for user's own listings"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/analytics/user-dashboard",
            params={"scope": "account"}
        )
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        
        # Verify structure is same as sitewide
        required_keys = [
            'overview', 'views', 'unique_views', 'chart',
            'top_referrers', 'top_browsers', 'top_devices', 
            'top_countries', 'top_platforms', 'button_clicks', 'listings'
        ]
        for key in required_keys:
            assert key in data, f"Missing required key: {key}"
        
        # Account scope should only show user's own listings
        # Since super admin doesn't own listings, this should be empty or limited
        assert isinstance(data['listings'], list)

    def test_dashboard_listing_id_filter(self, authenticated_client):
        """Test filtering by specific listing_id"""
        # First get a listing id
        response = authenticated_client.get(
            f"{BASE_URL}/api/analytics/user-dashboard",
            params={"scope": "sitewide"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data['listings']) > 0:
            listing_id = data['listings'][0]['id']
            
            # Now filter by that listing
            filtered_response = authenticated_client.get(
                f"{BASE_URL}/api/analytics/user-dashboard",
                params={"scope": "sitewide", "listing_id": listing_id}
            )
            
            assert filtered_response.status_code == 200
            filtered_data = filtered_response.json()
            
            # Should still have all required keys
            required_keys = ['overview', 'views', 'unique_views', 'chart', 'listings']
            for key in required_keys:
                assert key in filtered_data, f"Missing key in filtered response: {key}"
            
            # Listings should still return full list for dropdown
            assert isinstance(filtered_data['listings'], list)

    def test_dashboard_overview_counts_numeric(self, authenticated_client):
        """Test that overview counts are numeric values"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/analytics/user-dashboard",
            params={"scope": "sitewide"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        overview = data['overview']
        assert isinstance(overview['published'], int), "published should be int"
        assert isinstance(overview['pending'], int), "pending should be int"
        assert isinstance(overview['promotions'], int), "promotions should be int"
        assert isinstance(overview['visits_week'], int), "visits_week should be int"
        
        # All counts should be non-negative
        assert overview['published'] >= 0
        assert overview['pending'] >= 0
        assert overview['promotions'] >= 0
        assert overview['visits_week'] >= 0

    def test_dashboard_views_counts_numeric(self, authenticated_client):
        """Test that view counts are numeric values"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/analytics/user-dashboard",
            params={"scope": "sitewide"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        views = data['views']
        assert isinstance(views['last_24h'], int)
        assert isinstance(views['last_7d'], int)
        assert isinstance(views['last_30d'], int)
        
        unique_views = data['unique_views']
        assert isinstance(unique_views['last_24h'], int)
        assert isinstance(unique_views['last_7d'], int)
        assert isinstance(unique_views['last_30d'], int)

    def test_dashboard_chart_data_structure(self, authenticated_client):
        """Test chart data points have correct structure"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/analytics/user-dashboard",
            params={"scope": "sitewide"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check each period's chart data
        for period_key, chart_points in data['chart'].items():
            for point in chart_points:
                assert 'date' in point, f"Chart point missing 'date' in {period_key}"
                assert 'views' in point, f"Chart point missing 'views' in {period_key}"
                assert 'unique_views' in point, f"Chart point missing 'unique_views' in {period_key}"

    def test_dashboard_top_lists_structure(self, authenticated_client):
        """Test top lists have correct item structure"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/analytics/user-dashboard",
            params={"scope": "sitewide"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check structure of top lists
        top_lists = ['top_referrers', 'top_browsers', 'top_devices', 'top_countries', 'top_platforms', 'button_clicks']
        for list_name in top_lists:
            for item in data[list_name]:
                assert 'name' in item, f"Item in {list_name} missing 'name'"
                assert 'count' in item, f"Item in {list_name} missing 'count'"
                assert isinstance(item['count'], int), f"Count in {list_name} should be int"

    def test_dashboard_scope_affects_data(self, authenticated_client):
        """Test that scope parameter affects the returned data"""
        # Get sitewide data
        sitewide_response = authenticated_client.get(
            f"{BASE_URL}/api/analytics/user-dashboard",
            params={"scope": "sitewide"}
        )
        assert sitewide_response.status_code == 200
        sitewide_data = sitewide_response.json()
        
        # Get account data
        account_response = authenticated_client.get(
            f"{BASE_URL}/api/analytics/user-dashboard",
            params={"scope": "account"}
        )
        assert account_response.status_code == 200
        account_data = account_response.json()
        
        # Both should have same structure
        assert set(sitewide_data.keys()) == set(account_data.keys())
        
        # Sitewide should generally have more or equal listings than account scope
        assert len(sitewide_data['listings']) >= len(account_data['listings'])


class TestAnalyticsDashboardOldEndpoint:
    """Tests for legacy GET /api/analytics/dashboard/{listing_id} endpoint"""

    def test_legacy_dashboard_requires_auth(self, auth_token):
        """Test legacy endpoint requires authentication"""
        # Get a listing id first
        response = requests.get(
            f"{BASE_URL}/api/analytics/user-dashboard",
            params={"scope": "sitewide"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200 and len(response.json().get('listings', [])) > 0:
            listing_id = response.json()['listings'][0]['id']
            
            # Try without auth
            unauth_response = requests.get(f"{BASE_URL}/api/analytics/dashboard/{listing_id}")
            assert unauth_response.status_code == 403


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
