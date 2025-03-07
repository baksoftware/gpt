from pydantic import BaseModel
from openai import OpenAI
from datetime import datetime
client = OpenAI()

class CalendarEvent(BaseModel):
    name: str
    date: str
    today: str
    participants: list[str]

completion = client.beta.chat.completions.parse(
    model="o3-mini",
    messages=[
        {"role": "system", "content": "Extract the event information. Date must be in the format of YYYY-MM-DD. Add today's date to the response."},
        {"role": "user", "content": "Alice and Bob are going to a science fair on Friday."},
    ],
    response_format=CalendarEvent,
)

event = completion.choices[0].message.parsed

print(event.model_dump_json())

d: datetime = event.date

print(d)