# Fictional application brief — Cedar Learning Portal

Entirely fictional paper scenario. Cedar Learning Portal is not NeptuneGuard, its architecture or a proposed deployment. No executable target, URL, account or real record is provided. Do not attempt to discover a matching service.

## Stated facts for modelling
S01: Students use a browser to read and edit their own draft submissions. They can submit a draft; submitted records become read-only to students.
S02: Instructors may review submitted work and record feedback only for courses to which they are assigned.
S03: A single application process receives browser requests and makes resource-access decisions before accessing persistent records. This is a design requirement, not proof of an implementation.
S04: The application uses a relational store for course membership, submissions, feedback and document metadata.
S05: Uploaded document bytes are held in a separate file store. Browser requests identify a document by an application resource ID; no arbitrary operating-system path is intended to be accepted from clients.
S06: A background export worker receives jobs from the application, reads authorized record sets and writes an export artifact to the file store.
S07: The application is responsible for deciding who may retrieve an export. Being able to guess an artifact ID must not grant access.
S08: The application and worker emit security-relevant events to a collector. Logs must support investigation without containing passwords, session credentials or document contents.
S09: Browser-to-application transport is intended to use HTTPS. There is no certificate-validation evidence, deployed endpoint or network topology supplied.
S10: No authentication mechanism, queue transport, database permissions, worker identity, retention period or upload-parser implementation is specified. These are explicit unknowns, not implicit assurances.

## Assets
Draft confidentiality; submission and feedback integrity; correct course-membership decisions; document/export confidentiality; accountable security records; and availability for legitimate users. These are modelling priorities, not a numeric risk ranking.

## Actors and capabilities
A visitor can request public descriptions. An enrolled student can use permitted student functions. An assigned instructor can use permitted review functions. The worker is a non-human component whose privileges are unspecified. Do not assume that possession of a browser or a student role grants instructor or worker authority.

## Requested model
Represent browsers, application, relational store, file store, worker/job handoff and collector. Name sensitive flows and the trust assumptions each crosses. Mark S10 unknowns. Do not add a cloud provider, payment service, federation vendor or network interface as a fact.

## Change card — paper only
C01: The fictional owner proposes that export jobs may be retried after a course assignment changes.

Explain which authorization timing, worker identity, stale-job and evidence questions this introduces. The card does not specify the correct implementation and grants no permission to run jobs or inspect actual records.

## Evidence rules
Cite S01-S10 or C01 when a conclusion depends on supplied information. Label threat statements as hypotheses and mitigation ideas as proposed controls. No simulated transcript should be described as execution evidence. Keep every submission clearly labelled FICTIONAL DESIGN EXERCISE.
