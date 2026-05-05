"""
Test File Upload API Endpoints
- POST /api/upload - Single file upload
- POST /api/upload/multiple - Multiple files upload
- DELETE /api/upload - File deletion
- Static file serving at /uploads/*
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "zinxs4@gmail.com"
TEST_PASSWORD = "Rut#vik7"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for super admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestAuthEndpoint:
    """Test authentication works before upload tests"""
    
    def test_login_success(self):
        """Verify login works with super admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestSingleFileUpload:
    """Test POST /api/upload - Single file upload"""
    
    def test_upload_image_success(self, auth_headers):
        """Upload a single image file"""
        # Create a test image file (1x1 PNG)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test_image.png', io.BytesIO(png_data), 'image/png')}
        data = {'category': 'logo'}
        
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()
        
        # Validate response structure
        assert "url" in result
        assert "filename" in result
        assert "size" in result
        assert "category" in result
        assert "type" in result
        
        # Validate values
        assert result["url"].startswith("/uploads/images/logo/")
        assert result["url"].endswith(".png")
        assert result["category"] == "logo"
        assert result["type"] == "images"
        assert result["size"] > 0
        
        print(f"✓ Single image upload successful: {result['url']}")
        return result["url"]
    
    def test_upload_with_different_categories(self, auth_headers):
        """Test upload with various categories"""
        categories = ['logo', 'cover', 'gallery', 'verification', 'profile', 'team_it', 'team_worship', 'team_outreach']
        
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        for category in categories:
            files = {'file': ('test.png', io.BytesIO(png_data), 'image/png')}
            data = {'category': category}
            
            response = requests.post(
                f"{BASE_URL}/api/upload",
                files=files,
                data=data,
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Upload failed for category {category}: {response.text}"
            result = response.json()
            assert result["category"] == category
            assert f"/uploads/images/{category}/" in result["url"]
            print(f"✓ Upload with category '{category}' successful")
    
    def test_upload_without_auth_fails(self):
        """Upload without authentication should fail"""
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test.png', io.BytesIO(png_data), 'image/png')}
        
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Upload without auth correctly rejected")
    
    def test_upload_invalid_file_type(self, auth_headers):
        """Upload with invalid file type should fail"""
        files = {'file': ('test.exe', io.BytesIO(b'fake exe content'), 'application/octet-stream')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "not allowed" in response.json().get("detail", "").lower()
        print("✓ Invalid file type correctly rejected")


class TestMultipleFileUpload:
    """Test POST /api/upload/multiple - Multiple files upload"""
    
    def test_upload_multiple_images(self, auth_headers):
        """Upload multiple image files at once"""
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = [
            ('files', ('image1.png', io.BytesIO(png_data), 'image/png')),
            ('files', ('image2.png', io.BytesIO(png_data), 'image/png')),
            ('files', ('image3.png', io.BytesIO(png_data), 'image/png')),
        ]
        data = {'category': 'gallery'}
        
        response = requests.post(
            f"{BASE_URL}/api/upload/multiple",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Multiple upload failed: {response.text}"
        result = response.json()
        
        # Validate response structure
        assert "uploaded" in result
        assert "errors" in result
        assert "total_uploaded" in result
        assert "total_failed" in result
        
        # Validate values
        assert result["total_uploaded"] == 3
        assert result["total_failed"] == 0
        assert len(result["uploaded"]) == 3
        
        for item in result["uploaded"]:
            assert "url" in item
            assert "filename" in item
            assert "size" in item
            assert item["url"].startswith("/uploads/images/gallery/")
        
        print(f"✓ Multiple file upload successful: {result['total_uploaded']} files")
        return [item["url"] for item in result["uploaded"]]
    
    def test_upload_multiple_without_auth_fails(self):
        """Multiple upload without authentication should fail"""
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = [('files', ('image1.png', io.BytesIO(png_data), 'image/png'))]
        
        response = requests.post(f"{BASE_URL}/api/upload/multiple", files=files)
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Multiple upload without auth correctly rejected")


class TestFileDelete:
    """Test DELETE /api/upload - File deletion"""
    
    def test_delete_uploaded_file(self, auth_headers):
        """Upload a file then delete it"""
        # First upload a file
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('to_delete.png', io.BytesIO(png_data), 'image/png')}
        data = {'category': 'general'}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            data=data,
            headers=auth_headers
        )
        assert upload_response.status_code == 200
        uploaded_url = upload_response.json()["url"]
        
        # Now delete the file
        delete_response = requests.delete(
            f"{BASE_URL}/api/upload",
            params={"url": uploaded_url},
            headers=auth_headers
        )
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        assert "deleted" in delete_response.json().get("message", "").lower()
        print(f"✓ File deleted successfully: {uploaded_url}")
    
    def test_delete_nonexistent_file(self, auth_headers):
        """Delete a file that doesn't exist should fail"""
        response = requests.delete(
            f"{BASE_URL}/api/upload",
            params={"url": "/uploads/images/logo/nonexistent-file.png"},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Delete nonexistent file correctly returns 404")
    
    def test_delete_invalid_path(self, auth_headers):
        """Delete with invalid path should fail"""
        response = requests.delete(
            f"{BASE_URL}/api/upload",
            params={"url": "/etc/passwd"},
            headers=auth_headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Delete with invalid path correctly rejected")
    
    def test_delete_without_auth_fails(self):
        """Delete without authentication should fail"""
        response = requests.delete(
            f"{BASE_URL}/api/upload",
            params={"url": "/uploads/images/logo/test.png"}
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Delete without auth correctly rejected")


class TestStaticFileServing:
    """Test static file serving at /uploads/*"""
    
    def test_uploaded_file_accessible(self, auth_headers):
        """Uploaded file should be accessible via static URL"""
        # Upload a file
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('static_test.png', io.BytesIO(png_data), 'image/png')}
        data = {'category': 'logo'}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            data=data,
            headers=auth_headers
        )
        assert upload_response.status_code == 200
        uploaded_url = upload_response.json()["url"]
        
        # Access the file via static URL (no auth needed)
        static_response = requests.get(f"{BASE_URL}{uploaded_url}")
        
        assert static_response.status_code == 200, f"Static file not accessible: {static_response.status_code}"
        assert static_response.headers.get("content-type", "").startswith("image/")
        assert len(static_response.content) > 0
        
        print(f"✓ Static file accessible at {uploaded_url}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/upload", params={"url": uploaded_url}, headers=auth_headers)


class TestDocumentUpload:
    """Test document file uploads (PDF, DOC)"""
    
    def test_upload_pdf_document(self, auth_headers):
        """Upload a PDF document for verification"""
        # Minimal PDF content
        pdf_data = b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n115\n%%EOF'
        
        files = {'file': ('document.pdf', io.BytesIO(pdf_data), 'application/pdf')}
        data = {'category': 'verification'}
        
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"PDF upload failed: {response.text}"
        result = response.json()
        
        assert result["url"].startswith("/uploads/documents/verification/")
        assert result["url"].endswith(".pdf")
        assert result["type"] == "documents"
        
        print(f"✓ PDF document upload successful: {result['url']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
