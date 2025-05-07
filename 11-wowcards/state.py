import streamlit as st

def init_session_state():
    """Initializes the Streamlit session state for the card explorer."""
    if 'search_query' not in st.session_state:
        st.session_state.search_query = "10 random cards"
    if 'cards' not in st.session_state:
        # Structure: List of Card Pydantic objects (or dicts)
        st.session_state.cards = []
