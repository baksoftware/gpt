import pygame
import sys

# Initialize pygame
pygame.init()

# Screen setup
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cantina Conversation Simulation")

# Font setup
FONT_SIZE = 24
font = pygame.font.SysFont("arial", FONT_SIZE)
BIG_FONT = pygame.font.SysFont("arial", 32)

# Define our eight desirable character traits:
TRAITS = ["Empathy", "Honesty", "Courage", "Integrity", "Responsibility", "Compassion", "Respect", "Generosity"]

# Initialize overall score dictionary:
scores = {trait: 0 for trait in TRAITS}

# Define the conversation steps.
# Each step is a dictionary with:
#  - 'npc_text': the NPC's narrative line,
#  - 'question': the follow-up question,
#  - 'options': a list of 4 dictionaries (for A, B, C, D) each with:
#         'text': the option text,
#         'points': a dict mapping trait names to point changes.
conversation_steps = [
    {
        "npc_text": "NPC: You know, I recently lost my job due to some misunderstandings at the company. It was really hard to accept.",
        "question": "How do you respond?",
        "options": [
            {
                "text": "A) I'm really sorry to hear that, maybe you can find a new opportunity soon.",
                "points": {"Empathy": 2, "Compassion": 2, "Generosity": 1, "Respect": 1}
            },
            {
                "text": "B) That's unfortunate, maybe you should have tried harder.",
                "points": {"Honesty": 1, "Responsibility": 1, "Empathy": -1, "Compassion": -1}
            },
            {
                "text": "C) I understand, sometimes the world is unfair.",
                "points": {"Empathy": 1, "Honesty": 1, "Integrity": 1}
            },
            {
                "text": "D) You should stand up for yourself and demand justice.",
                "points": {"Courage": 2, "Responsibility": 1, "Integrity": 1}
            }
        ]
    },
    {
        "npc_text": "NPC: Recently, I encountered a situation where a colleague was being mistreated by our boss, and I wasn't sure how to help.",
        "question": "What would you do?",
        "options": [
            {
                "text": "A) I would calmly talk to the colleague and offer my support.",
                "points": {"Empathy": 2, "Compassion": 2, "Respect": 1}
            },
            {
                "text": "B) I would report the incident to management immediately.",
                "points": {"Responsibility": 2, "Integrity": 1, "Courage": 1}
            },
            {
                "text": "C) I might join in if I thought it was necessary.",
                "points": {"Honesty": 1, "Courage": 1, "Integrity": 1}
            },
            {
                "text": "D) I would ignore it; it's not my problem.",
                "points": {"Empathy": -2, "Responsibility": -2, "Respect": -1}
            }
        ]
    },
    {
        "npc_text": "NPC: I once had to choose between supporting a friend and doing what was best for the whole team. I felt torn between loyalty and responsibility.",
        "question": "What's your advice?",
        "options": [
            {
                "text": "A) Stick with your friend; personal bonds matter most.",
                "points": {"Empathy": 2, "Compassion": 2, "Generosity": 1}
            },
            {
                "text": "B) The team comes first; sometimes responsibilities outweigh personal ties.",
                "points": {"Responsibility": 2, "Integrity": 2, "Honesty": 1}
            },
            {
                "text": "C) Try to balance both if possible; compromise is key.",
                "points": {"Respect": 2, "Integrity": 1, "Empathy": 1, "Responsibility": 1}
            },
            {
                "text": "D) Sometimes there are no right answers; follow your instincts.",
                "points": {"Courage": 1, "Honesty": 1, "Integrity": 1}
            }
        ]
    }
]

# A helper function to render multi-line text onto the screen.
def draw_text(surface, text, pos, color=(255, 255, 255), font=font, max_width=700):
    words = text.split(" ")
    lines = []
    current_line = ""
    for word in words:
        test_line = current_line + word + " "
        if font.size(test_line)[0] < max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word + " "
    lines.append(current_line)

    x, y = pos
    for line in lines:
        rendered_line = font.render(line, True, color)
        surface.blit(rendered_line, (x, y))
        y += font.get_linesize()

# Main game loop variables:
current_step = 0
waiting_for_choice = True
final_screen = False

clock = pygame.time.Clock()

while True:
    screen.fill((30, 30, 30))  # Dark background

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()
        if event.type == pygame.KEYDOWN:
            # Only process key events when not on the final screen.
            if not final_screen:
                if waiting_for_choice:
                    # Check for number keys 1-4 (or A-D)
                    if event.key == pygame.K_1:
                        chosen_option = 0
                    elif event.key == pygame.K_2:
                        chosen_option = 1
                    elif event.key == pygame.K_3:
                        chosen_option = 2
                    elif event.key == pygame.K_4:
                        chosen_option = 3
                    else:
                        chosen_option = None

                    if chosen_option is not None:
                        # Award points based on the chosen option:
                        option = conversation_steps[current_step]["options"][chosen_option]
                        for trait, pts in option["points"].items():
                            scores[trait] += pts
                        # Move to the next conversation step.
                        current_step += 1
                        waiting_for_choice = True  # ready for next step
                        # If we have finished all steps, switch to final screen.
                        if current_step >= len(conversation_steps):
                            final_screen = True

            else:
                # On the final screen, pressing any key will quit.
                pygame.quit()
                sys.exit()

    # If we are not yet finished with the conversation, draw the current conversation step.
    if not final_screen:
        current_data = conversation_steps[current_step]

        y_offset = 50
        # Draw the NPC's narrative
        draw_text(screen, current_data["npc_text"], (50, y_offset), font=BIG_FONT)
        y_offset += 100

        # Draw the follow-up question:
        draw_text(screen, current_data["question"], (50, y_offset), font=font)
        y_offset += 50

        # Draw the 4 options:
        for idx, option in enumerate(current_data["options"]):
            option_text = option["text"]
            draw_text(screen, option_text, (70, y_offset), font=font)
            y_offset += 40

        # Instruction for the player:
        instruction = "Press 1, 2, 3, or 4 to choose your answer."
        draw_text(screen, instruction, (50, SCREEN_HEIGHT - 50), font=font, color=(200, 200, 0))
    else:
        # Final screen: Display overall scores.
        y_offset = 50
        header = "Conversation ended. Here are your trait scores:"
        header_render = BIG_FONT.render(header, True, (255, 255, 255))
        screen.blit(header_render, (50, y_offset))
        y_offset += 80

        # Display each trait and its score:
        for trait in TRAITS:
            score_text = f"{trait}: {scores[trait]}"
            rendered_text = font.render(score_text, True, (200, 200, 200))
            screen.blit(rendered_text, (70, y_offset))
            y_offset += 40

        footer = "Press any key to exit."
        footer_render = font.render(footer, True, (200, 200, 0))
        screen.blit(footer_render, (50, SCREEN_HEIGHT - 50))

    pygame.display.flip()
    clock.tick(30)