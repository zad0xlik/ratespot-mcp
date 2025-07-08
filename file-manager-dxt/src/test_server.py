import os
import json
import unittest
from fastapi.testclient import TestClient
from server import app

class TestFileManager(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Create a test file
        self.test_file_path = "test_file.txt"
        with open(self.test_file_path, "w") as f:
            f.write("Test content")
            
    def tearDown(self):
        # Clean up test file
        if os.path.exists(self.test_file_path):
            os.remove(self.test_file_path)

    def test_analyze_file(self):
        response = self.client.post(
            "/analyze_file",
            json={"path": self.test_file_path}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["extension"], ".txt")
        self.assertFalse(data["is_binary"])
        self.assertTrue("size" in data)
        self.assertTrue("created" in data)
        self.assertTrue("modified" in data)
        self.assertTrue("mime_type" in data)

    def test_read_file(self):
        response = self.client.post(
            "/read_file",
            json={"path": self.test_file_path}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["content"], "Test content")
        self.assertTrue("encoding" in data)
        self.assertTrue("info" in data)

    def test_list_directory(self):
        response = self.client.post(
            "/list_directory",
            json={"path": ".", "recursive": False}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue("files" in data)
        self.assertTrue(len(data["files"]) > 0)
        
        # Test recursive listing
        response = self.client.post(
            "/list_directory",
            json={"path": ".", "recursive": True}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue("files" in data)
        self.assertTrue(len(data["files"]) > 0)

    def test_file_not_found(self):
        response = self.client.post(
            "/analyze_file",
            json={"path": "nonexistent_file.txt"}
        )
        self.assertEqual(response.status_code, 404)

    def test_invalid_path(self):
        response = self.client.post(
            "/list_directory",
            json={"path": "nonexistent_directory"}
        )
        self.assertEqual(response.status_code, 404)

if __name__ == "__main__":
    unittest.main()
