from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from scripts.SumAI import SumAI

SUPPORTED_ACTION_TYPES = {"flashcards", "quiz"}


class ActionItem(APIView):

    def post(self, request):
        action_type = request.data.get("type")
        language = request.data.get("language")
        summary_content = request.data.get("content")

        if not isinstance(action_type, str) or not action_type.strip():
            return Response(
                {
                    "isSuccess": False,
                    "error": "Missing required field: 'type'",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_action_type = action_type.strip().lower()
        if normalized_action_type not in SUPPORTED_ACTION_TYPES:
            return Response(
                {
                    "isSuccess": False,
                    "error": "Unsupported action type.",
                    "supported_types": sorted(SUPPORTED_ACTION_TYPES),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(summary_content, str) or not summary_content.strip():
            return Response(
                {
                    "isSuccess": False,
                    "error": "Missing required field: 'content'",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        action_document = SumAI.ActionContent(normalized_action_type, language, summary_content)

        if not isinstance(action_document, dict) or not action_document.get("blocks"):
            return Response(
                {
                    "isSuccess": False,
                    "error": "Could not generate action content.",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "isSuccess": True,
                "content": action_document,
            },
            status=status.HTTP_200_OK,
        )
