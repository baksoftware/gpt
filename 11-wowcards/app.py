import streamlit as st
from state import init_session_state

from app_ui import display_search_box_and_cards

def main():
    st.set_page_config(page_title="Problem helper", page_icon=":question:", layout="wide")

    init_session_state()

    display_search_box_and_cards(st.container())

if __name__ == "__main__":
    main() 