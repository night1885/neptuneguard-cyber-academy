# EH-LINUX-01 — Work safely in the terminal

Draft, not published. Requires the clean learner guest from EH-LAB-02. Proposed Linux IDs are additive and are not yet registered in a runtime course manifest. Students run their own equipment; no hosted lab is required. These foundations can be studied after guest creation and before the networking exercises.

## Outcomes
Identify the guest and current directory, explain a command's arguments, handle a filename containing spaces, and create a small evidence workspace without elevated privileges.

## Understand before typing
A terminal displays an interactive session. The shell reads commands and starts programs or runs its own built-in operations. These exercises assume Bash and GNU utilities in a Linux guest. Host PowerShell, a macOS terminal and an arbitrary shell are not interchangeable execution environments. Do not paste these steps into the host.

A command typically contains a name, options and arguments. In `cp -- 'scope note.txt' copy.txt`, cp is the program, -- ends option parsing, and the last two arguments identify the source and destination. Quotes keep the space inside one filename; they are not part of the resulting name. Do not copy prompt symbols such as $ from examples.

Start each exercise by confirming where you are:
```sh
hostname
id
pwd
printf '%s\n' "$BASH_VERSION"
```
Recognize your guest identity and normal account. If you are root, on the host, or uncertain which machine owns the terminal, stop and switch to the intended non-root guest session. Do not use sudo to make an unexplained error disappear. Record no passwords or unrelated group-membership details in public evidence.

## Make a disposable workspace
From your guest home directory, create a new directory named ng-linux-foundations with `mkdir -- ng-linux-foundations`, then enter it with `cd -- ng-linux-foundations`. Confirm `pwd`. If the directory already exists, inspect it rather than overwriting earlier evidence; choose a fresh name for a new attempt. Do not use a shared or personal-document directory.

Now run these one at a time:
```sh
printf '%s\n' 'authorized lab note' > 'scope note.txt'
ls -l -- 'scope note.txt'
cat -- 'scope note.txt'
cp -- 'scope note.txt' copy.txt
cmp -- 'scope note.txt' copy.txt
printf 'comparison status=%s\n' "$?"
```
The > operator creates or truncates the named output file before the command writes. Check the destination first. cmp normally prints nothing when the contents match and reports success through its status. Silence is not a universal success signal for every command.

An absolute path starts at the filesystem root. A relative path is resolved from the current directory. The names . and .. refer to the current and parent directories. Use `cd ..`, inspect `pwd`, then return to your workspace. Explain why a relative destination can change meaning after cd.

## Read help without improvising
Try `cp --help` and inspect the options relevant to this exercise. Use `help cd` for the Bash built-in. A help command failing does not justify downloading a replacement utility from an unknown site. No package installation or network action is needed here.

## Independent exercise
Create a second note whose filename contains spaces. Copy it to a new filename and demonstrate equal contents. Explain each command before execution. Include one deliberately missing filename in a read-only listing and explain the result without deleting or changing unrelated files.

## Evidence and feedback
Submit the guest role, working-directory description, a minimal command/result excerpt and an explanation of quoting, paths and overwrite risk. Redact personal usernames and hostnames where unnecessary. A reviewer should distinguish comprehension from a copied transcript. This is draft assessment guidance, not an automatic pass or permission grant.

Leave the workspace for the next lesson. No recursive deletion is taught in this exercise. Clean up only identified disposable files after evidence review.

## Source and validation
GNU Bash manual: https://www.gnu.org/software/bash/manual/bash.html
Quoted filename creation, copying and comparison were checked in a local execution sandbox, not a student VM. See LINUX-FOUNDATIONS-VALIDATION.md for limits.

## Expanded teaching: understand the shell before trusting the result

These additions explain the existing disposable-workspace exercise. They authorize no host commands, package installation, networking or elevated execution. Fictional examples are paper analysis, not transcripts of a learner's practical.

### Terminal, shell, program and context

The terminal is the interface through which you interact with a session. Bash is the command interpreter used by this lesson. Some command names select shell built-ins, such as cd; others normally invoke utilities, such as cp. A command that changes the shell's working directory must affect that shell's context, which is why understanding cd as a built-in matters.

