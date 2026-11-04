# EH-LINUX-01 — Work safely in the terminal

Draft, not published. Requires the clean learner guest from EH-LAB-02. This is authoring documentation, not runtime course activation or permission to operate on other systems. Students run their own equipment; no hosted lab is required. These foundations can be studied after guest creation and before the networking exercises. Community Learning is unchanged.

## Outcomes
Identify the guest and current directory, explain a command's arguments, handle a filename containing spaces, and create a small evidence workspace without elevated privileges.

## Your task and finish line
Use the existing non-root guest session to create the small disposable workspace, write and copy the quoted-name note, compare the contents, explain relative paths and read local help. Then complete the existing second-note and deliberately missing-filename task. Leave the reviewed workspace for EH-LINUX-02; do not add a cleanup or permissions exercise.

Work one command at a time: identify the intended effect, predict the result, execute only within the approved local workspace, inspect the actual result and explain its limit. A prediction is not a transcript. If the environment or scope is uncertain, stop rather than use sudo, change machines or install a replacement tool.

## 1. Understand the terminal, shell and command
A terminal displays an interactive session. The shell reads commands and starts programs or runs its own built-in operations. These exercises assume Bash and GNU utilities in the clean Linux guest. Host PowerShell, a macOS terminal and an arbitrary shell are not interchangeable execution environments. Do not paste these steps into the host.

| Concept/tool | Job here | Limit |
|---|---|---|
| hostname and id | Help identify the guest session and account | A hostname alone is not proof of machine ownership or authorization |
| pwd and cd | Inspect and change this shell's working directory | A changed directory changes the meaning of relative paths, not your authority |
| mkdir | Create the fresh disposable directory | An existing directory is not automatically safe to reuse |
| printf and > | Produce the invented note and redirect it into the selected file | The redirection can overwrite before the command writes |
| ls -l and cat | Inspect the named file's listing and contents | A listing is not content equality or a confidentiality assessment |
| cp | Copy the selected source to the selected destination | An existing destination can be overwritten; quoting does not prevent that |
| cmp and immediate status print | Compare the two files' bytes and inspect that command's result | Silence or another command's status is not a universal success signal |
| cp --help and help cd | Read utility help and Bash built-in help | Missing help is not permission to download arbitrary software |

A command typically contains a name, options and arguments. In this existing example:

```sh
cp -- 'scope note.txt' copy.txt
```

cp is the program. For this GNU utility, -- ends option parsing. The remaining two arguments identify the source and destination. Single quotes keep scope note.txt together as one filename; the quotes themselves are not part of that filename. A filename with a space is still one file, not two source operands. Do not execute an unquoted variation against unrelated files merely to demonstrate an error.

Not every command accepts identical options. cd is a Bash built-in that changes the current shell's directory; use its own help rather than assume every cp option applies to it. Do not copy prompt symbols such as $ or a hostname prefix from an example.

## 2. Confirm the guest and ordinary account before writing
Run the existing orientation commands in the intended guest terminal:

```sh
hostname
id
pwd
printf '%s\n' "$BASH_VERSION"
```

Run them separately. Match the observations with the reviewed NG-Learner guest and its ordinary account. id reports identity information; a user ID of zero means root and is not the required learner account. If you are root, on the host or uncertain which machine owns the terminal, stop and switch to the intended non-root guest session through the approved process. Do not manufacture a new account or escalate privileges to repair this exercise.

The Bash variable print displays its current value; the quotes allow variable expansion while keeping the value together. A missing or unexpected value is a shell-assumption blocker, not an instruction to execute these commands in a different host shell. These orientation observations do not by themselves prove a trusted or authorized environment.

Record only the minimum guest-role and account distinction needed for review. Do not publish passwords, personal usernames/hostnames or unrelated group-membership details. The prompt's appearance is not a replacement for checking the actual session.

## 3. Create a fresh disposable workspace
1. Move to the guest account's home directory, then inspect the location:

```sh
cd -- "$HOME"
pwd
```

