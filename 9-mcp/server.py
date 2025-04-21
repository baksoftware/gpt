from mcp.server.fastmcp import FastMCP
from markitdown import MarkItDown

# Initialize the MCP server
mcp = FastMCP("MarkItDown MCP Server")

# Define a tool that converts a file to Markdown
@mcp.tool()
def convert_file_to_markdown(file_path: str) -> str:
    """
    Convert the specified file to Markdown format.
    """
    md = MarkItDown()
    result = md.convert(file_path)
    return result.text_content