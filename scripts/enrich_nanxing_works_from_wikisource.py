#!/usr/bin/env python3
"""Attach public-domain poem texts from Chinese Wikisource to Nanxing works.

This script intentionally records provenance and a collation warning. Wikisource
is useful for reading access, but it is not treated as the final critical text.
"""

from __future__ import annotations

import html
import json
import re
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
WORKS_PATH = DATA / "sushi-journey-works.json"
BASE_URL = "https://zh.wikisource.org"
INDEX_PAGE = "東坡全集"
USER_AGENT = "SuShiReadingMap/0.1 (personal reading research)"
SHIGEKU_URL = "https://www.shigeku.org/xlib/lingshidao/gushi/sushi3.htm"


GROUP_PAGES = {
    "nanxing_work_010": ("過安樂山聞山上木葉有文如道士篆符云此山乃張道陵所寓二首", 0, 2),
    "nanxing_work_011": ("過安樂山聞山上木葉有文如道士篆符云此山乃張道陵所寓二首", 1, 2),
    **{f"nanxing_work_{number:03d}": ("荆州十首", number - 42, 10) for number in range(42, 52)},
    **{f"nanxing_work_{number:03d}": ("新渠詩（並敘）", number - 66, 5) for number in range(66, 71)},
}

PAGE_ALIASES = {
    "nanxing_work_001": "郭綸_(蘇軾)",
    "nanxing_work_009": "泊南牛口期任遵聖長官到晚不及見復來",
    "nanxing_work_014": "涪州得山胡（善鳴，出黔中）",
    "nanxing_work_016": "江上值雪效歐陽體限不以鹽玉鶴鷺絮蝶飛舞之類為比仍不使皓白潔素等字",
    "nanxing_work_026": "巫山廟上下數十里有烏鳶無數取食於行舟之上舟人神之故亦不敢害",
    "nanxing_work_036": "遊三遊洞遊洞之日有亭吏乞詩既為留三絕句於洞之石壁明日至峽州吏又至意若未足乃復以此詩授之",
    "nanxing_work_052": "荊門惠泉_(蘇軾)",
    "nanxing_work_054": "浰陽早發_(蘇軾)",
    "nanxing_work_057": "襄阳乐府三篇·野鹰来",
    "nanxing_work_058": "襄阳乐府三篇·上堵吟",
    "nanxing_work_059": "襄阳乐府三篇·襄阳乐",
    "nanxing_work_075": "大雪独留尉氏",
}

SHIGEKU_FALLBACKS = {
    "nanxing_work_002": "初发嘉州",
    "nanxing_work_025": "巫山",
}


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.current: dict[str, str] | None = None
        self.links: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            self.current = {key: value or "" for key, value in attrs}
            self.current["text"] = ""

    def handle_data(self, data: str) -> None:
        if self.current is not None:
            self.current["text"] += data

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self.current is not None:
            self.links.append(self.current)
            self.current = None


class ParagraphParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_output = False
        self.skip_depth = 0
        self.in_paragraph = False
        self.current: list[str] = []
        self.paragraphs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {key: value or "" for key, value in attrs}
        classes = attrs_dict.get("class", "").split()
        if tag == "div" and "mw-parser-output" in classes:
            self.in_output = True
        if not self.in_output:
            return
        if tag == "div" and (attrs_dict.get("id") == "headerContainer" or "licenseContainer" in classes):
            self.skip_depth += 1
            return
        if self.skip_depth:
            if tag == "div":
                self.skip_depth += 1
            return
        if tag == "p":
            self.in_paragraph = True
            self.current = []
        elif tag == "br" and self.in_paragraph:
            self.current.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if not self.in_output:
            return
        if self.skip_depth:
            if tag == "div":
                self.skip_depth -= 1
            return
        if tag == "p" and self.in_paragraph:
            text = clean_text("".join(self.current))
            if text:
                self.paragraphs.append(text)
            self.in_paragraph = False
            self.current = []

    def handle_data(self, data: str) -> None:
        if self.in_output and not self.skip_depth and self.in_paragraph:
            self.current.append(data)


def fetch_url(url: str, retries: int = 4) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                return response.read().decode("utf-8")
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2 + attempt * 2)
    raise RuntimeError("unreachable")


def page_url(page: str) -> str:
    return f"{BASE_URL}/zh-hans/{urllib.parse.quote(page)}"


def clean_text(value: str) -> str:
    value = html.unescape(value).replace("\xa0", " ")
    lines = [re.sub(r"\s+", " ", line).strip() for line in value.splitlines()]
    return "\n".join(line for line in lines if line)


def normalize(value: str) -> str:
    value = re.sub(r"（.*?）|\(.*?\)", "", value)
    value = re.sub(r"[·・，。、“”‘’\s/（）()〈〉：:；;《》]", "", value)
    return (
        value.replace("㸔", "看")
        .replace("鳬", "凫")
        .replace("鯿", "鳊")
        .replace("培", "碚")
        .replace("於", "于")
        .replace("一○", "十")
    )


