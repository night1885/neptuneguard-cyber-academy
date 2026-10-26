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
