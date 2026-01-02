import urllib.request
import csv
import io

SOURCE_IMANE = "https://raw.githubusercontent.com/imanebelhaj/profanity_datasets_offensive_speach/master/bad_words_langs.csv"


def fetch_imane():
    print(f"Fetching from {SOURCE_IMANE}...")
    try:
        with urllib.request.urlopen(SOURCE_IMANE) as response:
            content = response.read().decode("utf-8")
            print(f"Content length: {len(content)}")
            print(f"First 100 chars: {content[:100]}")

            reader = csv.DictReader(io.StringIO(content))
            print(f"Fieldnames: {reader.fieldnames}")

            count = 0
            bad_count = 0
            for row in reader:
                count += 1
                if count < 5:
                    print(f"Row {count}: {row}")

                # Check filter logic
                word = row.get("text")
                label = row.get("label")
                if word and str(label).strip() == "1":
                    bad_count += 1

            print(f"Total Rows: {count}")
            print(f"Rows matching label='1': {bad_count}")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    fetch_imane()