def work_base_title(work: dict) -> str:
    title = work["title"]
    title = re.sub(r" 其(?:一○|[一二三四五六七八九十]+)$", "", title)
    title = re.sub(r"^(荆州十首|新渠诗) .*$", r"\1", title)
    title = re.sub(r"二首 其[一二]$", "二首", title)
    return title


def build_index_links() -> list[dict[str, str]]:
    parser = LinkParser()
    parser.feed(fetch_url(page_url(INDEX_PAGE)))
    return [
        link
        for link in parser.links
        if link.get("href", "").startswith("/wiki/") and link.get("text", "").strip()
    ]


def find_page(work: dict, links: list[dict[str, str]]) -> str | None:
    if work["work_id"] in PAGE_ALIASES:
        return PAGE_ALIASES[work["work_id"]]
    if work["work_id"] in GROUP_PAGES:
        return GROUP_PAGES[work["work_id"]][0]

    target = normalize(work_base_title(work))
    exact: list[dict[str, str]] = []
    partial: list[dict[str, str]] = []
    for link in links:
        text = normalize(link.get("text", ""))
        title = normalize(link.get("title", ""))
        if target in {text, title}:
            exact.append(link)
        elif len(target) > 8 and (target in text or text in target or target in title or title in target):
            partial.append(link)
    match = (exact or partial or [None])[0]
    if not match:
        return None
    return urllib.parse.unquote(match["href"].removeprefix("/wiki/"))


def extract_paragraphs(page: str) -> list[str]:
    parser = ParagraphParser()
    parser.feed(fetch_url(page_url(page)))
    return parser.paragraphs


def select_text(work: dict, paragraphs: list[str]) -> tuple[str, str]:
    group = GROUP_PAGES.get(work["work_id"])
    if group:
        _, index, count = group
        stanzas = paragraphs[-count:]
        if len(stanzas) == count:
            return stanzas[index], "group_stanza"
        if len(paragraphs) == 1:
            lines = [line for line in paragraphs[0].splitlines() if not re.fullmatch(r"其[一二三四五六七八九十]+", line)]
            if len(lines) % count == 0:
                lines_per_stanza = len(lines) // count
                start = index * lines_per_stanza
                return "\n".join(lines[start : start + lines_per_stanza]), "group_stanza"
    return "\n\n".join(paragraphs), "full_page"


def extract_shigeku_section(source: str, title: str) -> str:
    marker = f"【{title}】"
    start = source.find(marker)
    if start < 0:
        return ""
    start = source.find("<br", start)
    end = source.find("【", start)
    fragment = source[start:end]
    fragment = re.sub(r"<br\s*/?>", "\n", fragment, flags=re.I)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    fragment = re.sub(r".*?", "", fragment)
    text = clean_text(fragment)
    if "\n" not in text:
        text = "\n".join(part for part in re.split(r"(?<=。)", text) if part)
    return text


def main() -> int:
    works = json.loads(WORKS_PATH.read_text(encoding="utf-8"))
    links = build_index_links()
    page_cache: dict[str, list[str]] = {}
    shigeku_source: str | None = None
    missing: list[str] = []

    for work in works:
        fallback_title = SHIGEKU_FALLBACKS.get(work["work_id"])
        if fallback_title:
            if shigeku_source is None:
                raw = urllib.request.urlopen(urllib.request.Request(SHIGEKU_URL, headers={"User-Agent": USER_AGENT}), timeout=90).read()
                for encoding in ("utf-8", "gb18030", "big5"):
                    try:
                        shigeku_source = raw.decode(encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                if shigeku_source is None:
                    raise UnicodeDecodeError("unknown", raw, 0, 1, "could not decode Shigeku source")
            text = extract_shigeku_section(shigeku_source, fallback_title)
            if not text:
                missing.append(f"{work['work_id']} {work['title']}: Shigeku fallback text not found")
                continue
            work["text"] = text
            work["text_scope"] = "full_page"
            work["text_source_label"] = "诗歌库《苏轼诗全集》"
            work["text_source_url"] = SHIGEKU_URL
            work["text_status"] = "local"
            work["text_status_note"] = "原文已保存于项目；此条采用补充来源，必须与可靠点校本复核。"
            continue
        page = find_page(work, links)
        if not page:
            missing.append(f"{work['work_id']} {work['title']}: page not found")
            continue
        if page not in page_cache:
            try:
                page_cache[page] = extract_paragraphs(page)
            except Exception as error:
                missing.append(f"{work['work_id']} {work['title']}: failed to fetch {page!r}: {error}")
                page_cache[page] = []
            time.sleep(0.18)
        text, scope = select_text(work, page_cache[page])
        if not text:
            missing.append(f"{work['work_id']} {work['title']}: empty text")
            continue
        work["text"] = text
        work["text_scope"] = scope
        work["text_source_label"] = "维基文库《东坡全集》"
        work["text_source_url"] = page_url(page)
        work["text_status"] = "local"
        work["text_status_note"] = "原文已保存于项目；仍需与可靠点校本逐首校勘。"

    WORKS_PATH.write_text(json.dumps(works, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Attached text to {sum(bool(work.get('text')) for work in works)} of {len(works)} works from {len(page_cache)} Wikisource pages.")
    if missing:
        print("Missing:")
        for item in missing:
            print(f"- {item}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
