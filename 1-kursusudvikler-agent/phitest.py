from phi.agent import Agent
from phi.model.openai import OpenAIChat
from phi.tools.duckduckgo import DuckDuckGo

kursusudvikler_agent = Agent(
    name="Kursusudvikler",
    role="""Jeg er en kursus udvikler, med følgende erfaring
- Dansk kultur: åben og tillidsfuld
- erfaren erhvervspsykolog
- coaching baggrund
- masser af faciliterings erfaring i store Danske firmaer
Min opgave er at lave det bedst mulige kursus, og sikre at kursusdeltageren har
grundigt evalueret agendaen før vi går igang.""",
    model=OpenAIChat(id="o3-mini"),
    show_tool_calls=True,
    markdown=True,
)

kursusdeltager_agent = Agent(
    name="Kursusdeltager",
    role="""Jeg er en akademisk medarbejder i en større Dansk organisation.
    Jeg kører projekter og har en bred vifte af stakeholders som jeg skal drive opgaver igennem.
    Jeg deltager gerne i kurser, og er ret kritisk og dygtig til at evaluere dem.
    Jeg giver direkte feedback med forslag til ændringer af kursus agendaen.
""",
    model=OpenAIChat(id="o3-mini"),
    show_tool_calls=True,
    markdown=True,
)

agent_team = Agent(
    team=[kursusdeltager_agent, kursusudvikler_agent],
    model=OpenAIChat(id="o3-mini"),
    show_tool_calls=True,
    markdown=True,
)

agent_team.print_response("""Kære kursusudvikler. Jeg vil gerne deltage i et kursus om følelsesmæssig intelligens.
Kan du planlægge et to dages kursus i følelsemæssig intelligens til mig?
Så skal jeg evaluere agendaen nu, og så kommer du med en forbedret agenda.
Kurset skal bruge principper fra Daniel Goleman's model og EmotionsFocuseret
Terapi og Neuropsykologi med den tredelte hjerne af Paul MacLean. 
Skal indeholde øvelser der hjælper med at forstå hvorfor følelser 
er vigtige at interessere sig for følelser på arbejdet og hvad det
betyder det i en arbejdsmæssige sammenhæng. Resultatet skal være
en agenda og en kort beskrivelse af øvelserne.
Du er færdig med agendaen når jeg har evalueret kursus agendaen med en høj
 score indenfor udbytte, forståelse, og anvendelse i deres arbejdsliv. 
Jeg regner med at vi laver flere iterationer af forbedringer af kursus agendaen.
""", stream=True)