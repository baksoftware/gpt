import time
import os
from langchain_openai.chat_models import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage, AIMessage

# Ensure your OpenAI API key is set in your environment:
# export OPENAI_API_KEY="YOUR_API_KEY"

# Define system messages for each agent
therapist_system = SystemMessage(
    content=(
        "You are a compassionate and patient therapist. "
        "Help the client explore their feelings and gently guide them through their depression."
    )
)

client_system = SystemMessage(
    content=(
        "You are a client struggling with depression. "
        "Express your feelings honestly and share your thoughts and experiences openly."
    )
)

# Create an instance of ChatOpenAI from langchain-openai using your chosen model.
llm = ChatOpenAI(model_name="o3-mini")

# Initialize shared conversation history with an initial message from the client.
conversation_history = []
initial_client_message = HumanMessage(
    content="I'm feeling really depressed and hopeless these days. I don't see any point in anything anymore."
)
conversation_history.append(initial_client_message)

def generate_reply(system_msg, history):
    """
    Generates a reply using the provided system message and conversation history.
    """
    # Combine the system message with the conversation history.
    messages = [system_msg] + history
    # Call the LLM to generate a response. The response is returned as an AIMessage.
    response = llm.invoke(messages)
    return response

# Set the number of conversation turns.
num_turns = 5

for turn in range(num_turns):
    print(f"\n--- Turn {turn+1} ---\n")
    
    # Therapist's turn:
    therapist_reply = generate_reply(therapist_system, conversation_history)
    print("Therapist:", therapist_reply.content)
    conversation_history.append(AIMessage(content=therapist_reply.content))
    time.sleep(1)
    
    # Client's turn:
    client_reply = generate_reply(client_system, conversation_history)
    print("Client:", client_reply.content)
    conversation_history.append(AIMessage(content=client_reply.content))
    time.sleep(1)