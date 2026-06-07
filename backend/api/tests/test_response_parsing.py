import json

from django.test import SimpleTestCase

from scripts.SumAI.response import (
    _extract_json_array_segment,
    _load_json_like_payload,
    _sanitize_json_candidate,
    _strip_markdown_fence,
    parse_action_document,
)


class StripMarkdownFenceTests(SimpleTestCase):
    def test_strips_json_fence(self):
        text = '```json\n{"key": "value"}\n```'
        self.assertEqual(_strip_markdown_fence(text), '{"key": "value"}')

    def test_strips_plain_fence(self):
        text = '```\n[1, 2, 3]\n```'
        self.assertEqual(_strip_markdown_fence(text), "[1, 2, 3]")

    def test_returns_stripped_text_without_fence(self):
        text = '  {"key": "value"}  '
        self.assertEqual(_strip_markdown_fence(text), '{"key": "value"}')

    def test_handles_multiline_content_inside_fence(self):
        text = '```json\n{\n  "a": 1,\n  "b": 2\n}\n```'
        result = _strip_markdown_fence(text)
        parsed = json.loads(result)
        self.assertEqual(parsed, {"a": 1, "b": 2})


class ExtractJsonArraySegmentTests(SimpleTestCase):
    def test_extracts_array_from_surrounding_text(self):
        text = 'Some text [{"id": 1}] more text'
        self.assertEqual(_extract_json_array_segment(text), '[{"id": 1}]')

    def test_returns_full_text_when_no_brackets(self):
        text = '{"key": "value"}'
        self.assertEqual(_extract_json_array_segment(text), '{"key": "value"}')

    def test_handles_nested_brackets(self):
        text = 'prefix [["a", "b"], ["c"]] suffix'
        self.assertEqual(_extract_json_array_segment(text), '[["a", "b"], ["c"]]')

    def test_returns_text_when_brackets_inverted(self):
        text = "end ] start ["
        self.assertEqual(_extract_json_array_segment(text), "end ] start [")


class SanitizeJsonCandidateTests(SimpleTestCase):
    def test_removes_trailing_commas(self):
        text = '{"a": 1, "b": 2, }'
        result = json.loads(_sanitize_json_candidate(text))
        self.assertEqual(result, {"a": 1, "b": 2})

    def test_quotes_unquoted_keys(self):
        text = '{name: "Alice", age: 30}'
        result = json.loads(_sanitize_json_candidate(text))
        self.assertEqual(result, {"name": "Alice", "age": 30})

    def test_removes_trailing_comma_in_array(self):
        text = '[1, 2, 3, ]'
        result = json.loads(_sanitize_json_candidate(text))
        self.assertEqual(result, [1, 2, 3])


class LoadJsonLikePayloadTests(SimpleTestCase):
    def test_parses_valid_json_object(self):
        result = _load_json_like_payload('{"title": "Test"}')
        self.assertEqual(result, {"title": "Test"})

    def test_parses_valid_json_array(self):
        result = _load_json_like_payload('[1, 2, 3]')
        self.assertEqual(result, [1, 2, 3])

    def test_parses_json_inside_markdown_fence(self):
        text = '```json\n{"title": "Fenced"}\n```'
        result = _load_json_like_payload(text)
        self.assertEqual(result, {"title": "Fenced"})

    def test_returns_none_for_empty_input(self):
        self.assertIsNone(_load_json_like_payload(""))
        self.assertIsNone(_load_json_like_payload(None))
        self.assertIsNone(_load_json_like_payload("   "))

    def test_extracts_array_from_surrounding_text(self):
        text = 'Here are the results: [{"id": 1}, {"id": 2}] Hope this helps!'
        result = _load_json_like_payload(text)
        self.assertEqual(result, [{"id": 1}, {"id": 2}])

    def test_handles_trailing_commas(self):
        text = '{"a": 1, "b": 2, }'
        result = _load_json_like_payload(text)
        self.assertEqual(result, {"a": 1, "b": 2})

    def test_handles_unquoted_keys(self):
        text = '{name: "Alice"}'
        result = _load_json_like_payload(text)
        self.assertEqual(result, {"name": "Alice"})

    def test_falls_back_to_python_literal(self):
        text = "{'key': 'value'}"
        result = _load_json_like_payload(text)
        self.assertEqual(result, {"key": "value"})

    def test_returns_none_for_non_parseable_text(self):
        self.assertIsNone(_load_json_like_payload("just some plain text"))

    def test_parses_bare_number_as_json(self):
        self.assertEqual(_load_json_like_payload("42"), 42)

    def test_returns_none_for_unparseable_garbage(self):
        self.assertIsNone(_load_json_like_payload("not json {{{"))


class ParseActionDocumentTests(SimpleTestCase):
    def _valid_document(self, **overrides):
        doc = {
            "title": "Test Title",
            "format": "flashcards",
            "blocks": [
                {
                    "type": "flashcard",
                    "front": [{"text": "Q1"}],
                    "back": [{"text": "A1"}],
                }
            ],
        }
        doc.update(overrides)
        return json.dumps(doc)

    def test_parses_valid_document(self):
        result = parse_action_document(self._valid_document())
        self.assertIsNotNone(result)
        self.assertEqual(result["title"], "Test Title")
        self.assertEqual(result["format"], "flashcards")
        self.assertEqual(len(result["blocks"]), 1)

    def test_returns_none_for_missing_title(self):
        raw = json.dumps({"format": "flashcards", "blocks": [{"type": "flashcard"}]})
        self.assertIsNone(parse_action_document(raw))

    def test_returns_none_for_missing_format(self):
        raw = json.dumps({"title": "T", "blocks": [{"type": "flashcard"}]})
        self.assertIsNone(parse_action_document(raw))

    def test_returns_none_for_empty_blocks(self):
        raw = json.dumps({"title": "T", "format": "flashcards", "blocks": []})
        self.assertIsNone(parse_action_document(raw))

    def test_returns_none_for_non_dict_payload(self):
        self.assertIsNone(parse_action_document("[1, 2, 3]"))

    def test_returns_none_for_empty_input(self):
        self.assertIsNone(parse_action_document(""))
        self.assertIsNone(parse_action_document(None))

    def test_parses_document_inside_markdown_fence(self):
        raw = f"```json\n{self._valid_document()}\n```"
        result = parse_action_document(raw)
        self.assertIsNotNone(result)
        self.assertEqual(result["title"], "Test Title")
