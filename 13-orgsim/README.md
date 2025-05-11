# React + TypeScript + Vite

Setup

```sh
npm create vite@latest . -- --template react-swc-ts
```

## Spec

Now implement a basic simulation that does this:

visualisation:
- teams displayed as circles
- people on teams are displayed as circles within a team circle
- people are colored differently based on disciplines (software developer, tester, product manager, designer)
- a unit of work is a circle.
- workunits are colored based on type (need, design, task, code, release)
- the simulation is visualised as work flowing between team members and teams
- circles and people are places with force simulation
- the customer is a "team" circle as well, populated with customer persons

simulation
- loading all configuration data from a JSON file
- Each person work on a workunit for a given number of time ticks (hours)
- work goes from customer to designer, from designer to pm, from pm to developers, from developers to testers, from testers to customers
- at each tick in the simulation the visualisation is updated
