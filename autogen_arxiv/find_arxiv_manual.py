# docker run -it --rm -v "$PWD":/usr/src/myapp -w /usr/src/myapp arxiv:latest python find_arxiv_manual.py

import arxiv
import datetime
import pandas as pd

# Define the search query and the date one week ago
query = "LLM applications"
last_week = (datetime.datetime.now() - datetime.timedelta(days=7)).strftime('%Y%m%d%H%M%S')


# Search for papers on arXiv
search = arxiv.Search(
  query = query,
  max_results = 3,
  sort_by = arxiv.SortCriterion.SubmittedDate
)

# Initialize a list to store the papers
papers = []

# Loop through the results
for result in search.results():
  # Check if the paper was submitted in the last week
  if result.published.strftime('%Y%m%d%H%M%S') >= last_week:
    # Append the paper to the list
    papers.append({
      "title": result.title,
      "authors": ", ".join(author.name for author in result.authors),
      "abstract": result.summary,
      "link": result.entry_id
    })

# Convert the list to a DataFrame
df = pd.DataFrame(papers)

# Save the DataFrame to a markdown file
df.to_markdown("papers.md", index=False)

