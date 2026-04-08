from django.test import TestCase, Client

# Create your tests here.
from django.urls import reverse

class SpamTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.url = reverse('summarize-text')

    def test_spam_prevention(self):
        """Simulate sending multiple rapid requests."""
        payload = {
            "url": "https://example.com",
            "length": "short",
            "regenerate": False,
            "format": "bullet-point",
            "language": "english"
        }
        
        # Send 10 rapid requests
        for i in range(10):
            response = self.client.post(self.url, data=payload, content_type='application/json')
            
            # If you implemented rate limiting, you expect a 429 status code
            # If not, it will return 200, confirming it IS vulnerable to spam
            print(f"Request {i+1} status: {response.status_code}")