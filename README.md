# PYrte-Radio-Shack

My Pyrte Radio - A Python project with AI-powered automation via n8n

## Features

- 🤖 **AI-Powered Automation**: Integrated with n8n MCP servers for workflow automation
- 🔧 **Claude Code Integration**: Comprehensive skills, agents, and commands for development
- 📦 **Modular Design**: Clean architecture for easy extension

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js (for n8n MCP servers)
- Claude Desktop or Claude Code

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/PYrte-Radio-Shack.git
cd PYrte-Radio-Shack

# Install Python dependencies (when available)
pip install -r requirements.txt
```

### n8n MCP Server Setup

This project includes n8n Model Context Protocol (MCP) server integration, allowing Claude to build and manage n8n workflows.

**Quick Start**: See [.mcp/QUICKSTART.md](.mcp/QUICKSTART.md)

**Full Documentation**: See [.mcp/README.md](.mcp/README.md)

**Features**:
- Build n8n workflows using natural language
- Manage existing n8n workflows
- Execute and monitor workflow runs
- Integrate with external services

## Project Structure

```
PYrte-Radio-Shack/
├── .claude/              # Claude Code configuration
│   ├── skills/           # Domain-specific skills
│   ├── agents/           # Specialized sub-agents
│   └── commands/         # Slash commands
├── .mcp/                 # n8n MCP server configuration
│   ├── README.md         # MCP documentation
│   ├── QUICKSTART.md     # Quick start guide
│   └── mcp-config.json   # MCP server config
├── src/                  # Source code (to be created)
├── tests/                # Test files (to be created)
└── docs/                 # Documentation (to be created)
```

## Development

See [CLAUDE.md](CLAUDE.md) for development guidelines and Claude Code integration details.

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Resources

- [n8n MCP Documentation](.mcp/README.md)
- [Claude Code Guide](CLAUDE.md)
- [n8n Documentation](https://docs.n8n.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
