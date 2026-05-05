"""
Test Pastor Creation Flow APIs
Tests: POST /api/pastors (create), PUT /api/pastors/{id} (update), GET /api/pastors (list)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "zinxs4@gmail.com"
TEST_PASSWORD = "Rut#vik7"


@pytest.fixture(scope="module")
def auth_token():
    """Login and get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    # API returns 'access_token' not 'token'
    return data.get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with authentication"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestPastorCreationFlow:
    """Test Pastor 3-step creation flow"""
    
    # Store pastor_id across tests
    pastor_id = None
    
    def test_01_create_pastor_step1_basic_info(self, auth_headers):
        """Step 1: Create pastor with basic identity (name, email, phone)"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Minimum required fields for Step 1
        pastor_data = {
            "name": f"TEST_Pastor_{unique_id}",
            "email": f"test_pastor_{unique_id}@example.com",
            "phone": "+1-555-123-4567",
            "city": "Los Angeles",
            "current_designation": "Senior Pastor",
            "denomination": "Baptist",
            "bible_college": "Seminary University",
            "church_associated_to": "",
            "profile_picture": "",
            "status": "draft"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pastors",
            json=pastor_data,
            headers=auth_headers
        )
        
        # Verify creation
        assert response.status_code == 200, f"Create pastor failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain pastor id"
        assert data["name"] == pastor_data["name"], "Name should match"
        assert data["email"] == pastor_data["email"], "Email should match"
        assert data["phone"] == pastor_data["phone"], "Phone should match"
        assert data["status"] == "draft", "Status should be draft"
        
        # Store for subsequent tests
        TestPastorCreationFlow.pastor_id = data["id"]
        print(f"Created pastor with ID: {TestPastorCreationFlow.pastor_id}")
    
    def test_02_update_pastor_step2_profile_media(self, auth_headers):
        """Step 2: Update pastor with profile & media info"""
        assert TestPastorCreationFlow.pastor_id is not None, "Pastor ID not set from Step 1"
        
        # Step 2 fields: bio, photos, video, contact/social, education, skills, experience, languages, worship, roles
        update_data = {
            "bio": "A dedicated pastor with over 20 years of ministry experience.",
            "cover_image": "",
            "gallery_images": [],
            "video_url": "https://youtube.com/watch?v=test123",
            "locations_serving": ["Los Angeles", "San Diego"],
            "website": "https://pastortest.com",
            "facebook": "https://facebook.com/testpastor",
            "instagram": "https://instagram.com/testpastor",
            "youtube": "https://youtube.com/testpastor",
            "twitter": "",
            "linkedin": "",
            "fax": "",
            "highest_degree": "Master of Divinity",
            "years_in_ministry": 20,
            "skills": ["Preaching", "Counseling"],
            "training": ["Ordination Training", "Leadership Development Training"],
            "certifications": ["Certified Pastoral Counselor"],
            "ministry_experience": ["Youth Ministry", "Worship Ministry"],
            "recognitions": "Pastor of the Year 2020",
            "cities_served": ["New York", "Chicago"],
            "languages_known": ["English", "Spanish"],
            "worship_styles": ["Contemporary", "Traditional"],
            "roles_interested": ["Lead Pastor / Senior Pastor", "Teaching / Bible Study Leader"],
            "passion_areas": ["Youth Empowerment", "Community Outreach"]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pastors/{TestPastorCreationFlow.pastor_id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Verify update
        assert response.status_code == 200, f"Update pastor failed: {response.text}"
        
        data = response.json()
        assert data["bio"] == update_data["bio"], "Bio should be updated"
        assert data["years_in_ministry"] == 20, "Years in ministry should be updated"
        assert "Preaching" in data["skills"], "Skills should contain Preaching"
        print(f"Updated pastor Step 2 data successfully")
    
    def test_03_get_pastor_verify_step2_data(self, auth_headers):
        """Verify Step 2 data was persisted"""
        assert TestPastorCreationFlow.pastor_id is not None, "Pastor ID not set"
        
        response = requests.get(
            f"{BASE_URL}/api/pastors/{TestPastorCreationFlow.pastor_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get pastor failed: {response.text}"
        
        data = response.json()
        assert data["bio"] is not None, "Bio should be set"
        assert data["years_in_ministry"] == 20, "Years in ministry should be 20"
        assert len(data["languages_known"]) > 0, "Languages should be set"
        assert data["status"] == "draft", "Status should still be draft"
        print(f"Verified Step 2 data persisted correctly")
    
    def test_04_publish_pastor_step3(self, auth_headers):
        """Step 3: Publish the pastor profile"""
        assert TestPastorCreationFlow.pastor_id is not None, "Pastor ID not set"
        
        update_data = {
            "status": "published"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pastors/{TestPastorCreationFlow.pastor_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Publish pastor failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "published", "Status should be published"
        print(f"Pastor published successfully")
    
    def test_05_verify_pastor_in_public_list(self, auth_headers):
        """Verify published pastor appears in public listing"""
        # Wait a moment for status update to propagate
        import time
        time.sleep(0.5)
        
        response = requests.get(
            f"{BASE_URL}/api/pastors",
            params={"status": "published"},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get pastors list failed: {response.text}"
        
        data = response.json()
        assert "data" in data, "Response should have data array"
        
        # Find our test pastor
        found = False
        for pastor in data["data"]:
            if pastor["id"] == TestPastorCreationFlow.pastor_id:
                found = True
                assert pastor["status"] == "published"
                break
        
        assert found, f"Published pastor {TestPastorCreationFlow.pastor_id} should be in listing"
        print(f"Pastor found in public listing with published status")
    
    def test_06_verify_pastor_in_admin_list(self, auth_headers):
        """Admin can see the new pastor in /api/admin/pastors"""
        response = requests.get(
            f"{BASE_URL}/api/admin/pastors",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get admin pastors failed: {response.text}"
        
        data = response.json()
        assert "data" in data, "Response should have data array"
        
        # Find our test pastor
        found = False
        for pastor in data["data"]:
            if pastor["id"] == TestPastorCreationFlow.pastor_id:
                found = True
                assert pastor["status"] == "published"
                break
        
        assert found, f"Published pastor {TestPastorCreationFlow.pastor_id} should be in admin listing"
        print(f"Pastor found in admin listing")
    
    def test_07_cleanup_delete_test_pastor(self, auth_headers):
        """Cleanup: Delete the test pastor"""
        if TestPastorCreationFlow.pastor_id is None:
            pytest.skip("No pastor to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/pastors/{TestPastorCreationFlow.pastor_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Delete pastor failed: {response.text}"
        print(f"Test pastor deleted successfully")


class TestPastorCreationValidation:
    """Test validation and edge cases for pastor creation"""
    
    def test_create_pastor_missing_required_fields(self, auth_headers):
        """Should fail when required fields missing"""
        # Missing email and phone
        pastor_data = {
            "name": "Test Pastor",
            "city": "Test City"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pastors",
            json=pastor_data,
            headers=auth_headers
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Should fail with validation error, got {response.status_code}: {response.text}"
        print("Correctly rejected pastor with missing required fields")
    
    def test_create_pastor_without_auth(self):
        """Should fail when not authenticated"""
        pastor_data = {
            "name": "Unauthorized Pastor",
            "email": "unauth@test.com",
            "phone": "+1-555-000-0000",
            "city": "Test City"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pastors",
            json=pastor_data
        )
        
        # Should return 403 (forbidden) or 401 (unauthorized)
        assert response.status_code in [401, 403], f"Should fail without auth, got {response.status_code}"
        print("Correctly rejected unauthenticated pastor creation")
    
    def test_update_nonexistent_pastor(self, auth_headers):
        """Should fail when updating non-existent pastor"""
        fake_id = "non-existent-id-12345"
        
        response = requests.put(
            f"{BASE_URL}/api/pastors/{fake_id}",
            json={"bio": "Test bio"},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Should return 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent pastor")


class TestSaveDraftFunctionality:
    """Test Save Draft button functionality"""
    
    pastor_id = None
    
    def test_01_create_draft_pastor(self, auth_headers):
        """Create a draft pastor for Save Draft testing"""
        unique_id = str(uuid.uuid4())[:8]
        
        pastor_data = {
            "name": f"TEST_Draft_Pastor_{unique_id}",
            "email": f"draft_pastor_{unique_id}@example.com",
            "phone": "+1-555-DRAFT-00",
            "city": "Draft City",
            "status": "draft"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pastors",
            json=pastor_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        TestSaveDraftFunctionality.pastor_id = data["id"]
        print(f"Created draft pastor: {data['id']}")
    
    def test_02_save_draft_updates_data(self, auth_headers):
        """Save Draft should update all form data"""
        assert TestSaveDraftFunctionality.pastor_id is not None
        
        # Full form data save (simulating Save Draft)
        save_data = {
            "name": "TEST_Draft_Pastor_Updated",
            "email": "draft_updated@example.com",
            "phone": "+1-555-DRAFT-00",
            "city": "Updated City",
            "bio": "Updated bio text",
            "years_in_ministry": 15,
            "skills": ["Teaching", "Leadership"],
            "status": "draft"  # Should remain draft
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pastors/{TestSaveDraftFunctionality.pastor_id}",
            json=save_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["bio"] == "Updated bio text"
        assert data["status"] == "draft", "Status should remain draft"
        print("Save draft successfully updated data")
    
    def test_03_cleanup_delete_draft_pastor(self, auth_headers):
        """Cleanup draft pastor"""
        if TestSaveDraftFunctionality.pastor_id:
            requests.delete(
                f"{BASE_URL}/api/pastors/{TestSaveDraftFunctionality.pastor_id}",
                headers=auth_headers
            )
            print("Draft pastor cleaned up")
