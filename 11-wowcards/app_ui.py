import streamlit as st
# Updated imports for wizard flow
# from state import ( # Removed empty import
# )
from card_query import generate_cards, expand_topic_details # Updated import

def display_search_box_and_cards(container):
    """Displays the search box, cards, and navigation buttons."""

    # Initialize session state for the dig deeper drawer if not already present
    if 'drawer_topic_title' not in st.session_state:
        st.session_state.drawer_topic_title = None
    if 'drawer_topic_content' not in st.session_state:
        st.session_state.drawer_topic_content = None
    if 'expanded_content' not in st.session_state:
        st.session_state.expanded_content = None
    if 'dig_deeper_active' not in st.session_state: # To control sidebar visibility more directly
        st.session_state.dig_deeper_active = False

    # --- Handle "Dig Deeper" Sidebar --- 
    if st.session_state.dig_deeper_active and st.session_state.drawer_topic_title:
        with st.sidebar:
            st.header(st.session_state.drawer_topic_title)
            if st.button("Close Drawer", key="close_drawer_button"):
                st.session_state.dig_deeper_active = False
                st.session_state.drawer_topic_title = None
                st.session_state.drawer_topic_content = None
                st.session_state.expanded_content = None
                st.rerun()
            
            if st.session_state.expanded_content is None and st.session_state.drawer_topic_content:
                with st.spinner("Digging deeper..."):
                    st.session_state.expanded_content = expand_topic_details(
                        st.session_state.drawer_topic_title,
                        st.session_state.drawer_topic_content
                    )
            
            if st.session_state.expanded_content:
                st.markdown(st.session_state.expanded_content)
            elif st.session_state.drawer_topic_content: # Still loading or failed
                st.write("Loading details or no details found.")
            # else: no topic selected for drawer yet

    # --- Handle programmatic updates to search_input for the current run ---
    # This must happen before the text_area widget is instantiated.
    if 'next_run_search_input_value' in st.session_state:
        st.session_state.search_input = st.session_state.next_run_search_input_value
        # Ensure search_query (used for fetching) is also aligned if this was a programmatic update.
        # The calling functions (Next/Back) are responsible for setting search_query appropriately before rerun.
        del st.session_state.next_run_search_input_value

    # Initialize query_history if it doesn't exist
    if 'query_history' not in st.session_state:
        st.session_state.query_history = []
    if 'cards' not in st.session_state: # Ensure cards list exists
        st.session_state.cards = []


    # --- Back Button ---
    # Show back button if there's a history to go back to (more than just the current query if it's already added)
    # or if there's at least one item if the current query isn't yet the last in history.
    # Simplified: show if history has at least one item to potentially go back to.
    # The actual logic inside handles if it's possible to go back.
    if st.session_state.query_history: 
        if container.button("Back", key="back_button"):
            if len(st.session_state.query_history) > 1: # Need at least two items to go "back"
                st.session_state.query_history.pop() # Remove current query from history
                previous_query = st.session_state.query_history[-1] # Get the actual previous query
                
                st.session_state.search_query = previous_query
                st.session_state.next_run_search_input_value = previous_query # For text area display on next run
                
                st.session_state.cards = [] # Clear current cards
                with st.spinner("Fetching cards..."):
                    card_list_data = generate_cards(st.session_state.search_query)
                    if card_list_data and card_list_data.cards:
                        st.session_state.cards = card_list_data.cards
                    else:
                        st.session_state.cards = []
                st.rerun()
            elif len(st.session_state.query_history) == 1 and st.session_state.get('search_query') != st.session_state.query_history[0]:
                # This case handles if we are on a query not yet added to history's end, and want to go to history's only item.
                # However, current history logic in update_history_and_search appends new queries.
                # So, len > 1 is the primary condition.
                # For robustness, if only one item in history, and current search is different, go to that one.
                previous_query = st.session_state.query_history[0]
                st.session_state.search_query = previous_query
                st.session_state.next_run_search_input_value = previous_query
                st.session_state.cards = []
                with st.spinner("Fetching cards..."):
                    card_list_data = generate_cards(st.session_state.search_query)
                    if card_list_data and card_list_data.cards:
                        st.session_state.cards = card_list_data.cards
                    else:
                        st.session_state.cards = []
                st.rerun()
            else:
                # Cannot go back further or history is in an unexpected state
                st.toast("No previous query to go back to.")


    # Determine the value for the text_area.
    # Priority: 1. User's direct input via `st.session_state.search_input` (if it exists from typing or programmatic set)
    #           2. Current `st.session_state.search_query` (the active query for fetching cards)
    #           3. Default empty string.
    # `search_input` is set by `next_run_search_input_value` at the top for programmatic changes.
    # User typing also updates `search_input` due to the key.
    text_area_value = st.session_state.get('search_input', st.session_state.get('search_query', ""))

    search_query_text_area = container.text_area(
        label="Enter your topic:",
        label_visibility="collapsed",
        key="search_input", # This binds the widget's state to st.session_state.search_input
        placeholder="Enter a topic to explore...",
        value=text_area_value, 
        height=68,
        on_change=lambda: setattr(st.session_state, 'search_query_from_input', st.session_state.search_input)
    )
    
    def update_history_and_search(new_query):
        # Add current st.session_state.search_query to history if it's different from the last one 
        # or if history is empty, and it's not an empty string.
        # This is before st.session_state.search_query is updated to new_query.
        current_active_query = st.session_state.get('search_query', "")
        if current_active_query: # Only add non-empty queries
            if not st.session_state.query_history or st.session_state.query_history[-1] != current_active_query:
                st.session_state.query_history.append(current_active_query)

        st.session_state.search_query = new_query # Update the active search query

        # Add the new_query itself to history if it's different from the (now previous) last item.
        # This makes new_query the latest in history.
        if new_query: # Only add non-empty queries
            if not st.session_state.query_history or st.session_state.query_history[-1] != new_query:
                st.session_state.query_history.append(new_query)
            # If new_query is same as last, query_history is already correct.

        st.session_state.cards = [] # Clear previous cards
        with st.spinner("Fetching cards..."):
            card_list_data = generate_cards(st.session_state.search_query)
            if card_list_data and card_list_data.cards:
                st.session_state.cards = card_list_data.cards
            else:
                st.session_state.cards = []
        st.rerun()

    if container.button("Search", key="search_button"):
        # Use the current value from the text_area (bound to st.session_state.search_input)
        query_to_search = st.session_state.get('search_input', "").strip()
        if query_to_search:
            # For a manual search, the text area itself (search_input) is the source of truth.
            # We want search_query to align with search_input.
            st.session_state.search_query = query_to_search 
            update_history_and_search(query_to_search)
        else:
            st.warning("Please enter a topic to search.")
    
    # --- Card Display ---
    if st.session_state.get('cards', []):
        cols = container.columns(2)
        for i, card_data in enumerate(st.session_state.cards):
            col_index = i % 2
            with cols[col_index]:
                with st.container(border=True):
                    st.markdown(f"### {card_data.title}")
                    st.markdown(card_data.content)
                    if st.button("Related", key=f"next_card_{i}"):
                        new_search_query = f"{card_data.title}. {card_data.content}"
                        # Set search_query for the actual search
                        st.session_state.search_query = new_search_query
                        # Set for text_area display on the *next* run
                        st.session_state.next_run_search_input_value = new_search_query
                        # update_history_and_search will use st.session_state.search_query, update history, fetch, rerun
                        update_history_and_search(new_search_query)
                    
                    if st.button("Dig deeper", key=f"dig_deeper_card_{i}"):
                        st.session_state.drawer_topic_title = card_data.title
                        st.session_state.drawer_topic_content = card_data.content
                        st.session_state.expanded_content = None # Reset for new content
                        st.session_state.dig_deeper_active = True
                        st.rerun() # Rerun to show sidebar and trigger content loading
        
    elif st.session_state.get('search_query') and not st.session_state.get('cards'):
        pass # Handled by spinner/generate_cards 