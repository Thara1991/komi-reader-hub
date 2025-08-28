# Komi Reader Hub – Project Rules & AI Guidelines

## Core Concept
- This app must always work fully offline/standalone.
- Never use internet APIs, cloud sync, or any feature that requires an internet connection.
- All data (settings, progress, comic metadata) must be stored locally (JSON files, LocalStorage).
- All images and comics must be loaded from the local file system or bundled assets.

## UI/UX
- When the user says "comic card", it refers to a single comic in the UI.
- The main comic view and the Manage Library view have different layouts. Only change the Manage Library layout unless the user says otherwise.
- The Manage Library comic list layout (card style with four lines) should remain unchanged unless the user confirms a change.

## Data Handling
- Always ask for confirmation before clearing or resetting LocalStorage or persistent data.
- If a requested change might cause a bug due to data incompatibility, warn the user and ask for confirmation before resetting/clearing data.
- If the user prefers, losing data is better than having the project go buggy, but always confirm first.

## App Behavior
- On app start, if a directory is already set, automatically scan and display comics from that directory.
- Never show sample/mock comics if a real directory is set.
- All features must work without an internet connection.

## File Management
- **ALWAYS ask for user confirmation before creating or deleting any files in the project.**
- Each file change must be confirmed individually by the user.
- Never make file changes without explicit permission.
- **NEVER restore from backup files without explicit user permission first.**
- If file corruption occurs, explain the situation and ask user to decide: fix the corruption or restore from backup.

## Code Changes
0. **Do not do or add anything user didn't ask, if AI assistant think it better then suggest to user and wait for user decide**
1. **If user ask AI assistant to make it then make it.**
2. **Before making changes that might affect project structure or component behavior, warn the user and ask for confirmation about updating PROJECT_INFO.md to maintain accuracy.**
3. **If user ask AI assistant that can AI assistant do it then answer the user and if AI assistant can, tell the user how and let the user decide.**
4. **If user ask AI assistant to explain then just explain.**

## Checkpoints
- When the user requests a checkpoint, show the previous checkpoint with an incremented mark and timestamp, then start the new checkpoint.

---

**To the AI assistant:**
- Always read and follow these rules for every request in this project.
- If the user updates this file, follow the new rules immediately. 