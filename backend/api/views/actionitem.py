from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from scripts.SumAI import SumAI

SUPPORTED_ACTION_TYPES = {"flashcards", "quiz"}


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


def _normalize_quiz_items(value):
    if not isinstance(value, list):
        return []

    normalized_items = []
    for item in value:
        if not isinstance(item, dict):
            continue

        prompt = item.get("prompt")
        options = item.get("options")
        correct_index = item.get("correctIndex")
        explanation = item.get("explanation")

        if not isinstance(prompt, str) or not isinstance(explanation, str):
            continue

        prompt_text = prompt.strip()
        explanation_text = explanation.strip()
        if not prompt_text or not explanation_text:
            continue

        if not isinstance(options, list):
            continue

        normalized_options = []
        for option in options:
            if isinstance(option, str):
                option_text = option.strip()
                if option_text:
                    normalized_options.append(option_text)

        if len(normalized_options) < 2:
            continue

        if isinstance(correct_index, str) and correct_index.strip().isdigit():
            correct_index = int(correct_index.strip())

        if not isinstance(correct_index, int) or isinstance(correct_index, bool):
            continue

        if correct_index < 0 or correct_index >= len(normalized_options):
            continue

        normalized_items.append(
            {
                "prompt": prompt_text,
                "options": normalized_options,
                "correctIndex": correct_index,
                "explanation": explanation_text,
            }
        )

    return normalized_items


class ActionItem(APIView):
    throttle_classes = [AnonRateThrottle]

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

        action_content = SumAI.ActionContent(normalized_action_type, language, summary_content)

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

        if normalized_action_type == "quiz":
            normalized_quiz_items = _normalize_quiz_items(action_content)
            if not normalized_quiz_items:
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
                    "content": normalized_quiz_items,
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