Run one at a time. Double quotes allow HOME to expand to this account's home path without splitting a path containing spaces. Do not replace it with an unrelated personal-document or shared directory. A failed cd means stop before creating anything.

2. Create the existing named workspace:

```sh
mkdir -- ng-linux-foundations
```

If it already exists, do not overwrite earlier evidence or delete it to obtain a clean-looking attempt. Inspect only the relevant owned exercise context and use a fresh identified attempt name when appropriate under the approved process. Record that chosen name and substitute it consistently in later navigation. Do not treat a name collision as permission to reuse unknown content.

3. Only after successful fresh creation, enter it and check the location:

```sh
cd -- ng-linux-foundations
pwd
```

This example assumes the original name was available; use your recorded fresh name if it was not. cd affects this terminal's current directory. Do not continue through a failed cd: the next relative filename would otherwise refer to the old location.

Before writing, confirm the intended new workspace and that the destination names below do not already identify unrelated data or links. Do not rely on quoting or -- as an overwrite safeguard. They control argument interpretation, not whether a destination is safe.

## 4. Write and read the existing quoted-name note
In that fresh guest workspace, execute one step at a time:

```sh
printf '%s\n' 'authorized lab note' > 'scope note.txt'
ls -l -- 'scope note.txt'
cat -- 'scope note.txt'
```

The printf format %s prints its string argument and the format's \n adds a newline. The single-quoted text is invented exercise content, not a real agreement or testing permission. The shell's > operator redirects output into scope note.txt; it is not an argument that printf uses as a filename.

With normal redirection behavior, > creates a missing destination or truncates an existing one before the command writes. Check the destination first. Do not repeat this line against an existing report, a link or another person's file. This lesson does not require changing shell overwrite settings or recovering deleted data.

The long listing describes the named file and its metadata. cat reads its contents to the terminal. Recognize your expected invented note, but record what actually happened, including a missing file, unexpected content or error. A familiar listing alone does not prove the file contains the intended bytes. Permission interpretation and changes belong to EH-LINUX-02, not an improvised chmod fix here.

## 5. Copy, compare and preserve the comparison result
After checking that copy.txt is a safe new destination in this workspace, run:

```sh
cp -- 'scope note.txt' copy.txt
cmp -- 'scope note.txt' copy.txt
printf 'comparison status=%s\n' "$?"
```

Stop if cp fails. A destination that already exists or points elsewhere is a blocker to resolve, not an instruction to overwrite it. A successful copy is useful, but the explicit comparison supplies a separate observation about the selected file contents.

GNU cmp compares bytes. By default it normally prints nothing when both selected files have equal contents. Its documented status is 0 for no differences, 1 for differences and 2 for trouble. Do not collapse a read error into an ordinary content difference. Diagnostic wording can vary with tools and locale.

The immediate printf expands $? to the preceding cmp command's status. Another command between cmp and printf would replace that status. The printf itself then has its own status; printing again later is not a recovery of the earlier cmp result. Do not insert a pipeline, help command or listing and attribute its result to cmp.

Equal selected bytes do not prove matching permissions, a secure machine, correct authorization or the safety of all files. Silence is not a universal success signal for every program. Keep the actual output, status and interpretation distinct.

## 6. Understand paths through the existing round trip
An absolute path starts at the filesystem root. A relative path is resolved from the current directory. The names . and .. refer to the current and parent directories. The filesystem root / is not the same concept as the root account.

From the workspace, perform the existing parent-directory round trip, one command at a time:

```sh
cd ..
pwd
cd -- ng-linux-foundations
pwd
```

Use the actual recorded workspace name if a fresh alternate was selected. Compare the observations and explain why the same relative destination can mean a different location after cd. Do not explore unrelated directories, edit system paths or use a failed navigation as an excuse to run sudo.

Redact personal path components where unnecessary in evidence while retaining enough context to distinguish home, workspace and parent. A redacted path must not misleadingly turn a host observation into a guest observation.

## 7. Read local help before improvising
Use the existing help commands:

```sh
cp --help
help cd
```

