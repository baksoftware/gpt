import json

from openai import OpenAI
import tiktoken

def make_parameters(birds: list[str]):
    assert len(birds) <= 25, "OpenAI can only handle 25 birds at once with this schema"
    messages = [
        {"role": "system", "content": "You are a biologist specializing in birds who has been tasked with describing danish birds."},
        {"role": "user", "content": 
         "For each bird, please describe its color, temperment, taste, typical number of eggs, and how long time it lay on the nest, their danish common name, in two words or less. Reply in JSON."},
    ]
    json_schema = {
        "type": "object",
        "properties": {
            v: {
                "type": "object",
                "properties": {
                    
                    "color": {"type": "string"},
                    "temperament": {"type": "string"},
                    "taste": {"type": "string"},
                    "eggs": {"type": "number"},
                    "nestingDays": {"type": "number"},
                    "danishName": {"type": "string"},
                },
                "required": ["color","temperament","taste", "eggs", "nestingDays", "danishName"],
                "additionalProperties": False,
            }
            for v in birds
        },
        "required": birds,
        "additionalProperties": False,
    }
    
    return {
        "messages": messages,
        "model": "gpt-4o-mini",
        "temperature": 0.1,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "summarization",
                "strict": True,
                "schema": json_schema,
            }
        }
    }

client = OpenAI()
parameters = make_parameters(
    [
        "Common Blackbird (Turdus merula)",
        "Eurasian Blue Tit (Cyanistes caeruleus)",
        "European Robin (Erithacus rubecula)",
        "House Sparrow (Passer domesticus)",
        "Barn Swallow (Hirundo rustica)",
        "Eurasian Magpie (Pica pica)",
        "Common Chaffinch (Fringilla coelebs)",
        "European Starling (Sturnus vulgaris)",
        "Mute Swan (Cygnus olor)",
        "Common Eider (Somateria mollissima)",
    ]    
    )

encoder = tiktoken.encoding_for_model(parameters["model"])
answer = client.chat.completions.create(**parameters)

message = answer.choices[0].message.content
print(message)
local_output_tokens = len(encoder.encode(message))

print("encoder is valid?", local_output_tokens == answer.usage.completion_tokens)
print("with spaces:", local_output_tokens)
print("without whitespace:", len(encoder.encode(json.dumps(json.loads(message), separators=(",", ":")))))