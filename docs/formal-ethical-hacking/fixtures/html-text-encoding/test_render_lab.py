"""Visible tests of a fixed paragraph text context, not browser security."""
import unittest
from html.parser import HTMLParser
from render_lab import render_note


class ObservedHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.starts = []
        self.ends = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        self.starts.append((tag, attrs))

    def handle_endtag(self, tag):
        self.ends.append(tag)

    def handle_data(self, data):
        self.text.append(data)


class RenderTests(unittest.TestCase):
    def check_text(self, value):
        parsed = ObservedHTML()
        parsed.feed(render_note(value))
        parsed.close()
        self.assertEqual(parsed.starts, [("p", [])])
        self.assertEqual(parsed.ends, ["p"])
        self.assertEqual("".join(parsed.text), value)

    def test_plain_text(self):
        self.check_text("A note with quotes and an apostrophe" + chr(39))

    def test_empty_text(self):
        self.check_text("")

    def test_entity_like_text(self):
        self.check_text("&copy;")

    def test_markup_is_text(self):
        self.check_text("<em>demo</em>")

    def test_boundary_is_text(self):
        self.check_text("</p><p>demo")

    def test_unicode_text(self):
        self.check_text("café")


if __name__ == "__main__":
    unittest.main()
