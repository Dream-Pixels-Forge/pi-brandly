import json, random, sys
from pathlib import Path

DATA = Path(__file__).parent / "data"

def load(name):
    path = DATA / f"{name}.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def build_general_prompt():
    cats = ["styles", "materials", "lighting", "color_palettes", "negative_prompt", "prompt_templates"]
    db = {c: load(c) for c in cats}
    template = random.choice(db["prompt_templates"])
    return template.format(
        quality="ultra premium",
        style=random.choice(db["styles"]),
        materials=", ".join(random.sample(db["materials"], k=min(3, len(db["materials"])))),
        lighting=random.choice(db["lighting"]),
        composition="dynamic asymmetrical composition",
        color_palettes=random.choice(db["color_palettes"]),
        negative_prompt=", ".join(db["negative_prompt"])
    )

def build_abstract_background():
    ab = load("abstract-backgrounds")
    if not ab:
        return "Error: abstract-backgrounds.json not found in data/"
    return random.choice(ab)

if len(sys.argv) > 1 and sys.argv[1] == "--abstract-background":
    print(build_abstract_background())
else:
    print(build_general_prompt())
