import json
import random
import argparse

# Static data based on the provided simulationConfig.json
PERSON_WORK_TICKS = {
    "Designer": { "design": 4},
    "PM": {"task": 3},
    "SwDev": {"code": 24},
    "Tester": {"release": 12},
    "Customer": {"idea": 5, "need": 3, "done": 500}
}

WORK_FLOW = {
    "idea": {"nextType": "need", "nextDiscipline": "Customer"},
    "need": {"nextType": "design", "nextDiscipline": "Designer"},
    "design": {"nextType": "task", "nextDiscipline": "PM"},
    "task": {"nextType": "code", "nextDiscipline": "SwDev"},
    "code": {"nextType": "release", "nextDiscipline": "Tester"},
    "release": {"nextType": "done", "nextDiscipline": "Customer"},
}

# Disciplines available for regular team members
AVAILABLE_DISCIPLINES = ["PM", "Designer", "SwDev", "Tester", "SwDev", "SwDev", "SwDev", "SwDev", "Tester", "Designer"]

def generate_teams(num_total_teams):
    """Generates the list of teams, including one customer team."""
    teams = [{"id": "team_customer", "name": "Customer", "isCustomerTeam": True}]
    # num_total_teams includes the customer team, so generate num_total_teams - 1 additional teams
    for i in range(num_total_teams - 1):
        team_id = f"team_{i+1}" # IDs like team_1, team_2
        team_name = f"Team {chr(ord('A') + i)}" # Names like Team A, Team B
        teams.append({"id": team_id, "name": team_name, "isCustomerTeam": False})
    return teams

def generate_people(teams_list):
    """Generates the list of people for all teams."""
    people = []
    person_counter = 1
    # Range for number of people in non-customer teams, as per requirement
    people_per_team_range = (5, 10)

    customer_team_name = None
    for team in teams_list:
        if team.get("isCustomerTeam"):
            customer_team_name = team["name"]
            break
    
    if customer_team_name:
        for _ in range(5):
            people.append({
                "id": f"person_{person_counter}",
                "name": f"Customer-{person_counter}",
                "discipline": "Customer",
                "initialTeamName": customer_team_name
            })
            person_counter += 1
    else:
        # This should not happen if generate_teams always creates a customer team.
        print("Warning: No customer team was found to assign a representative.")

    regular_teams = [team for team in teams_list if not team.get("isCustomerTeam")]
    for team in regular_teams:        
        num_people_in_team = random.randint(5, 10)
        team_people = []
        for i in range(num_people_in_team):
            discipline = AVAILABLE_DISCIPLINES[i % len(AVAILABLE_DISCIPLINES)]
            person_name = f"{discipline}_{person_counter}"
            team_people.append({
                "id": f"person_{person_counter}",
                "name": person_name,
                "discipline": discipline,
                "initialTeamName": team["name"]
            })
            person_counter += 1
        # team_people = sorted(team_people, key=lambda x: x["discipline"])
        people.extend(team_people)
    return people

def generate_initial_work_units(num_units):
    """Generates initial work units, all of type 'idea'."""
    work_units = []
    for i in range(num_units):
        work_units.append({
            "id": f"Work-{i+1}",
            "type": "idea"
        })
    return work_units

def main():
    random.seed(42);
    parser = argparse.ArgumentParser(description="Generate a simulationConfig.json-like file.")
    parser.add_argument(
        "--num_teams", 
        type=int, 
        required=False, 
        default=10, 
        help="Total number of teams. This includes one dedicated 'Customer' team and (num_teams - 1) other teams. Must be >= 1."
    )
    parser.add_argument(
        "--num_initial_workunits", 
        type=int, 
        required=False, 
        default=200, 
        help="Number of initial work units (all will be of type 'idea')."
    )
    parser.add_argument(
        "--output_file", 
        type=str, 
        required=False, 
        default="simulationConfig.json", 
        help="Name of the output JSON file (default: simulationConfig.json)."
    )

    args = parser.parse_args()

    if args.num_teams < 1:
        print("Error: Number of teams must be at least 1 (to include the Customer team).")
        return
        
    if args.num_initial_workunits < 0:
        print("Error: Number of initial work units cannot be negative.")
        return

    generated_teams = generate_teams(args.num_teams)
    generated_people = generate_people(generated_teams)
    generated_work_units = generate_initial_work_units(args.num_initial_workunits)

    config_data = {
        "teams": generated_teams,
        "people": generated_people,
        "initialWorkUnits": generated_work_units,
        "personWorkTicks": PERSON_WORK_TICKS,
        "workFlow": WORK_FLOW
    }

    try:
        with open(args.output_file, 'w') as f:
            json.dump(config_data, f, indent=2)
        print(f"Successfully generated '{args.output_file}'.")
        num_regular_teams = len([t for t in generated_teams if not t.get("isCustomerTeam")])
        print(f"Configuration details:")
        print(f"  Total teams generated: {len(generated_teams)} (1 Customer team, {num_regular_teams} other teams)")
        print(f"  Total people generated: {len(generated_people)}")
        print(f"  Initial work units generated: {len(generated_work_units)}")

    except IOError:
        print(f"Error: Could not write to file '{args.output_file}'.")

if __name__ == "__main__":
    main() 