Before interpreting an output, attach it to a context: which guest, which account, which shell and which working directory? The identity checks in the original procedure answer different parts of that question. A hostname alone is not proof you are in the intended guest because names can be duplicated. Treat the checks as consistent supporting observations, not a cryptographic identity guarantee. If the combined context is uncertain, stop rather than making a potentially destructive guess.

A normal account is a deliberate boundary. An unexpected permission error is diagnostic information, not a request to use sudo. Elevation can turn a harmless wrong-path mistake into a system change and would invalidate this exercise's scope.

### Read a command as structured input

In the existing copy command, distinguish the utility name, the end-of-options marker, the source argument and the destination argument. Quoting keeps the source name with its embedded space together as one argument; quote characters used for shell syntax are removed before the utility receives the argument. The marker -- tells a supporting utility that later arguments are operands rather than options. It is useful syntax, not a universal feature of every program.

Do not confuse quoting with permission. A correctly quoted path can still identify the wrong file. Likewise, an absolute path removes dependence on the current directory but does not prove that the destination is safe or authorized. Resolve the intended object before acting on it.

### Worked argument mistake — FICTIONAL

A learner intends to copy a note whose name contains a space but omits the quotes. The shell passes separate words where the learner intended one filename. Depending on the exact arguments and existing filesystem state, the utility can fail or act on unintended operands. The professional response is not to guess at more punctuation until output disappears. Compare the intended argument list with the command actually entered, confirm the current directory and target identities, then use only the documented procedure.

On paper, identify the intended two file operands in the original command. Explain why replacing them with three unquoted words does not express the same request. Do not create extra files merely to explore every possible outcome.

### Destination checks come before redirection

In the note-creation command, Bash handles > as a redirection. It opens the destination for output, creating or truncating an ordinary file under the applicable conditions before the program writes. The redirection is not a safety check performed by printf. A later program failure therefore does not imply that the previous file contents survived.

For this exercise, stop if a destination unexpectedly exists or is a link rather than the intended disposable file. Use the fresh-attempt naming rule already given. Do not point a demonstration at real evidence, personal documents or a shared directory. Append is not a universal remedy either: adding text to the wrong file can still damage its meaning.

### Comparison is narrower than trust

The existing cmp operation compares file contents. GNU cmp reports status zero when no differences are found, one when differences are found and two for trouble. A missing input is not equivalent to a comparison demonstrating unequal readable files. The explanation must distinguish “different” from “could not complete the comparison.”

Even a successful byte comparison does not establish where the original came from, whether it was authorized, whether its contents are true or whether the destination has appropriate permissions. This lesson's copy check establishes a limited relationship between the compared inputs at the time of observation.

### Troubleshooting the existing exercise

| Observation | Question to resolve | Bounded response |
|---|---|---|
| The workspace already exists | Is it an earlier attempt or evidence that must be kept? | Inspect the intended workspace and select a fresh attempt name rather than overwriting |
| The expected note cannot be found | Are the directory and exact quoted name correct? | Recheck context; do not search unrelated host or system directories |
| cmp is silent | What was its immediately recorded status? | Interpret the status using that utility's documented meanings |
| A command behaves differently from the guide | Is the shell/toolchain the reviewed one? | Record the difference; do not download substitutes |
| The session is root | Is this the intended non-root guest context? | Stop and return to the approved normal-account session |

### Exercises and explained answers

1. A copied note matches byte-for-byte. Has its publisher been authenticated? No. Equality between two inputs is not a publisher trust decision.
2. A relative destination changes after cd. Why? Relative paths are resolved from the current working directory, so the same text can name a different object after a context change.
3. A command fails after > names an existing file. Is that file necessarily intact? No. Shell redirection can have opened and truncated it before the program's failure.
4. Is “I followed the commands” an adequate explanation? No. Explain the intended operands, observed results, immediate status where relevant and the final workspace state. A transcript without context can conceal a wrong-machine or wrong-path error.

Use the original practical and its existing evidence requirements. These questions add formative explanations, not a new submission system or grading threshold.

Technical reading: GNU Bash manual, quoting and redirections; GNU Diffutils manual, cmp invocation. Documentation does not establish that the learner's guest has been reproduced or tested.
