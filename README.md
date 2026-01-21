# OmniFocus MCP Server

A Model Context Protocol (MCP) server that integrates with OmniFocus to enable Claude (or other MCP-compatible clients) to interact with your tasks and projects.

![OmniFocus MCP](assets/omnifocus-mcp-logo.png)

## Overview

This MCP server creates a bridge between AI assistants (like Claude) and your OmniFocus task management system. It gives AI models the ability to view, create, edit, and remove tasks and projects in your OmniFocus database through natural language conversations.
Some ways you could use it: 

- Translate the PDF of a syllabus into a fully specificed project with tasks, tags, defer dates, and due dates.
- Turn a meeting transcript into a list of actions
- Create visualizations of your tasks, projects, and tags
- Process multiple tasks or projects in a single operation
- Bulk manage your OmniFocus items efficiently

**Known Issues**
- Dump_database tool currently fails for very large omnifocus databases. 

## Roadmap
- ~~Enable the client to interact with perspectives~~ ✅ (Added list_perspectives and get_perspective_view)
- Benefit from MCP `resource` and `prompt` features
- Add support for the new `planned` date type in Omnifocus 4.7
- Support manipulating notifications for projects and tasks


## 🚀 Quick Start

The OmniFocus MCP server supports two modes:
- **stdio mode** (default) - For local use with Claude Desktop
- **HTTP mode** - For remote access with GitHub OAuth authentication

### Prerequisites
- macOS with OmniFocus installed

### stdio Mode (Local Use)

#### Connecting to Claude

1. In Claude Desktop, add this MCP server to your configuration file at:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

2. Add the following configuration:
```json
{
  "mcpServers": {
    "omnifocus": {
      "command": "npx",
      "args": ["-y", "omnifocus-mcp"]
    }
  }
}
```

3. Restart Claude Desktop

### HTTP Mode (Remote Access)

HTTP mode allows you to run the MCP server as a web service with GitHub OAuth authentication, enabling remote access and multi-user scenarios.

#### Setup GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps → New OAuth App
2. Fill in the details:
   - **Application name**: OmniFocus MCP Server
   - **Homepage URL**: `http://localhost:3000` (or your domain)
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
3. Save the **Client ID** and generate a **Client Secret**

#### Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your settings:
```bash
# Set mode to HTTP
MCP_MODE=http

# Server configuration
PORT=3000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# GitHub OAuth credentials (from previous step)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Generate a random secret (use: openssl rand -hex 32)
SESSION_SECRET=your_random_secret_key_here

# Optional: Restrict access to specific users/orgs
# ALLOWED_GITHUB_USERS=username1,username2
# ALLOWED_GITHUB_ORGS=org1,org2
```

#### Start the Server

```bash
npm install
npm run build
npm start
```

The server will start on `http://localhost:3000`

#### Authentication Flow

1. Open your browser and navigate to: `http://localhost:3000/auth/github`
2. Authorize the application with GitHub
3. Copy the session token from the success page
4. Use the token in your MCP client configuration:

```json
{
  "mcpServers": {
    "omnifocus-http": {
      "url": "http://localhost:3000/sse",
      "headers": {
        "X-Session-Token": "your-session-token-here"
      }
    }
  }
}
```

#### HTTP Mode Endpoints

- `GET /health` - Health check endpoint
- `GET /auth/github` - Initiate GitHub OAuth flow
- `GET /auth/github/callback` - OAuth callback
- `GET /auth/success` - Authentication success page with token
- `GET /auth/logout?token=<session-token>` - Logout
- `GET /sse` - SSE connection endpoint (requires authentication)
- `POST /messages` - MCP message endpoint (requires authentication)

#### Security Considerations

**For Production Deployment:**

1. **Use HTTPS**: Always use HTTPS in production
   ```bash
   # Update callback URL
   GITHUB_CALLBACK_URL=https://yourdomain.com/auth/github/callback
   ```

2. **Secure Session Secret**: Generate a strong random secret
   ```bash
   openssl rand -hex 32
   ```

3. **Configure CORS**: Restrict origins to trusted domains
   ```bash
   CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```

4. **User Whitelist**: Restrict access to specific users or organizations
   ```bash
   ALLOWED_GITHUB_USERS=user1,user2
   ALLOWED_GITHUB_ORGS=myorg
   ```

5. **Environment Variables**: Never commit `.env` file (already in `.gitignore`)

6. **Session Duration**: Sessions expire after 24 hours (configurable in code)

7. **Set NODE_ENV**: Set to production for secure cookies
   ```bash
   NODE_ENV=production
   ```

## Use Cases

### Efficient Task Queries
Use the new `query_omnifocus` tool for fast, targeted searches:
> "Show me tasks due today"
> "Get all flagged items in my Work project"  
> "Count how many tasks are in each project"

