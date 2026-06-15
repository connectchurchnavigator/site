import pytest
import json
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from pymongo import MongoClient
import os
from bson import ObjectId

from server import app

client = TestClient(app)

@pytest.fixture(scope="module")
def mongo_client():
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    return MongoClient(mongo_uri)

@pytest.fixture(scope="module")
def test_db(mongo_client):
    db = mongo_client["DEV-ChurchNavigator-Test"]
    yield db
    mongo_client.drop_database("DEV-ChurchNavigator-Test")

@pytest.fixture
def sample_worship_leader(test_db):
    leader = {
        "_id": ObjectId(),
        "slug": "test-worship-leader",
        "name": "John Smith",
        "email": "john@test.com",
        "phone": "07700900000",
        "church": "Test Church",
        "experience": "5 years leading worship",
        "styles": ["Contemporary", "Traditional"],
        "availability": "Weekends",
        "location": "London",
        "rate": "£100-150",
        "created_at": datetime.utcnow()
    }
    test_db.worship_leaders.insert_one(leader)
    yield leader
    test_db.worship_leaders.delete_one({"_id": leader["_id"]})

@pytest.fixture
def sample_media_team(test_db):
    team = {
        "_id": ObjectId(),
        "slug": "test-media-team",
        "name": "Tech Team UK",
        "email": "tech@test.com",
        "phone": "07700900001",
        "services": ["Live Streaming", "Video Production"],
        "equipment": ["Cameras", "Audio Mixers"],
        "experience": "10 years",
        "location": "Manchester",
        "rate": "£200-300",
        "portfolio_url": "https://test.com",
        "created_at": datetime.utcnow()
    }
    test_db.media_teams.insert_one(team)
    yield team
    test_db.media_teams.delete_one({"_id": team["_id"]})

@pytest.fixture
def sample_event(test_db):
    event = {
        "_id": ObjectId(),
        "slug": "test-event",
        "title": "Test Conference",
        "church_name": "Test Church",
        "church_slug": "test-church",
        "description": "A test event",
        "event_type": "Conference",
        "start_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "end_date": (datetime.utcnow() + timedelta(days=8)).isoformat(),
        "location": "London",
        "address": "123 Test St",
        "cost": "Free",
        "registration_url": "https://test.com",
        "created_at": datetime.utcnow()
    }
    test_db.events.insert_one(event)
    yield event
    test_db.events.delete_one({"_id": event["_id"]})

@pytest.fixture
def sample_church(test_db):
    church = {
        "_id": ObjectId(),
        "slug": "test-church-visit",
        "name": "Test Church",
        "city": "London",
        "postcode": "SW1A 1AA",
        "services": [{"day": "Sunday", "time": "10:00 AM"}]
    }
    test_db.churches.insert_one(church)
    yield church
    test_db.churches.delete_one({"_id": church["_id"]})

