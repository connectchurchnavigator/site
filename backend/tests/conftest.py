import pytest
import os

@pytest.fixture(scope="session", autouse=True)
def set_test_environment():
    os.environ["ENVIRONMENT"] = "test"
    os.environ["MONGODB_URI"] = os.getenv("MONGODB_URI_TEST", "mongodb://localhost:27017")
    yield
    os.environ.pop("ENVIRONMENT", None)