"""
Predefined tags for Mubert API integration.

Mubert uses a specific list of tags (genres, moods, activities) to steer generation.
Since we cannot pass arbitrary text to the API, we match keywords from the user's
prompt against this list.
"""

MUBERT_TAGS = [
    # Genres
    "ambient",
    "binaural",
    "chill",
    "classical",
    "dance",
    "disco",
    "drum and bass",
    "dubstep",
    "edm",
    "electronica",
    "funk",
    "hip hop",
    "house",
    "jazz",
    "k-pop",
    "lo-fi",
    "lounge",
    "metal",
    "pop",
    "punk",
    "r&b",
    "reggae",
    "rock",
    "soul",
    "techno",
    "trance",
    "trap",
    "synthwave",
    "world",

    # Moods / Activities
    "calm",
    "dark",
    "dreamy",
    "energetic",
    "epic",
    "focus",
    "happy",
    "meditation",
    "melancholic",
    "motivational",
    "peaceful",
    "relax",
    "sad",
    "scary",
    "sleep",
    "sport",
    "study",
    "suspense",
    "uplifting",
    "workout",
    "yoga",

    # Instruments (sometimes used as tags)
    "piano",
    "guitar",
    "drums",
    "synth",
    "strings",
    "bass",
]
