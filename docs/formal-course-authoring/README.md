# Consolidated formal-course authoring

Source-only owner review. This adds no registered course, canonical lesson ID, learner permission, grade, XP or runtime integration. It preserves existing teaching rather than replacing it with brief generated summaries.

Ethical Hacking review: all 37 canonical sources in their unchanged catalogue order, 15 explicitly selected supporting documents, and the new human/AI teaching unit. Incident Response review: the eight existing registered SOC modules as labelled legacy anchors, plus the new human/AI and evidence/recovery units. These are review sections, not new canonical modules or a claim that either formal programme is finished.

Run:
    python3 -B -m unittest discover -s docs/formal-course-authoring -p test_build_review.py -v
    python3 -B docs/formal-course-authoring/build_review.py --output ../neptuneguard-course-review

The output directory must not exist. The builder generates two separate owner-review HTML documents and an audit JSON. Markdown is preserved as escaped source text; links/scripts are not activated and linked instructor resources are not imported. SOC projection excludes answer correctness, explanations and XP/badge fields. This is NOT a protected learner delivery service. Authoring materials may discuss answers and must not be published wholesale.

The source catalogue and SOC file are pinned by Git blob; selected Markdown is read from the checkout and its actual SHA-256 is recorded, not falsely claimed pinned to historical content. Update pins deliberately if those legacy sources change. The tests use synthetic miniature checkouts; full real-source assembly is delegated to the read-only workflow and is not claimed locally.

Generated conversation candidates (14 EH and 13 IR chapters and their new labs) are not all imported by this change. This change durably establishes the source assembler and two teaching units. Existing Windows/code-review prerequisites and execution limits remain intact. Native Windows/domain/cloud/memory/network, supported student routes, semantic review, independent assessment, actual academy navigation and certificate calibration remain real course work.

One consolidated release per complete course, not per lesson. No deployment, merge, service/settings change, new staging service, subscription or learner activation is authorised. Community Learning, existing registry keys, catalogue edges, existing fixtures and publication flags remain unchanged.

## Native observation practicals
The two added supporting units select the new managed fixture at docs/formal-ethical-hacking/fixtures/native-observation, committed at 636b1afe53dab486a324f87cf50e472bbd21671e. Its helper accepts no network target or PID, starts only its own loopback service, makes four fixed curl observations, optionally runs one known-port Nmap connect scan, closes its listener and observes/cleans only its own harmless Linux child. It does not scan the older application-ownership helper or expand that helper's scope.

Run named tests and verify_native.py from that fixture directory. Default mode reports unavailable Nmap, not a passing scan. --require-all-tools fails when Nmap/curl/Linux observations are unavailable. The ephemeral Ubuntu CI job explicitly installs curl/Nmap from configured distribution repositories and records actual versions/results. This is CI provisioning, not a student installation instruction, production operation or new staging service. The job also runs the existing named scripting and repaired-loopback suites unchanged, without scanning the older helper.

Selected prior local execution passed 19 tests and completed curl and Linux observations with cleanup. Nmap was absent and not executed locally. Workflow parse/shell checks do not establish a successful hosted native run; inspect CI and its retained native-tools.json before claiming it. These practicals do not complete enterprise/cloud/memory/Windows, student platforms or the comprehensive courses. They enter Ethical Hacking's owner-review source assembly, not runtime registration or a newly published Incident Response module.
