import csv
import io
import json
import logging
import urllib.request
from typing import Dict, List

from sqlalchemy import create_engine, text

from src.utils.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- SOURCES ---
SOURCE_DSOJEVIC = (
    "https://raw.githubusercontent.com/dsojevic/profanity-list/main/en.json"
)
SOURCE_LDNOOBW = "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en"
SOURCE_HURTLEX = "https://raw.githubusercontent.com/valeriobasile/hurtlex/master/lexica/EN/1.2/hurtlex_en_1.2.tsv"
SOURCE_IMANE = "https://raw.githubusercontent.com/imanebelhaj/profanity_datasets_offensive_speach/master/bad_words_langs.csv"
SOURCE_DAVIDSON = "https://raw.githubusercontent.com/t-davidson/hate-speech-and-offensive-language/master/lexicons/refined_ngram_dict.csv"


def get_severity_from_level(level: int) -> str:
    if level >= 4:
        return "ban"
    if level == 3:
        return "timeout"
    return "warning"


def fetch_dsojevic() -> List[Dict]:
    logger.info("Fetching dsojevic list...")
    try:
        with urllib.request.urlopen(SOURCE_DSOJEVIC) as response:
            data = json.loads(response.read().decode())
        return [
            {
                "word": item.get("match", "").lower().strip(),
                "severity": get_severity_from_level(item.get("severity", 1)),
                "category": (item.get("tags", []) + ["profanity"])[0],
            }
            for item in data
            if item.get("match")
        ]
    except Exception as e:
        logger.error(f"Error fetching dsojevic: {e}")
        return []


def fetch_ldnoobw() -> List[Dict]:
    logger.info("Fetching LDNOOBW list...")
    try:
        with urllib.request.urlopen(SOURCE_LDNOOBW) as response:
            lines = response.read().decode().splitlines()
        return [
            {
                "word": line.strip().lower(),
                "severity": "warning",
                "category": "profanity",
            }
            for line in lines
            if line.strip()
        ]
    except Exception as e:
        logger.error(f"Error fetching LDNOOBW: {e}")
        return []


def fetch_hurtlex() -> List[Dict]:
    logger.info("Fetching HurtLex list...")
    results = []
    try:
        with urllib.request.urlopen(SOURCE_HURTLEX) as response:
            content = response.read().decode("utf-8")
            reader = csv.DictReader(io.StringIO(content), delimiter="\t")
            cat_map = {
                "PS": "hate_speech",
                "R": "hate_speech",
                "S": "sexual",
                "ASF": "sexual",
                "ASM": "sexual",
                "PR": "sexual",
                "OM": "hate_speech",
                "QAS": "abuse",
                "CDS": "abuse",
            }
            for row in reader:
                word = row.get("lemma") or row.get("word")
                if word:
                    results.append(
                        {
                            "word": word.lower().strip(),
                            "severity": "warning",
                            "category": cat_map.get(row.get("category"), "profanity"),
                        }
                    )
        return results
    except Exception as e:
        logger.error(f"Error fetching HurtLex: {e}")
        return []


def fetch_imane() -> List[Dict]:
    logger.info("Fetching Imane's Multilingual list...")
    results = []
    try:
        with urllib.request.urlopen(SOURCE_IMANE) as response:
            content = response.read().decode("utf-8-sig")  # Handle BOM
            reader = csv.DictReader(io.StringIO(content))
            for row in reader:
                word = row.get("text")
                label = row.get("label")
                if word and str(label).strip().lower() in ["1", "true", "insult"]:
                    results.append(
                        {
                            "word": word.lower().strip(),
                            "severity": "warning",
                            "category": "profanity",
                        }
                    )
        return results
    except Exception as e:
        logger.error(f"Error fetching Imane's list: {e}")
        return []


def fetch_davidson() -> List[Dict]:
    logger.info("Fetching Davidson Lexicon (hatespeechdata.com)...")
    results = []
    try:
        with urllib.request.urlopen(SOURCE_DAVIDSON) as response:
            content = response.read().decode("utf-8")
            # Use splitlines() to handle potential line-ending quirks safely
            reader = csv.DictReader(content.splitlines())
            # header: ngram, prophate
            for row in reader:
                word = row.get("ngram")
                score = row.get("prophate", "0")
                if not word:
                    continue

                # Filter logic: Davidson uses a 'proportional hate' score (0-1)
                # We interpret > 0.3 as actionable
                try:
                    score_val = float(score)
                except ValueError:
                    score_val = 0.0

                if score_val > 0.3:  # Threshold for inclusion
                    severity = "timeout" if score_val > 0.7 else "warning"
                    results.append(
                        {
                            "word": word.lower().strip(),
                            "severity": severity,
                            "category": "hate_speech",  # Davidson focuses on hate speech
                        }
                    )
        logger.info(f"Fetched {len(results)} words from Davidson.")
        return results
    except Exception as e:
        logger.error(f"Error fetching Davidson: {e}")
        return []


def seed_banned_words():
    all_words = {}

    def merge_list(source_list):
        for item in source_list:
            w = item["word"]
            if w in all_words:
                existing = all_words[w]
                if (
                    existing["category"] == "profanity"
                    and item["category"] != "profanity"
                ):
                    existing["category"] = item["category"]
                sev_rank = {"ban": 3, "timeout": 2, "warning": 1}
                if sev_rank[item["severity"]] > sev_rank[existing["severity"]]:
                    existing["severity"] = item["severity"]
            else:
                all_words[w] = item

    # Merge Order - Last one wins on non-conflicts, but merge logic handles upgrades
    merge_list(fetch_ldnoobw())
    merge_list(fetch_dsojevic())
    merge_list(fetch_hurtlex())
    merge_list(fetch_imane())
    merge_list(fetch_davidson())  # New source

    # Local Overrides (Strict)
    local_terms = [
        ("spam", "warning", "spam"),
        ("scam", "timeout", "spam"),
        ("http://", "warning", "spam"),
        ("https://", "warning", "spam"),
        ("bit.ly", "timeout", "spam"),
        ("discord.gg", "timeout", "spam"),
        ("t.me/", "timeout", "spam"),
    ]
    for w, sev, cat in local_terms:
        all_words[w] = {"word": w, "severity": sev, "category": cat}

    # Insert
    db_url = settings.database_url.replace("postgresql+asyncpg", "postgresql")
    engine = create_engine(db_url)
    final_list = list(all_words.values())

    with engine.connect() as conn:
        logger.info(f"Upserting {len(final_list)} unique words into Supabase...")
        count = 0
        for entry in final_list:
            stmt = text(
                """
                INSERT INTO banned_words (word, severity, category, is_active)
                VALUES (:word, :severity, :category, true)
                ON CONFLICT (word) DO UPDATE 
                SET severity = EXCLUDED.severity, 
                    category = EXCLUDED.category
            """
            )
            conn.execute(stmt, entry)
            count += 1
            if count % 500 == 0:
                logger.info(f"Processed {count}...")
        conn.commit()
        logger.info("Done!")


if __name__ == "__main__":
    seed_banned_words()
