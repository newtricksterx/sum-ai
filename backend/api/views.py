from django.shortcuts import render
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from scripts import SumAI
import time

class SummarizeText(APIView):
    def post(self, request):

        content = request.data.get('content')

        if not content:
            return Response(
                {"error": "Missing required field: 'content'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        summary = SumAI.SummarizeContent(request.data.get('content'), 
                                         request.data.get('length'), 
                                         request.data.get('regenerate'), 
                                         request.data.get("format"), 
                                         request.data.get("language"))
        
        return Response({"data": summary})