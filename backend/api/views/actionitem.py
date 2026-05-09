from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from scripts.SumAI import SumAI

SUPPORTED_ACTION_TYPES = {"flashcards"}


def _normalize_flashcards(value):
    if not isinstance(value, list):
        return []

    normalized_cards = []
    for item in value:
        question = None
        answer = None

        if isinstance(item, (list, tuple)) and len(item) == 2:
            question, answer = item
        elif isinstance(item, dict):
            question = item.get("question")
            answer = item.get("answer")

        if isinstance(question, str) and isinstance(answer, str):
            question_text = question.strip()
            answer_text = answer.strip()
            if question_text and answer_text:
                normalized_cards.append((question_text, answer_text))

    return normalized_cards


class ActionItem(APIView):
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        action_type = request.data.get("type")
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

        action_content = SumAI.ActionContent(normalized_action_type, summary_content)

        if normalized_action_type == "flashcards":
            normalized_flashcards = _normalize_flashcards(action_content)
            if not normalized_flashcards:
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
                    "content": normalized_flashcards,
                },
                status=status.HTTP_200_OK,
            )

        if not isinstance(action_content, str) or not action_content.strip():
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
                "content": action_content,
            },
            status=status.HTTP_200_OK,
        )


