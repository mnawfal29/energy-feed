import torch
from transformers import BartTokenizer, BartForConditionalGeneration
from transformers import pipeline

"""
We have used BRIO(Bringing Order to Abstractive Summarization) for performing our summarization.
It performs abstractive summarization while preserving case-sensitivity unlike other ConditionalGeneration Models like t5
"""
device = 0 if torch.cuda.is_available() else -1
model = BartForConditionalGeneration.from_pretrained("Yale-LILY/brio-cnndm-cased")
tokenizer = BartTokenizer.from_pretrained("Yale-LILY/brio-cnndm-cased")
summarizer = pipeline(
    "summarization",
    model=model,
    tokenizer=tokenizer,
    truncation=True,
    device=device,
)
