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

def generate_cards(topic: str) -> Optional[CardList]:
    """Generates 10 cards with concepts, thoughts, and ideas related to a topic."""
    cache_key = f"cards_topic_v1_{topic.replace(' ', '_').lower()}" # Cache based on topic

    prompt = f"""
    Topic: {topic}

    Generate exactly 10 cards related to this topic.
    Each card should present an interesting concept, thought, or idea.
    For each card, provide a concise 'title' (3-15 words) and 'content' (1-3 sentences, around 20-70 words).

    Return the result in the following JSON format:

    {{ "cards": [ {{ "title": "<CARD_TITLE_1>", "content": "<CARD_CONTENT_1>" }}, ... ] }}
    """

    system_message = ("You are an insightful assistant skilled at generating concise and engaging content cards based on a given topic. "
                      "Output valid JSON matching the requested schema, providing exactly 10 cards.")

    result = call_llm(
        prompt=prompt,
        model_speed=ModelSpeed.MEDIUM,
        expected_schema=CardList,
        system_message=system_message,
        temperature=0.7 # Higher temperature for more diverse and creative ideas
    )

    if result:
        return result
    else:
        st.error(f"Failed to generate or validate cards for the topic: {topic}")
        return None
