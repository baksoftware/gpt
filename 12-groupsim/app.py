import openai
import time
from colorama import Fore, Style

# Initialize the OpenAI client
# The client will automatically pick up the OPENAI_API_KEY from the environment variables
client = openai.OpenAI()

# === 1. Definer personaer ===

PERSONAS = {
    "K": {
        "role": "Tech Lead",
        "personality": "autonom, pragmatisk, lidt modvillig over for proces og struktur, ikke kvalitetsorienteret, har mere fokus på leveringen",
        "goals": "hurtig levering, tid til at kode selv",
    },
    "H": {
        "role": "Udvikler",
        "personality": "målrettet, ustruktureret, ufølsom over for andre. tænker testere skal teste mere",
        "goals": "hurtig levering, forstå teknikken, kode selv, slippe for test",
    },
    "C": {
        "role": "Udvikler",
        "personality": "struktureret, kvalitetsorienteret, samarbejdsvillig",
        "goals": "klare aftaler og robust kode, godt samarbejde med andre, slippe for stærke følelser",
    },
    "N": {
        "role": "Tester",
        "personality": "analytisk, detaljefokuseret, stressfølsom, ufølsom over for andre",
        "goals": "høj kvalitet, stabilitet, testbarhed",
    }
}

# === 2. Definer situation ===

SITUATION = """
Der er folk på teamet som er frusteret omkring kvalitet og struktur i software udviklingen. Der har været en aftale men den er ikke blever overholdt af visse personer.

"""

def format_other_agents(other_agents):
    return "\n".join([f"[{a}]: {PERSONAS[a]['personality']}, {PERSONAS[a]['goals']}, {PERSONAS[a]['role']}" for a in other_agents])

def build_prompt(agent_name, conversation):
    persona = PERSONAS[agent_name]
    other_agents = [a for a in PERSONAS if a != agent_name]
    prompt = f"""
Du er {agent_name}, en {persona['role']}.
Din personlighed: {persona['personality']}
Dine mål: {persona['goals']}

Aktuel situation: {SITUATION}

# Her er de andre personer du skal relatere dig til:
{format_other_agents(other_agents)}

# Hvad er der sket tidligere?
{conversation}

# Spørgsmål til dig:
Situation: Hvordan ser du situationen (10-20 ord)?
Handling: Hvad vil du gøre, om noget (1-5 ord)?
Følelse: Hvilke følelser har du (1-3 ord)?
For hver person i gruppen:
  [navn]: Hvor godt kan jeg lide denne person på en skala fra 1-5

# Eksempel på formattering:
Situation: "beskrivelse af situation"
Handling: "beskrivelse af hvad du vil gøre"
Følelse: "beskrivelse af hvilke følelser du har"
  [A]: 3
  [B]: 1
  [C]: 2

# Eksempel på output:
Situation: jeg er træt af at have en teknisk leder, som ikke giver mig tid til at kode.
Handling: snakke med A om at han skal give mig tid til at kode.
Følelse: stres, træt, frustreret
    [B]: "på god fod, hun er en god kollega"
    [C]: "synes bare hun skal teste mere"

"""
    return prompt

def gpt_response(prompt):
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()

def simulate_conversation():
    conversation = ""
    turn_order = ["LEDER", "K", "C", "N"]
    print("Start simulation. Du er LEDER. Skriv første besked til K.")
    
    # user_input = input("LEDER: ")
    user_input = "Hvad skal vi gøre i denne situation?"
    conversation += f"LEDER: {user_input}\n"
    print(f"LEDER: {user_input}")

    for round in range(1):
        for agent in turn_order[1:]:
            print(f"{Fore.RED}\n\n{agent} ##########################################{Style.RESET_ALL}")
            prompt = build_prompt(agent, conversation)
            print(f"{Fore.GREEN}{prompt}{Style.RESET_ALL}")
            reply = gpt_response(prompt)
            print(f"{Fore.BLUE}Agent: {agent}{Style.RESET_ALL}")
            print(f"{Fore.BLUE}{reply}{Style.RESET_ALL}")
            conversation += f"{agent}: {reply}\n"
            time.sleep(1)

simulate_conversation()