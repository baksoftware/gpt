# Wow Cards

## User journey

See 10 cards with interesting concepts, thoughts and ideas
Click on one of them to retrieve nearby cards (click back to go back)

Type in a topics box, and click enter to get 10 new cards about the topic (then you can't go back).

## Technology
- python
- streamlit UI
- OpenAI for information
- Cache OpenAI calls stored in JSON files in the cache directory. Use the hash of the topic (or card title) as the file name of the cache (append .json)

## Setup

1.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
2.  Set up your OpenAI API key in Streamlit secrets. Create a file `~/.streamlit/secrets.toml` with:
    ```toml
    [openai]
    api_key="YOUR_API_KEY"
    ```
3.  Run the app:
    ```bash
    streamlit run app.py
    ``` 

For debugging you can add this flag `streamlit run --server.runOnSave true app.py`
