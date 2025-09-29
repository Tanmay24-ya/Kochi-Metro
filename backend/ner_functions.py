import spacy
from spacy.matcher import PhraseMatcher
import re
from langdetect import detect, DetectorFactory
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

# --- English spaCy model ---
nlp_en = spacy.load("en_core_web_md")

# --- Malayalam / IndicNER model ---
indic_model_name = "ai4bharat/IndicNER"
tokenizer = AutoTokenizer.from_pretrained(indic_model_name)
model = AutoModelForTokenClassification.from_pretrained(indic_model_name)
indic_ner = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")

# Consistent language detection
DetectorFactory.seed = 0

def get_deadline(dates, docs, text, nlp):
    deadline_keywords = [
        "deadline", "due", "by", "before", "expires", "submission", "submit by", "deadline",
        "due date", "last date", "cut-off date", "closing date", "final date", "end date",
        "last date for submission", "due for submission", "to be submitted by", "bid submission end date",
        "tender submission date", "online submission deadline", "closing time for submission",
        "application deadline", "application closing date", "last date for applying", "proposal due date",
        "proposal submission deadline", "RFP submission date", "EOI submission date (Expression of Interest)",
        "tender closing date", "bid closing date", "last date of receipt of bids", "last date of receipt of tenders",
        "shall not be accepted after", "no application will be entertained after", "valid till", "to reach by",
        "on or before", "time limit for submission", "period ends on", "Bid End Date/Time",
        "അവസാന തീയതി", "അവസാന ദിവസം", "സമർപ്പിക്കേണ്ട അവസാന ദിവസം",
        "സമർപ്പിക്കേണ്ട തീയതി", "അടയ്ക്കേണ്ട അവസാന ദിവസം",
        "അപേക്ഷ സമർപ്പിക്കേണ്ട അവസാന തീയതി", "അപേക്ഷ അവസാന ദിവസം",
        "പ്രമേയം സമർപ്പിക്കേണ്ട അവസാന ദിവസം"
    ]

    matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
    pattern = [nlp(keyword) for keyword in deadline_keywords]
    matcher.add("DEADLINE_KEYWORD", pattern)
    entity = []

    for date_str in dates:
        start_pos = text.find(date_str)
        if start_pos == -1:
            # date string not found, skip
            continue
        end_pos = start_pos + len(date_str)
        span = docs.char_span(start_pos, end_pos)
        if span is None:
            continue
        sentence = span.sent
        date_start = span.start

        for match_id, start, end in matcher(docs):
            if abs(start - date_start) <= 10:
                entity.append(sentence.text)
    return list(set(entity))

def get_financial_details(entities, docs, text, nlp):
    entity = []
    for ent in entities:
        start_pos = text.find(ent)
        if start_pos == -1:
            continue
        end_pos = start_pos + len(ent)
        span = docs.char_span(start_pos, end_pos)
        if span is not None:
            entity.append(span.sent.text)
        else:
            entity.append(ent)
    return list(set(entity))

def ner_extraction_en(text, nlp):
    docs = nlp(text)
    spacy_dates = [ent.text for ent in docs.ents if ent.label_ == 'DATE']
    spacy_money = [ent.text for ent in docs.ents if ent.label_ == 'MONEY']

    # Regex for dates and money
    regex_dates = re.findall(r"\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}", text)
    simple_regex_dates = re.findall(r"\d{2}-\d{2}-\d{4}", text)
    regex_money = re.findall(r"(?:Rs\.?|₹)\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?", text)

    all_dates = set(spacy_dates + regex_dates + simple_regex_dates)
    all_money = set(spacy_money + regex_money)

    deadlines = get_deadline(all_dates, docs, text, nlp)
    money = get_financial_details(all_money, docs, text, nlp)

    return {
        "deadlines": deadlines,
        "financials": money
    }


def split_sentences_ml(text):
    # Split using Malayalam and English sentence delimiters
    return re.split(r'(?<=[.?!।])\s+', text)

def ner_extraction_ml(text):
    results = indic_ner(text)
    deadlines, financials = [], []

    sentences = split_sentences_ml(text)

    def find_sentence(word):
        for sent in sentences:
            if word in sent:
                return sent.strip()
        return word

    # --- Model-based entities ---
    for r in results:
        entity_grp = r.get("entity_group")
        word = r.get("word")
        if entity_grp in ["DATE", "TIME"]:
            deadlines.append(find_sentence(word))
        elif entity_grp in ["MONEY", "CURRENCY"]:
            financials.append(find_sentence(word))

    # --- Regex-based money ---
    regex_money_ml = re.findall(r"(?:₹|രൂപ)\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?", text)
    for m in regex_money_ml:
        financials.append(find_sentence(m))

    # --- Regex-based dates (months + weekdays + day number) ---
    keywords_ml = [
        "ജനുവരി","ഫെബ്രുവരി","മാർച്ച്","ഏപ്രിൽ","മേയ്","ജൂൺ",
        "ജൂലൈ","ഓഗസ്റ്റ്","സെപ്റ്റംബർ","ഒക്ടോബർ","നവംബർ","ഡിസംബർ",
        "ഞായറാഴ്ച","തിങ്കളാഴ്ച","ചൊവ്വാഴ്ച","ബുധനാഴ്ച",
        "വ്യാഴാഴ്ച","വെള്ളിയാഴ്ച","ശനിയാഴ്ച"
    ]

    for key in keywords_ml:
        matches = re.findall(rf"{key}\s?\d{{1,2}}", text)
        for m in matches:
            deadlines.append(find_sentence(m))

    return {
        "deadlines": list(set(deadlines)),
        "financials": list(set(financials))
    }



def ner_extraction_multilingual(text):
    try:
        lang = detect(text)
    except:
        lang = "en"

    if lang == "en":
        return ner_extraction_en(text, nlp_en)
    elif lang == "ml":
        return ner_extraction_ml(text)
    else:
        # Unsupported language - return empty results
        return {"deadlines": [], "financials": []}

# Example test
if __name__ == "_main_":
    text_en = "The payment of Rs. 500 is due by 15-10-2025 10:30:00. Submission deadline is 20-10-2025."
    text_ml = "പണം അടയ്ക്കേണ്ട അവസാന തീയതി നവംബർ 5 ആണ്. പ്രമേയം സമർപ്പിക്കേണ്ട അവസാന ദിവസം വാർത്തയിൽ അറിയിച്ചിട്ടുണ്ട്, ₹1000 നൽകണം."

    print("English Text Extraction:", ner_extraction_multilingual(text_en))
    print("Malayalam Text Extraction:", ner_extraction_multilingual(text_ml))