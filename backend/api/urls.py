from django.urls import path, include
from api.views import SummarizeText

urlpatterns = [
    path('summarize', SummarizeText.as_view(), name="summarize-text")
]