### Reorganize your projects, tasks, and tags
> "I want every task to have an energy level tag. Show me a list of all the tasks that don't have an energy level tag and your suggestions for what tag to add. I'll make any changes I think are appropriate. Then make the changes in OmniFocus."

### Add tasks from any conversation

> "Ok, thanks for the detailed explanation of why the rule of law is important. Add a recurring task to my activism project that reminds me to call my representative weekly. Include a summary of this conversation in the notes field."

### Quick, Virtual Perspectives

Get a summary of your current tasks and manage them conversationally:

> "Show me all my flagged tasks due this week"

Or create custom views:

> "What are my next actions in the Work folder?"

### Work with OmniFocus Perspectives

List and view your perspectives:

> "What perspectives do I have available?"
> "Show me what's in my Inbox perspective"
> "Get the flagged items from my current perspective" 

### Process Transcripts or PDFs

Extract action items from meeting transcripts, academic research articles, or notes:

> "I'm pasting in the transcript from today's meeting. Please analyze it and create tasks in OmniFocus for any action items assigned to me. Put them in my 'Product Development' project."


## 🔧 Available Tools

The server currently provides these tools:

### `query_omnifocus` ⭐ NEW
Efficiently query your OmniFocus database with powerful filters. Get specific tasks, projects, or folders without loading the entire database.

Key Features:
- **Filter by multiple criteria**: project, tags, status, due dates, flags, notes, and more
- **Request specific fields**: Reduce response size by only getting the data you need
- **Sort and limit results**: Control the output format
- **Much faster than dump_database** for targeted queries

Common Uses:
```
"Show me all flagged tasks due this week"
"Get next actions from my Work project"
"Count tasks in each project" (use with summary: true)
"Find all tasks deferred until tomorrow"
```

Parameters:
- `entity`: Type to query ('tasks', 'projects', or 'folders')
- `filters`: (Optional) Narrow results by project, tags, status, dates, etc.
- `fields`: (Optional) Specific fields to return (id, name, note, dueDate, etc.)
- `limit`: (Optional) Maximum items to return
- `sortBy`: (Optional) Field to sort by
- `includeCompleted`: (Optional) Include completed items (default: false)
- `summary`: (Optional) Return only count instead of full details

### `dump_database`
Gets the complete current state of your OmniFocus database. Best for comprehensive analysis or when you need everything.

Parameters:
- `hideCompleted`: (Optional) Hide completed/dropped tasks (default: true)
- `hideRecurringDuplicates`: (Optional) Hide duplicate recurring tasks (default: true)

### `add_omnifocus_task`
Add a new task to OmniFocus.

Parameters:
- `name`: The name of the task
- `projectName`: (Optional) The name of the project to add the task to
- `note`: (Optional) Additional notes for the task
- `dueDate`: (Optional) The due date of the task in ISO format
- `deferDate`: (Optional) The defer date of the task in ISO format
- `flagged`: (Optional) Whether the task is flagged or not
- `estimatedMinutes`: (Optional) Estimated time to complete the task
- `tags`: (Optional) Tags to assign to the task
 - `parentTaskId`: (Optional) Create under an existing parent task by ID
 - `parentTaskName`: (Optional) Create under first matching parent task by name (fallback)

### `add_project`
Add a new project to OmniFocus.

Parameters:
- `name`: The name of the project
- `folderName`: (Optional) The name of the folder to add the project to
- `note`: (Optional) Additional notes for the project
- `dueDate`: (Optional) The due date of the project in ISO format
- `deferDate`: (Optional) The defer date of the project in ISO format
- `flagged`: (Optional) Whether the project is flagged or not
- `estimatedMinutes`: (Optional) Estimated time to complete the project
- `tags`: (Optional) Tags to assign to the project
- `sequential`: (Optional) Whether tasks in the project should be sequential

### `remove_item`
Remove a task or project from OmniFocus.

Parameters:
- `id`: (Optional) The ID of the task or project to remove
- `name`: (Optional) The name of the task or project to remove
- `itemType`: The type of item to remove ('task' or 'project')

### `edit_item`
Edit a task or project in OmniFocus.

Parameters:
- `id`: (Optional) The ID of the task or project to edit
- `name`: (Optional) The name of the task or project to edit
- `itemType`: The type of item to edit ('task' or 'project')
- Various parameters for editing properties

### `batch_add_items`
Add multiple tasks or projects to OmniFocus in a single operation.

