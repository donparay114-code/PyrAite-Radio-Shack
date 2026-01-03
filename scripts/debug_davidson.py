import csv
import io
import urllib.request

SOURCE_DAVIDSON = "https://raw.githubusercontent.com/t-davidson/hate-speech-and-offensive-language/master/lexicons/refined_ngram_dict.csv"


def fetch_davidson():
    print("Fetching Davidson...")
    try:
        with urllib.request.urlopen(SOURCE_DAVIDSON) as response:
            content = response.read().decode("utf-8")
            print(f"Content Start: {content[:50]}")

            # Debug DictReader
            reader = csv.DictReader(io.StringIO(content))
            print(f"Fieldnames: {reader.fieldnames}")

            count = 0
            added = 0
            for row in reader:
                # Print first row raw
                if count == 0:
                    print(f"Row 0: {row}")

                score = row.get("prophate", "0")

                try:
                    score_val = float(score)
                except Exception:
                    score_val = 0.0

                if score_val > 0.3:
                    added += 1
                count += 1

            print(f"Total Rows: {count}")
            print(f"Added (score > 0.3): {added}")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    fetch_davidson()