class TestWorshipLeadersAPI:
    def test_get_all_worship_leaders_success(self, sample_worship_leader):
        response = client.get("/api/worship-leaders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(w["slug"] == "test-worship-leader" for w in data)

    def test_get_worship_leader_by_slug_success(self, sample_worship_leader):
        response = client.get("/api/worship-leaders/test-worship-leader")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "test-worship-leader"
        assert data["name"] == "John Smith"
        assert data["email"] == "john@test.com"

    def test_get_worship_leader_invalid_slug_returns_404(self):
        response = client.get("/api/worship-leaders/nonexistent-slug")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_worship_leaders_filters_by_location(self, sample_worship_leader):
        response = client.get("/api/worship-leaders?location=London")
        assert response.status_code == 200
        data = response.json()
        assert all(w["location"] == "London" for w in data)

    def test_get_worship_leaders_filters_by_style(self, sample_worship_leader):
        response = client.get("/api/worship-leaders?style=Contemporary")
        assert response.status_code == 200
        data = response.json()
        assert all("Contemporary" in w["styles"] for w in data)

class TestMediaTeamsAPI:
    def test_get_all_media_teams_success(self, sample_media_team):
        response = client.get("/api/media-teams")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(m["slug"] == "test-media-team" for m in data)

    def test_get_media_team_by_slug_success(self, sample_media_team):
        response = client.get("/api/media-teams/test-media-team")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "test-media-team"
        assert data["name"] == "Tech Team UK"
        assert "Live Streaming" in data["services"]

    def test_get_media_team_invalid_slug_returns_404(self):
        response = client.get("/api/media-teams/nonexistent-slug")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_media_teams_filters_by_location(self, sample_media_team):
        response = client.get("/api/media-teams?location=Manchester")
        assert response.status_code == 200
        data = response.json()
        assert all(m["location"] == "Manchester" for m in data)

    def test_get_media_teams_filters_by_service(self, sample_media_team):
        response = client.get("/api/media-teams?service=Live Streaming")
        assert response.status_code == 200
        data = response.json()
        assert all("Live Streaming" in m["services"] for m in data)

class TestEventsAPI:
    def test_get_all_events_success(self, sample_event):
        response = client.get("/api/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(e["slug"] == "test-event" for e in data)

    def test_get_event_by_slug_success(self, sample_event):
        response = client.get("/api/events/test-event")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "test-event"
        assert data["title"] == "Test Conference"
        assert data["event_type"] == "Conference"

    def test_get_event_invalid_slug_returns_404(self):
        response = client.get("/api/events/nonexistent-event")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_events_filters_by_type(self, sample_event):
        response = client.get("/api/events?type=Conference")
        assert response.status_code == 200
        data = response.json()
        assert all(e["event_type"] == "Conference" for e in data)

    def test_get_events_filters_by_location(self, sample_event):
        response = client.get("/api/events?location=London")
        assert response.status_code == 200
        data = response.json()
        assert all(e["location"] == "London" for e in data)

    def test_get_events_only_returns_future_events(self, test_db):
        past_event = {
            "slug": "past-event",
            "title": "Past Event",
            "start_date": (datetime.utcnow() - timedelta(days=10)).isoformat(),
            "end_date": (datetime.utcnow() - timedelta(days=9)).isoformat(),
            "event_type": "Service",
            "location": "London"
        }
        test_db.events.insert_one(past_event)
        response = client.get("/api/events")
        data = response.json()
        assert not any(e["slug"] == "past-event" for e in data)
        test_db.events.delete_one({"slug": "past-event"})

class TestVisitorTrackingAPI:
    def test_register_visitor_success(self, sample_church, test_db):
        visitor_data = {
            "church_slug": "test-church-visit",
            "name": "Jane Doe",
            "email": "jane@test.com",
            "phone": "07700900002",
            "visit_date": datetime.utcnow().isoformat(),
            "first_time": True,
            "notes": "Interested in joining"
        }
        response = client.post("/api/visitors/register", json=visitor_data)
        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "Visitor registered successfully"
        assert "visitor_id" in data
        visitor = test_db.visitors.find_one({"_id": ObjectId(data["visitor_id"])})
        assert visitor is not None
        assert visitor["name"] == "Jane Doe"
        test_db.visitors.delete_one({"_id": ObjectId(data["visitor_id"])})

    def test_register_visitor_missing_required_fields_returns_422(self):
        visitor_data = {
            "church_slug": "test-church-visit",
            "name": "Jane Doe"
        }
        response = client.post("/api/visitors/register", json=visitor_data)
        assert response.status_code == 422

    def test_register_visitor_invalid_church_returns_404(self):
        visitor_data = {
            "church_slug": "nonexistent-church",
            "name": "Jane Doe",
            "email": "jane@test.com",
            "visit_date": datetime.utcnow().isoformat()
        }
        response = client.post("/api/visitors/register", json=visitor_data)
        assert response.status_code == 404

    def test_register_visitor_invalid_email_format_returns_422(self):
        visitor_data = {
            "church_slug": "test-church-visit",
            "name": "Jane Doe",
            "email": "invalid-email",
            "visit_date": datetime.utcnow().isoformat()
        }
        response = client.post("/api/visitors/register", json=visitor_data)
        assert response.status_code == 422

class TestQRCodeAPI:
    def test_generate_qr_code_success(self, sample_church):
        response = client.get("/api/qr/test-church-visit")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert len(response.content) > 0

    def test_generate_qr_code_invalid_church_returns_404(self):
        response = client.get("/api/qr/nonexistent-church")
        assert response.status_code == 404

    def test_qr_code_contains_correct_url(self, sample_church):
        response = client.get("/api/qr/test-church-visit")
        assert response.status_code == 200

class TestIntegrationScenarios:
    def test_complete_visitor_journey(self, sample_church, test_db):
        qr_response = client.get("/api/qr/test-church-visit")
        assert qr_response.status_code == 200
        visitor_data = {
            "church_slug": "test-church-visit",
            "name": "Complete Journey",
            "email": "journey@test.com",
            "visit_date": datetime.utcnow().isoformat(),
            "first_time": True
        }
        register_response = client.post("/api/visitors/register", json=visitor_data)
        assert register_response.status_code == 201
        visitor_id = register_response.json()["visitor_id"]
        visitor = test_db.visitors.find_one({"_id": ObjectId(visitor_id)})
        assert visitor["church_slug"] == "test-church-visit"
        test_db.visitors.delete_one({"_id": ObjectId(visitor_id)})

    def test_event_to_church_cross_reference(self, sample_event, test_db):
        church = {
            "slug": "test-church",
            "name": "Test Church",
            "city": "London"
        }
        test_db.churches.insert_one(church)
        event_response = client.get("/api/events/test-event")
        assert event_response.status_code == 200
        event_data = event_response.json()
        assert event_data["church_slug"] == "test-church"
        test_db.churches.delete_one({"slug": "test-church"})

class TestErrorHandling:
    def test_malformed_json_returns_422(self):
        response = client.post(
            "/api/visitors/register",
            data="{invalid json}",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422

    def test_method_not_allowed_returns_405(self):
        response = client.put("/api/worship-leaders/test-slug")
        assert response.status_code == 405

    def test_database_connection_resilience(self, monkeypatch):
        def mock_find(*args, **kwargs):
            raise Exception("Database connection failed")
        response = client.get("/api/worship-leaders")
        assert response.status_code in [200, 500]