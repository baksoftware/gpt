import openai
import streamlit as st
import json
from enum import Enum
from pydantic import BaseModel, ValidationError
from typing import Type, Optional, Any
from hashlib import sha256
from json_cache import get_json_cache, save_json_cache

# load model configuration from config.json
with open('config.json', 'r') as f:
    config = json.load(f)

def get_openai_client():
    """Initializes and returns the OpenAI client using Streamlit secrets."""
    api_key = st.secrets.get("openai", {}).get("api_key")
    if not api_key:
        st.error("OpenAI API key not found. Please set it in Streamlit secrets.")
        st.stop()
    return openai.OpenAI(api_key=api_key)


class ModelSpeed(Enum):
    FAST = "fast"
    MEDIUM = "medium"
    BEST = "best"

def get_model(model_speed: ModelSpeed) -> str:
    return config["openai_models"][model_speed.value]

def call_llm(
    prompt: str,
    model_speed: ModelSpeed,
    expected_schema: Type[BaseModel],
    system_message: str = "You are a helpful assistant. Output JSON.",
    temperature: float = 0.7,
) -> Optional[BaseModel]:
    """
    Calls the OpenAI API with caching and validates the response against a Pydantic schema.

    Args:
        cache_key: Key for caching the response.
        prompt: The user prompt to send to the LLM.
        model: The OpenAI model to use.
        response_format: The desired response format (e.g., {"type": "json_object"}).
        expected_schema: The Pydantic model to validate the response against.
        system_message: The system message for the LLM.
        temperature: The sampling temperature for the LLM.

    Returns:
        A Pydantic object matching the expected_schema if successful, None otherwise.
    """
    cache_key = sha256(prompt.encode('utf-8')).hexdigest()
    cache = get_json_cache(cache_key)
    
    if cache is not None:
        try:
            # Validate cached data against the schema
            validated_data = expected_schema.model_validate(cache)
            print(f"Cache hit and validated for key: {cache_key}")
            return validated_data
        except ValidationError as e:
            print(f"Cache found for key '{cache_key}' but failed validation: {e}. Re-fetching.")
        except Exception as e:
            print(f"Error processing cache for key '{cache_key}': {e}. Re-fetching.")

    print(f"Cache miss or invalid for key: {cache_key}. Calling OpenAI API...")
    client = get_openai_client()

    selectedModel = config["openai_models"][model_speed.value]
    print(f"Selected model: {selectedModel}")

    response_content = None # Initialize in case of early exit
    try:
        completion = client.chat.completions.create(
            model=selectedModel,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=temperature,
        )
        response_content = completion.choices[0].message.content

        print(f"Response content: {response_content}")
        # Parse the JSON string response
        data = json.loads(response_content)

        # Validate the parsed data against the Pydantic schema
        validated_data = expected_schema.model_validate(data)

        # Save the original *parsed JSON data* to cache, not the validated Pydantic object
        save_json_cache(cache_key, data)
        print(f"Successfully fetched, validated, and cached data for key: {cache_key}")
        return validated_data

    except openai.APIError as e:
        st.error(f"OpenAI API returned an API Error: {e}")
    except json.JSONDecodeError:
        st.error(f"Failed to decode JSON response from LLM: {response_content}")
    except ValidationError as e:
        st.error(f"LLM response failed schema validation: {e}")
        print(f"Response: {response_content}")
    except Exception as e:
        st.error(f"An unexpected error occurred: {e}")

    return None # Return None in case of any errors 