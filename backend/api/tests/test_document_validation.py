from django.test import SimpleTestCase

from scripts.SumAI import formats, schemas
from scripts.SumAI.response import validate_action_document, validate_summary_document


def _quiz_question(correct_keys=("B",)):
    return {
        "type": "question",
        "question": [{"text": "What is X?"}],
        "options": [
            {"key": key, "correct": key in correct_keys, "children": [{"text": f"Option {key}"}]}
            for key in ("A", "B", "C", "D")
        ],
        "explanation": [{"text": "Because."}],
    }


def _document(format_value, blocks):
    return {"title": "T", "format": format_value, "blocks": blocks}


class ValidateSummaryDocumentTests(SimpleTestCase):
    def test_accepts_valid_bullet_point_document(self):
        document = _document("bullet-point", [
            {"type": "bullet", "children": [{"text": "Point", "bold": True}]},
        ])
        self.assertTrue(validate_summary_document(document, "bullet-point"))

    def test_rejects_stray_block_type(self):
        # The bullet-point renderer renders every block as a <li>, so a stray
        # heading would silently appear as a bullet — retry instead.
        document = _document("bullet-point", [
            {"type": "heading", "children": [{"text": "Heading"}]},
            {"type": "bullet", "children": [{"text": "Point"}]},
        ])
        self.assertFalse(validate_summary_document(document, "bullet-point"))

    def test_rejects_format_mismatch(self):
        # The frontend picks its renderer from "format"; a mismatched value
        # would render an empty card.
        document = _document("paragraph", [
            {"type": "bullet", "children": [{"text": "Point"}]},
        ])
        self.assertFalse(validate_summary_document(document, "bullet-point"))

    def test_rejects_empty_children(self):
        document = _document("bullet-point", [{"type": "bullet", "children": []}])
        self.assertFalse(validate_summary_document(document, "bullet-point"))

    def test_accepts_paragraph_with_headings(self):
        document = _document("paragraph", [
            {"type": "heading", "children": [{"text": "Label"}]},
            {"type": "paragraph", "children": [{"text": "Body"}]},
        ])
        self.assertTrue(validate_summary_document(document, "paragraph"))

    def test_rejects_tldr_with_multiple_blocks(self):
        document = _document("tl-dr", [
            {"type": "tl-dr", "children": [{"text": "One"}]},
            {"type": "tl-dr", "children": [{"text": "Two"}]},
        ])
        self.assertFalse(validate_summary_document(document, "tl-dr"))

    def test_accepts_qna_document(self):
        document = _document("q-and-a", [
            {"type": "qna_pair", "question": [{"text": "Q?"}], "answer": [{"text": "A."}]},
        ])
        self.assertTrue(validate_summary_document(document, "q-and-a"))

    def test_rejects_qna_block_missing_answer(self):
        # The Q&A renderer assumes every block has question/answer; a stray
        # block renders as an empty "Q: A:" row.
        document = _document("q-and-a", [
            {"type": "qna_pair", "question": [{"text": "Q?"}]},
        ])
        self.assertFalse(validate_summary_document(document, "q-and-a"))


class ValidateActionDocumentTests(SimpleTestCase):
    def test_accepts_valid_quiz(self):
        document = _document("quiz", [_quiz_question()])
        self.assertTrue(validate_action_document(document, "quiz"))

    def test_rejects_quiz_question_with_no_correct_option(self):
        # The quiz UI looks up the correct option by index; with none flagged,
        # every answer shows as wrong with no visible error.
        document = _document("quiz", [_quiz_question(correct_keys=())])
        self.assertFalse(validate_action_document(document, "quiz"))

    def test_rejects_quiz_question_with_two_correct_options(self):
        document = _document("quiz", [_quiz_question(correct_keys=("A", "B"))])
        self.assertFalse(validate_action_document(document, "quiz"))

    def test_rejects_quiz_question_without_four_options(self):
        question = _quiz_question()
        question["options"] = question["options"][:3]
        document = _document("quiz", [question])
        self.assertFalse(validate_action_document(document, "quiz"))

    def test_accepts_valid_flashcards(self):
        document = _document("flashcards", [
            {"type": "flashcard", "front": [{"text": "Term"}], "back": [{"text": "Definition"}]},
        ])
        self.assertTrue(validate_action_document(document, "flashcards"))

    def test_rejects_flashcard_missing_back(self):
        document = _document("flashcards", [
            {"type": "flashcard", "front": [{"text": "Term"}]},
        ])
        self.assertFalse(validate_action_document(document, "flashcards"))

    def test_rejects_non_dict_payload(self):
        self.assertFalse(validate_action_document(["not", "a", "dict"], "quiz"))


class ResponseSchemaCoverageTests(SimpleTestCase):
    def test_every_summary_format_has_a_response_schema(self):
        # SummarizeContent indexes SUMMARY_RESPONSE_SCHEMAS by normalized format;
        # a format without a schema would raise KeyError at request time.
        self.assertEqual(
            set(schemas.SUMMARY_RESPONSE_SCHEMAS),
            set(formats.JSON_FORMAT_GUIDANCE),
        )

    def test_every_action_type_has_a_response_schema(self):
        self.assertEqual(
            set(schemas.ACTION_RESPONSE_SCHEMAS),
            set(formats.ACTION_FORMAT_GUIDANCE),
        )