Inspect the cp operands and options relevant to this exercise and the Bash built-in's directory behavior. Do not treat every option printed by help as another required action. A help command failing does not justify a package installation or downloading a similarly named utility from an unknown source.

No network action, package installation, permissions change, privilege escalation or recursive deletion is required. If the prescribed Bash/GNU environment is unavailable, identify the provisioning blocker rather than silently substitute another implementation.

## 8. Existing independent exercise
Create a second note whose filename contains spaces. Copy it to a new filename and demonstrate equal contents. Explain each command before execution. Include one deliberately missing filename in a read-only listing and explain the result without deleting or changing unrelated files.

These are the existing tasks, not an added challenge set. Use only invented non-sensitive text and fresh destinations inside the same owned workspace. Select a name known to be absent for the listing; do not create it first to manufacture a different outcome. Do not list a whole personal directory or another account's files to obtain an error.

Explain the missing-file diagnostic separately from the comparison result. The absence check need not succeed to be informative: its expected failure is an observation to interpret, not something to suppress, erase or repair with elevated privileges. Never replace an actual error with a successful-looking transcript.

## 9. Evidence, feedback and next lesson
Submit the existing guest role, working-directory description, minimal command/result excerpt and explanations of quoting, paths and overwrite risk. Keep second-note work and the deliberate missing-filename result identifiable. Use only the approved private route after evidence access/collection/retention rules exist; this draft is not a collection system.

| Existing review focus | What to explain |
|---|---|
| Intended session | How you recognized the non-root guest rather than the host or a privileged shell |
| Quoting and arguments | Which filenames are single operands and what -- and quotes actually change |
| Location | Where relative names were resolved before and after navigation |
| File effects | Which commands read data and which create, truncate or copy to a destination |
| Comparison and error | Actual bytes/status evidence versus assumptions about silence or missing files |
| Final state | The identified workspace and fixtures preserved for the next lesson, with unresolved issues stated |

A reviewer should distinguish comprehension from a copied transcript. Feedback should identify a specific unsafe assumption or missing explanation and request a bounded correction. Do not turn a writing correction into new permission to explore files or rerun unapproved actions. Formal grading remains pending; this is not an automatic pass or permission grant.

Leave the workspace, scope note.txt and identified exercise copies for EH-LINUX-02. No recursive deletion is taught or required. Clean up only identified disposable files after evidence review under the approved procedure; do not remove evidence, change permissions or run an unrelated reset to make the lesson appear finished.

## Sources and selected validation limits
GNU Bash manual: https://www.gnu.org/software/bash/manual/bash.html
GNU cmp reference: https://www.gnu.org/software/diffutils/manual/html_node/Invoking-cmp.html

The earlier local checks and their limitations remain in LINUX-FOUNDATIONS-VALIDATION.md; that historical record is unchanged. For this expansion, seven selected author-sandbox command contracts matched: the quoted fixture/readback/copy/comparison-status sequence; a differing-copy negative control; restored-copy equality; an absent-file listing without fixture modification; relative-path round trip; separately observed utility/built-in help success; and selected second-spaced-name note/copy mechanics. The copy mutation was an author-only test, not a new learner task.

Those checks used fresh private temporary directories and Bash --noprofile --norc with a minimal PATH and C locale. The reported tools were Bash 5.3.9, GNU cp 9.7 and GNU cmp 3.12, but ls, cat and mkdir reported uutils coreutils 0.8.0. The sandbox ran with effective UID zero. These results do not establish the required ordinary-account GNU learner environment. The separate downloadable execution record is not automatically a repository artifact or CI result.

No guest identity/non-root gate, supported student VM, complete interactive lesson, hardware route, novice/accessibility performance, permissions lesson, networking, full repository suite or assessor calibration was tested for this expansion. Local command contracts do not replace those release checks.

This changes only the existing EH-LINUX-01 teaching. It adds no canonical ID, prerequisite edge, network target, runtime integration, publication flag, Discord interaction, database change or deployment. Supported-platform reproduction, independent teaching review and actual private delivery policies remain open before learner release.
