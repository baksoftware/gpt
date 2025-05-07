import streamlit as st
from state import init_session_state

from app_ui import display_search_box_and_cards

def main():
    st.set_page_config(page_title="Problem helper", page_icon=":question:", layout="wide")

    st.markdown(
        r"""
        <style>
        .stDeployButton {
                visibility: hidden;
            }
        </style>
        """, unsafe_allow_html=True
    )


    # Initialize state
    init_session_state()

    #    st.session_state.problem_description = "I'm doing a full day for my engineering tribe about AI assisted coding.  Help me figure out what the goals I want are, and what should happen at the workshop."

    # Display the search box and wizard (will be modified to just search box and cards)
    display_search_box_and_cards(st)

if __name__ == "__main__":
    main() 