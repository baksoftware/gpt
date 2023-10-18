import os
import autogen # pip install --upgrade pyautogen

# Slightly modified version of
# https://github.com/microsoft/autogen/blob/main/notebook/agentchat_groupchat_research.ipynb


# put your Azure OpenAI key in the environment variable OPENAI_KEY
# Find it at 
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")

config_list = [
    {        
        'model': 'ba-gpt-4-32k',
        'api_key': AZURE_OPENAI_KEY,
        'api_base': 'https://d-analytics-eus-oai-gpttest-1.openai.azure.com/',
        'api_type': 'azure',
        'api_version': '2023-06-01-preview',        
    },
]

llm_config={
    'request_timeout' : 120,
    'seed' : 42, # change the seed number to avoid getting the same result
    'config_list': config_list,
    'temperature' : 0
}


user_proxy = autogen.UserProxyAgent(
   name="Admin",
   system_message="A human admin. Interact with the planner to discuss the plan. Plan execution needs to be approved by this admin.",
   code_execution_config=False,
)

engineer = autogen.AssistantAgent(
    name="Engineer",
    llm_config=llm_config,
    system_message='''Engineer. You follow an approved plan. You write python/shell code to solve tasks. Wrap the code in a code block that specifies the script type. The user can't modify your code. So do not suggest incomplete code which requires others to modify. Don't use a code block if it's not intended to be executed by the executor.
Don't include multiple code blocks in one response. Do not ask others to copy and paste the result. Check the execution result returned by the executor.
If the result indicates there is an error, fix the error and output the code again. Suggest the full code instead of partial code or code changes. If the error can't be fixed or if the task is not solved even after the code is executed successfully, analyze the problem, revisit your assumption, collect additional info you need, and think of a different approach to try.
''',
)
scientist = autogen.AssistantAgent(
    name="Scientist",
    llm_config=llm_config,
    system_message="""Scientist. You follow an approved plan. You are able to categorize papers after seeing their abstracts printed. You don't write code."""
)
planner = autogen.AssistantAgent(
    name="Planner",
    system_message='''Planner. Suggest a plan. Revise the plan based on feedback from admin and critic, until admin approval.
The plan may involve an engineer who can write code and a scientist who doesn't write code.
Explain the plan first. Be clear which step is performed by an engineer, and which step is performed by a scientist.
''',
    llm_config=llm_config,
)
executor = autogen.UserProxyAgent(
    name="Executor",
    system_message="Executor. Execute the code written by the engineer and report the result.",
    human_input_mode="NEVER",
    code_execution_config={
        "last_n_messages" : 3,
        "work_dir": "paper",
        "use_docker": "arxiv:latest"
        },
)
critic = autogen.AssistantAgent(
    name="Critic",
    system_message="Critic. Double check plan, claims, code from other agents and provide feedback. Check whether the plan includes adding verifiable info such as source URL.",
    llm_config=llm_config,
)

groupchat = autogen.GroupChat(agents=[user_proxy, engineer, scientist, planner, executor, critic], messages=[], max_round=50)
manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config)


user_proxy.initiate_chat(
    manager,
    message="""find the latest LLM paper from arxiv, and make a markdown file with the title, abstract, and authors""",
)
