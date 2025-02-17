import asyncio
import aiomas

class Agent(aiomas.Agent):
    def __init__(self, container, name):
        super().__init__(container)
        self.name = name

    async def greet(self, other_agent_name):
        print(f"{self.name}: Hello, {other_agent_name}!")

async def main():
    # Create a container for the agents
    container = await aiomas.Container.create(('localhost', 5555))

    # Create two agents
    agent1 = Agent(container, 'Agent1')
    agent2 = Agent(container, 'Agent2')

    # Agents greet each other
    await agent1.greet(agent2.name)
    await agent2.greet(agent1.name)

if __name__ == '__main__':
    asyncio.run(main())