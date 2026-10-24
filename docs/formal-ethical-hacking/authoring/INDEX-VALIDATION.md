# Draft course index — authoring check record

This batch adds a documentation reading route and standalone maintainer link checks. It does not change the home-lab manifest, lesson content, fixture behavior, runtime, learner interface, hosting, Community Learning or publication status. Reading order is proposed and must defer to individual prerequisites and actual lab permissions.

## Checks performed
The existing lesson filenames and supporting worksheet names were checked against the GitHub directory listing on formal-ethical-hacking-programme. The course-documentation root was inspected before proposing a new README and authoring directory. New batch files are included in the commit proposal.

The supplied checker and unit tests were executed in a temporary local Python environment. All eight tests passed with no skips: an existing file, missing file, parent escape, absolute path, ignored external/fragment-only links, file link with an unchecked fragment, encoded parent escape and symbolic-link escape. These are unit checks against synthetic local files.

## What was not done
No full repository checkout was reconstructed or checked by this script during authoring. GitHub Actions/CI was not run. No lesson's entire content, prerequisite graph, external source, fragment anchor, supported hardware, learner workflow or grading policy was validated. The complete README link scan should be executed in a real checkout after the commit.

The regular-expression checker supports the simple inline-link style used by this README; it is not a complete Markdown parser. It ignores external schemes, network locations and fragment-only targets, and checks file existence rather than anchor validity. It reads only the README, performs filesystem metadata checks and does not import or execute teaching fixtures. It is not a security sandbox or release gate.

## Maintainer next checks
Run the README checker and isolated unit suite in a real checkout. Review reading order and individual prerequisites separately. Keep new drafts unpublished until their technical reproduction, assessment, privacy, accessibility and activation requirements are satisfied. Do not reinterpret link success as validated course content or learner completion.

A downloadable JSON unit-check record was generated separately and is not automatically committed as CI evidence.
