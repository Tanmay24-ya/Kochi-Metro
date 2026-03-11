import json

with open("d:\\DocuSphere\\Kochi-Metro\\Notebooks\\sih_classfication_final_(3).ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

for i, cell in enumerate(nb["cells"]):
    if "outputs" in cell:
        for out in cell["outputs"]:
            if "text" in out:
                text = "".join(out["text"])
                if "eval" in text.lower() or "0." in text or "acc" in text.lower():
                    print(f"Cell {i} Output:\n", text[:500])
            elif "data" in out and "text/plain" in out["data"]:
                text = "".join(out["data"]["text/plain"])
                if "eval" in text.lower() or "0." in text or "acc" in text.lower():
                    print(f"Cell {i} Output:\n", text[:500])
