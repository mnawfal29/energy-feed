import re


def fix_text(text):
    # Replace multiple spaces with a single space
    text = re.sub(r"\s+", " ", text)
    # Capitalize the first letter of the first word in each sentence
    text = re.sub(r"(?<=\w\.\s)", lambda m: m.group().upper(), text)
    # Add a period at the end of each sentence that doesn't have one
    text = re.sub(r"(?<=[^\w\.])(?<!\.)\s", lambda m: m.group() + ".", text)
    # Remove the space before a period
    text = re.sub(r"\s+\.", ".", text)
    # Replace ,. with ,
    text = text.replace(",.", ",")
    # Replace .. with .
    text = text.replace("..", ".")
    return text
