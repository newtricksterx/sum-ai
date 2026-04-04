from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from scripts import SumAI

class SummarizeText(APIView):
    def post(self, request):
        summary = SumAI.SummarizeContent(request.data.get('html'), request.data.get('length'), request.data.get('regenerate'), request.data.get("format"), request.data.get("language"))
        
        return Response({"data": summary})