import streamlit as st
from pydantic import BaseModel, Field, ValidationError
from typing import List, Optional
from llm import call_llm, ModelSpeed

# --- Pydantic Schemas for Validation ---

class Card(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    content: str = Field(..., min_length=10, max_length=500)

class CardList(BaseModel):
    cards: List[Card] = Field(..., min_items=1, max_items=100)

class CardData(BaseModel):
    title: str = Field(..., description="The title of the card")
    content: str = Field(..., description="The content of the card, 2-3 sentences")
    # query: str = Field(..., description="A query to run to get more information on this topic") # Assuming this was for related, not dig deeper

class CardListData(BaseModel):
    cards: List[CardData] = Field(..., description="A list of cards")

PROMPT_GENERATE_CARDS = """
# Role: Idea Explorer Assistant

## Goal:
Generate a list of 3-5 distinct but related "cards" based on the user's topic. Each card should present a sub-topic, a related concept, or a question that encourages further exploration. The user is looking for a quick overview and pointers to branch out their understanding.

## Card Structure:
Each card must have:
1.  **title**: A concise and engaging title (3-7 words).
2.  **content**: A brief explanation or exploration of the title (2-3 sentences).

## Instructions:
- Analyze the user's input topic: "{user_topic}".
- Brainstorm 3-5 diverse yet relevant sub-topics or angles.
- For each, craft a `title` and `content` as described above.
- Ensure the cards offer a good spread of ideas stemming from the main topic.
- Output a JSON object following this Pydantic schema:
  ```json
  {{
    "cards": [
      {{
        "title": "string",
        "content": "string"
      }}
    ]
  }}
  ```
- Do not include any conversational fluff or explanations outside the JSON structure.
"""

@st.cache_data(show_spinner=False) # This spinner is for the initial card generation
def generate_cards(user_topic: str) -> Optional[CardListData]:
    """Generates a list of cards based on the user_topic."""
    if not user_topic:
        return None
    
    prompt = PROMPT_GENERATE_CARDS.format(user_topic=user_topic)
    
    response_data = call_llm(
        prompt=prompt,
        model_speed=ModelSpeed.MEDIUM, # Or another speed as preferred
        expected_schema=CardListData,
        system_message="You are an assistant that generates topical cards and outputs valid JSON."
    )
    return response_data

class ExpandedTopicData(BaseModel):
    markdown_content: str = Field(..., description="The detailed explanation of the topic in Markdown format.")

PROMPT_EXPAND_TOPIC = """
# Role: Content Expander Bot

## Goal:
Provide a detailed explanation and expansion of the given topic. The output should be in Markdown format.

## Topic to Expand:
Title: "{topic_title}"
Content: "{topic_content}"

## Instructions:
- Elaborate on the provided topic title and content.
- Provide additional details, context, examples, or related information.
- The output MUST be a single Markdown string.
- Structure the information clearly using Markdown headings, lists, bold text, etc., where appropriate.
- Aim for a comprehensive yet readable explanation.
- Output a JSON object following this Pydantic schema:
  ```json
  {{
    "markdown_content": "string (Markdown formatted)"
  }}
  ```
- Do not include any conversational fluff or explanations outside the JSON structure. Ensure the entire Markdown output is a single string within the "markdown_content" field.
"""

# The llm.call_llm function already has caching, so we don't need @st.cache_data here
def expand_topic_details(topic_title: str, topic_content: str) -> Optional[str]:
    """Expands on a given topic title and content using the LLM, returning Markdown."""
    if not topic_title or not topic_content:
        return None

    prompt = PROMPT_EXPAND_TOPIC.format(topic_title=topic_title, topic_content=topic_content)

    response_data = call_llm(
        prompt=prompt,
        model_speed=ModelSpeed.MEDIUM, # Consider making this configurable or choosing based on expected depth
        expected_schema=ExpandedTopicData,
        system_message="You are an assistant that expands on topics and outputs valid JSON containing Markdown."
    )

    if response_data:
        return response_data.markdown_content
    return None
