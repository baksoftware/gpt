#!/usr/bin/env python3
"""
Medical Reference Finder

https://platform.openai.com/docs/guides/tools-web-search?api-mode=chat#page-top
"""

from openai import OpenAI
client = OpenAI()

completion = client.chat.completions.create(
    model="gpt-4o-search-preview",
    web_search_options={},
    messages=[
        {
            "role": "user",
            "content": "Give me a list of 5 medical references about the topic of 'diabetic ketoacidosis'",
        }
    ],
)

print(completion.choices[0].message.content)