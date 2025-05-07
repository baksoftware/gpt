import streamlit as st
# Updated imports for wizard flow
# from state import ( # Removed empty import
# )
from card_query import generate_cards # Updated import

def display_search_box_and_cards(container):
    """Displays the search box and 10 cards based on the search query."""
    search_query = container.text_area(
        label="Enter your topic:", # Changed label
        label_visibility="collapsed",
        key="search_input", # Changed key
        placeholder="Enter a topic to explore...", # Changed placeholder
        value=st.session_state.get('search_query', ""), # Use a new state variable for search query
        height=150,
        on_change=lambda: setattr(st.session_state, 'search_query', st.session_state.search_input)
    )

    if container.button("Search", key="search_button"): # Changed button text and key
        if st.session_state.search_query:
            st.session_state.cards = [] # Clear previous cards
            with st.spinner("Fetching cards..."):
                card_list_data = generate_cards(st.session_state.search_query)
                if card_list_data and card_list_data.cards:
                    # Convert Pydantic models to dicts for storing in session state if necessary,
                    # or access attributes directly if session state handles Pydantic objects well.
                    # Streamlit generally works well with Pydantic objects directly in session state.
                    st.session_state.cards = card_list_data.cards
                else:
                    st.session_state.cards = [] # Ensure it's an empty list on failure
                    # Error is already shown by generate_cards
            st.rerun()
        else:
            st.warning("Please enter a topic to search.")

    # --- Card Display ---
    if st.session_state.get('cards', []):
        container.write(f"Found {len(st.session_state.cards)} cards for: {st.session_state.search_query}")
        # Display cards in a more structured way, e.g., 2 columns for better layout
        cols = container.columns(2)
        for i, card_data in enumerate(st.session_state.cards):
            col_index = i % 2
            with cols[col_index]:
                with st.container(border=True):
                    # card_data is now a Card Pydantic object, access attributes directly
                    st.markdown(f"### {card_data.title}")
                    st.markdown(card_data.content)
                    # Placeholder for click functionality (retrieve nearby cards)
                    button_label = card_data.title if len(card_data.title) <= 25 else card_data.title[:22] + "..."
                    if st.button(f"Explore '{button_label}'", key=f"explore_card_{i}", help="Click to find related cards (not implemented yet)"):
                        st.info(f"Exploring nearby cards for: {card_data.title} (not yet implemented)")
                        # Future: st.session_state.selected_card_for_nearby_search = card_data
                        # Future: Call a function to get nearby cards
                        # Future: st.rerun()
        
    elif st.session_state.get('search_query') and not st.session_state.get('cards'):
        # This case is when search was done, spinner finished, but no cards were found (error handled in generate_cards)
        # Or if generate_cards returned None/empty list explicitly and an error was shown.
        # We might not need a specific message here if generate_cards handles user feedback.
        pass 