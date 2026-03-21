from __future__ import annotations

import os
import json
import mimetypes
import re
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.error import HTTPError
from urllib.request import Request, urlopen


ROOT = Path.cwd()
INVENTIONS_FILE = ROOT / "src/data/inventions.ts"
GEOJSON_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
GEOJSON_OUTPUT = ROOT / "public/data/countries.geojson"
IMAGE_OUTPUT_DIR = ROOT / "public/images/inventions"
USER_AGENT = "InventorNet asset fetcher/1.0"


def request(url: str, accept: str | None = None) -> bytes:
    headers = {"User-Agent": USER_AGENT}
    if accept:
        headers["Accept"] = accept

    req = Request(url, headers=headers)
    with urlopen(req) as response:
        return response.read()


def parse_inventions(source: str) -> list[dict[str, str]]:
    blocks = source.split("createInvention({")[1:]
    entries: list[dict[str, str]] = []

    for block in blocks:
        id_match = re.search(r'id:\s*"([^"]+)"', block)
        url_match = re.search(r'sourceUrl:\s*"([^"]+)"', block)
        if not id_match or not url_match:
            continue
        entries.append({"id": id_match.group(1), "source_url": url_match.group(1)})

    return entries


def get_wiki_title(url: str) -> str:
    path = urlparse(url).path
    marker = "/wiki/"
    if marker not in path:
        raise ValueError(f"Could not parse Wikipedia title from {url}")
    return path.split(marker, 1)[1]


def infer_extension(image_url: str, content_type: str | None) -> str:
    suffix = Path(urlparse(image_url).path).suffix.lower()
    if suffix:
        return suffix

    if content_type:
        guessed = mimetypes.guess_extension(content_type.split(";")[0].strip())
        if guessed:
            return guessed

    return ".jpg"


def clean_dir(directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for child in directory.iterdir():
        if child.is_file():
            child.unlink()


def download_world_geojson() -> None:
    GEOJSON_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    GEOJSON_OUTPUT.write_bytes(request(GEOJSON_URL, "application/geo+json,application/json"))
    print(f"Saved world country boundaries to {GEOJSON_OUTPUT.relative_to(ROOT)}")


def download_image(entry: dict[str, str]) -> None:
    wiki_title = get_wiki_title(entry["source_url"])
    summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_title}"
    summary = json.loads(request(summary_url, "application/json"))
    image_url = summary.get("thumbnail", {}).get("source") or summary.get("originalimage", {}).get("source")

    if not image_url:
        raise RuntimeError(f"No summary image available for {entry['id']} ({wiki_title})")

    for existing_file in IMAGE_OUTPUT_DIR.glob(f"{entry['id']}.*"):
        if existing_file.is_file():
            print(f"Skipping {entry['id']} (already downloaded)")
            return

    content_type = None
    data = None
    last_error = None

    for attempt in range(5):
        try:
            req = Request(image_url, headers={"User-Agent": USER_AGENT})
            with urlopen(req) as response:
                content_type = response.headers.get("Content-Type")
                data = response.read()
            break
        except HTTPError as error:
            last_error = error
            if error.code != 429:
                raise
            time.sleep(2 + attempt * 2)

    if data is None:
        raise last_error or RuntimeError(f"Failed to download image for {entry['id']}")

    extension = infer_extension(image_url, content_type)
    output_path = IMAGE_OUTPUT_DIR / f"{entry['id']}{extension}"
    output_path.write_bytes(data)
    print(f"Saved {entry['id']} -> {output_path.relative_to(ROOT)}")
    time.sleep(1)


def main() -> None:
    source = INVENTIONS_FILE.read_text()
    entries = parse_inventions(source)
    only_ids = {value.strip() for value in os.environ.get("ONLY_IDS", "").split(",") if value.strip()}

    if not entries:
        raise RuntimeError("No inventions found in src/data/inventions.ts")

    if only_ids:
        entries = [entry for entry in entries if entry["id"] in only_ids]

    download_world_geojson()
    IMAGE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for entry in entries:
        download_image(entry)


if __name__ == "__main__":
    main()
