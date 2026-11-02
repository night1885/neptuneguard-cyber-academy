# Standalone web foundations — local files and diagnostics

Draft paper worksheet. No command execution is required or authorized here. Use fictional examples and private local notes; no credentials or personal file content. This supplements the terminal bridge, not a complete Linux qualification.

## Model and worked example

A file's basic permission listing describes owner/group/other mode bits. For a regular file, mode 600 represents owner read/write and no group/other bits; 400 represents owner read only. These observations alone do not prove confidentiality against privileged access, copies, backups or other mechanisms. Directory permissions have different meanings; a file's write bit alone does not decide deletion from its containing directory.

Fictional case: an owned disposable regular file is observed at 600, changed to 400, read successfully by its owner, then restored to 600. The reading is consistent with owner read permission. It does not establish write denial, another account's behavior or protection of every copy. Do not label these fictional observations as your execution results.

## Guided reasoning

1. Identify which observations support the narrow mode-change claim and which broader claims remain untested.
2. A learner suggests a recursive permission change after an error. Explain why target identity, file type, path, ownership and authority must be established first.
3. A listing produces one useful filename and one missing-name diagnostic. Explain why useful output alone cannot establish complete command success.
4. A learner records only the status of a later successful print command. Explain why this does not recover the earlier command status.

## Independent variant

An unfamiliar path is a symbolic link and the learner is unsure whether the terminal belongs to the host or guest. They propose using administrator privileges to repair it. Write a stop/clarification decision, identifying uncertainties and a bounded next step. Do not change any file or account to answer.

## Later practical route and troubleshooting

Use [EH-LINUX-02](../lessons/EH-LINUX-02.md) for the original owned-file exercise only after its approved guest, normal-account and disposable-workspace requirements are satisfied. It permits no cross-account test, escalation, system-file change or recursive correction. The paper diagnostic questions above are not a replacement for full diagnostic-stream teaching or execution.

If setup, tools or context differ, use approved support; do not install replacements or change privileges to imitate expected output. For authorized later work, record predictions, actual observations, limitations, support received and restored final state through the approved private route. This worksheet establishes no pass mark, permission or completion decision.
