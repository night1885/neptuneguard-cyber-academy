# Refresh the offline browser demo from local prototype sources

Local maintainer utility, not a server, runtime integration or browser test. Requires a trusted checkout and the original HTML demonstration previously delivered separately. The full HTML interface is not committed by this batch and is not reconstructed from scratch by this tool. Retain that downloaded demo as a reviewed local template. Do not use arbitrary HTML, personal records or unreviewed JavaScript as inputs.

## Build a new local output
From this prototype directory, using your own local template/output names:

```sh
node build-browser-demo.mjs --template demo-template.html --output refreshed-demo.html
```

The template filename above is an example: provide the actual saved original demo. The output must not already exist. The tool reads adjacent review.mjs and controls.mjs, replaces only the identified embedded core block, writes one new HTML file and prints JSON provenance to stdout. It does not overwrite the template or an existing output. No package installation, service connection, browser storage, migration or deployment is involved.

To run only the tool's isolated tests:

```sh
node --test build-browser-demo.test.mjs
```

## Exact transformation boundary
The original demo has one exact script block, a browser UUID prelude, an isolated createSyntheticReviewStore wrapper and a known start marker for the UI code. The tool requires those unique markers in their expected order. It preserves all text before the core and from the UI marker onward, including markup, styles, UI behavior, notices and the browser UUID helper. It replaces the two model wrappers with local reviewed source adapted only by replacing the supported Node randomUUID import and removing the named function export inside each isolated closure.

Missing/duplicate/reordered markers, unsupported static imports/exports and closing-script fragments require review rather than silent processing. This is a narrow trusted-template transformation, not a general JavaScript bundler, HTML parser, sanitizer or sandbox. Dynamic imports, arbitrary source behavior, template authenticity and all browser security properties are not certified by these checks. Only reviewed prototype sources/templates are appropriate.

## Provenance and retained labels
The stdout report records Git-blob hashes of the input model source, SHA-256 hashes of template/output, an outside-core-preserved check and browserExecuted:false. These hashes establish byte consistency, not trusted authorship or correctness. UI labels, original source-snapshot wording and other template text are deliberately retained; they are not automatically updated to describe a later core revision. Use the printed model hashes as refreshed-core provenance and separately review any source-caption update before distributing a changed demo.

The earlier HTML demo remains a visualization, not the finished Discord interface. This tool does not add workspace.mjs, the bounded authorization wrapper, real identity, evidence collection, persistence or live private-message handling to it.

## Executed local tests
Eight top-level tests passed locally on Node v20.20.1, zero failed and zero skipped. Synthetic minimal templates/sources were used. They cover exact surrounding-UI preservation, source/template/output hashing, marker failures, unsupported static imports/exports, closing-script fragments, adapted-script parsing and a real temporary-file CLI run with an overwrite refusal and unchanged existing files. An independent Python Git-blob calculation also matched the tool's calculation for a synthetic source fixture.

The original complete visual demo was not rebuilt through this utility in this creation batch. No actual browser/DOM interaction, screenshot, current-repository model execution, complete prototype suite or GitHub CI run was performed. The earlier model/demo checks retain their separate historical scope. A local JSON test report was generated separately, not automatically committed as CI evidence.

The output write is an exclusive new-file operation, not a database transaction, general filesystem boundary validator or robust build-publication workflow. File sizes, paths and permissions must be reviewed for the local environment. Source application files, existing prototypes, manifests, the combined runner, learner state, Community Learning and deployment remain unchanged by this batch.