Parameters:
- `items`: Array of items to add, where each item can be:
  - `type`: The type of item ('task' or 'project')
  - `name`: The name of the item
  - `note`: (Optional) Additional notes
  - `dueDate`: (Optional) Due date in ISO format
  - `deferDate`: (Optional) Defer date in ISO format
  - `flagged`: (Optional) Whether the item is flagged
  - `estimatedMinutes`: (Optional) Estimated completion time
  - `tags`: (Optional) Array of tags
  - `projectName`: (Optional) For tasks: the project to add to
  - `folderName`: (Optional) For projects: the folder to add to
  - `sequential`: (Optional) For projects: whether tasks are sequential
  - `parentTaskId`: (Optional, tasks): Parent task by ID
  - `parentTaskName`: (Optional, tasks): Parent task by name (fallback)
  - `tempId`: (Optional, tasks): Temporary ID for within-batch references
  - `parentTempId`: (Optional, tasks): Reference to another item's `tempId` to establish hierarchy
  - `hierarchyLevel`: (Optional, tasks): Ordering hint (0 for root, 1 for child, ...)

Examples:
```
{
  "items": [
    { "type": "task", "name": "Parent", "projectName": "My Project", "tempId": "p1" },
    { "type": "task", "name": "Child A", "parentTempId": "p1" },
    { "type": "task", "name": "Child B", "parentTempId": "p1" }
  ]
}
```

### `batch_remove_items`
Remove multiple tasks or projects from OmniFocus in a single operation.

Parameters:
- `items`: Array of items to remove, where each item can be:
  - `id`: (Optional) The ID of the item to remove
  - `name`: (Optional) The name of the item to remove
  - `itemType`: The type of item ('task' or 'project')

### `list_perspectives` ⭐ NEW
List all available perspectives in OmniFocus, including built-in and custom perspectives.

Parameters:
- `includeBuiltIn`: (Optional) Include built-in perspectives like Inbox, Projects, Tags (default: true)
- `includeCustom`: (Optional) Include custom perspectives (Pro feature) (default: true)

Returns:
- List of perspectives with their names, types (builtin/custom), and whether they can be modified

### `get_perspective_view` ⭐ NEW
Get the items visible in the current OmniFocus perspective. Shows what tasks and projects are displayed.

Parameters:
- `perspectiveName`: Name of the perspective to view (e.g., 'Inbox', 'Projects', 'Flagged')
- `limit`: (Optional) Maximum number of items to return (default: 100)
- `includeMetadata`: (Optional) Include additional metadata like tags and dates (default: true)
- `fields`: (Optional) Specific fields to include in the response

Note: This tool returns the content of the current perspective window. Due to OmniJS limitations, it cannot programmatically switch perspectives.

## Development

Documentation to follow.

## How It Works

This server uses AppleScript to communicate with OmniFocus, allowing it to interact with the application's native functionality. The server is built using the Model Context Protocol SDK, which provides a standardized way for AI models to interact with external tools and systems.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Troubleshooting

### stdio Mode

**Issue**: MCP server not appearing in Claude Desktop
- Verify the configuration file path is correct
- Check that the JSON syntax is valid
- Restart Claude Desktop after making changes
- Check Claude Desktop logs for errors

**Issue**: AppleScript permission errors
- Grant Claude Desktop "Automation" permission in System Preferences → Security & Privacy → Privacy
- Ensure OmniFocus is running

### HTTP Mode

**Issue**: "GitHub OAuth credentials are required in HTTP mode"
- Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set in `.env`
- Make sure you're loading the `.env` file correctly
- Check that `.env` is in the root directory

**Issue**: OAuth callback fails
- Verify `GITHUB_CALLBACK_URL` matches the one configured in GitHub OAuth App
- Ensure the callback URL is accessible (use `http://localhost:3000/auth/github/callback` for local testing)
- Check that the port matches your `PORT` setting

**Issue**: "Unauthorized" when connecting to SSE endpoint
- Verify you've completed the OAuth flow and obtained a session token
- Check that the `X-Session-Token` header is included in requests
- Session tokens expire after 24 hours - obtain a new token if needed

**Issue**: CORS errors in browser
- Add your domain to `CORS_ORIGINS` environment variable
- Restart the server after changing environment variables
- Verify the origin includes the protocol (http:// or https://)

**Issue**: Session token not working
- Verify the token hasn't expired (24-hour lifetime)
- Check that you're using the correct token from the success page
- Ensure no whitespace or extra characters in the token

**Issue**: "User not authorized" during OAuth
- Check if `ALLOWED_GITHUB_USERS` or `ALLOWED_GITHUB_ORGS` are configured
- Verify your GitHub username is in the allowed list (case-sensitive)
- Remove whitelist variables to allow all authenticated users

**General Tips:**
- Check server logs (stderr) for detailed error messages
- Use `curl` to test HTTP endpoints directly
- Verify all required environment variables are set
- Test with stdio mode first to ensure core functionality works
