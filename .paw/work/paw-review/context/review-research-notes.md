Excerpts and summaries from a deep research report on code review best practices, with implications for designing the PAW-Review workflow.

# Reviews as Mentorship — Summary & Implications for PAW

Modern research increasingly reframes code review not just as defect detection, but as a key site of knowledge transfer and skill development. Studies from Microsoft, Google, and OSS communities show that effective reviewers often act as mentors—offering rationale, coding idioms, and design heuristics rather than just corrections. Reviews that explain why a change matters or how an alternative might generalize are correlated with faster skill growth and longer-term code quality improvements. Empirical findings highlight that mentorship-oriented reviews improve author satisfaction and retention, though they can increase reviewer time if unstructured. The most effective mentorship happens when feedback is personalized to the author’s demonstrated skill level—novices benefit from explicit reasoning and patterns, while experienced authors value concise pointers to architectural implications or testing strategies.

For PAW-Review, this suggests a dual-lens approach: (1) the correctness/impact lens of CR2-Evaluate and (2) the growth/learning lens that identifies “teachable moments.” Agents can analyze PR metadata, past reviews, and code style signals to estimate author familiarity with APIs, idioms, or testing norms. From there, they can propose a short “Mentorship Notes” section in Review.md, such as:

“The contributor seems new to async I/O—consider linking to org guidelines or providing a short rationale for event-loop safety.”

“Repeated manual parsing logic might be a good point to introduce the shared ParserUtils abstraction.”

These suggestions should be opt-in and human-interpreted—never automatically surfaced as critique. The goal is to empower reviewers to integrate teaching moments naturally into their own voice, enriching the social and developmental function of review without over-stepping. Over time, PAW could learn lightweight heuristics to surface mentorship prompts selectively, balancing low noise with high developmental value—turning every review into both a quality gate and a growth opportunity.

# Communication and Tone

Code review is as much a social process as a technical one. Effective reviewers
 communicate with clarity and empathy. Some concrete behaviors that studies and guides endorse: - Be
 specific and clear: Comments that are vague (“Bad code here” or “Not sure about this”) are not useful.
 Instead, say what is wrong and if possible why or how to improve (“This algorithm is O(n^2); with 10k items
 it might be too slow. Could we use a set for lookup to make it O(n)?”). A Microsoft study found that
 comments with clear rationale and actionable suggestions were considered “useful” by authors, whereas
 comments lacking explanation were often ignored or marked not useful . - Ask questions rather
 than make assumptions: If something looks odd, a good reviewer might ask “I expected this function to
 do X, but it’s doing Y – is there a reason for that?” rather than “You did this wrong” in case there’s context
 they missed. This invites discussion and knowledge sharing. It’s also part of a polite tone – not accusing the
 author of stupidity, but jointly investigating the code’s intent. - Avoid personal or demeaning language:
 Focus on the code, not the coder. “This logic is confusing to me” instead of “You wrote this confusingly.” and
 certainly avoid insults or sarcasm. Open-source communities have learned that overly harsh reviews drive
 contributors away; one analysis found that negative feedback correlated with some developers not
 submitting further contributions . Conversely, an interview study of OSS contributors noted that they
 welcome constructive negative feedback when it’s framed as improving the work, not attacking the person,
 and when the project culture supports learning from mistakes . - Praise when appropriate: It’s not
 all criticism – if a PR author did something well (clean design, good tests), pointing it out builds rapport and
 reinforces good practices. E.g., “Great tests for edge cases – very thorough!” This often appears in advice
 columns though it’s not heavily studied quantitatively; it’s more about team culture.

# Use of Checklists and Systematic Approach

To ensure important aspects are not overlooked, many
 teams use a checklist (either mentally or explicitly). Google’s list of “What to look for” provides an excellent
 template , which we can summarize as: - Design: Does the change make sense architecturally? Is it
 the right approach or a hack? This catches issues like “Maybe this belongs in a different layer or service” or
 “This adds a lot of complexity; is there an alternative?”. - Functionality: Does the code do what it’s supposed
 to? Any obvious bugs or missing logic? Are there edge cases not handled (null inputs, error conditions,
 concurrency)? Even if the author tested, the reviewer tries to think of “what if…” scenarios. If
 something is user-facing, reviewers might even pull the branch and run it to see behavior (though that’s
 extra effort – some do it for tricky UI changes). - Complexity: Is the code more complex than necessary?
 Simpler is usually better for maintainability. Watch for over-engineering (adding generality that isn’t needed
 now) or overly clever code when straightforward code would suffice. If the code is hard to understand
 quickly, ask for simplification or at least better comments. - Tests: Are there tests, and are they adequate? If
 no tests, that’s likely a problem (unless it’s docs or config only). If tests exist, check they truly verify the new
 logic, not just pass trivially . Reviewers have caught bugs by noticing a test that doesn’t actually
 assert the right condition. Also verify tests follow best practices (readable, not too fragile). The rule “tests
 should be in the same PR as the code” is widely endorsed – if not, ensure there’s a plan to add them. 
Naming & Clarity: Poor naming can hide bugs or make future maintenance hard. Ensure variables, functions,
 classes have descriptive names consistent with their purpose . If a name is misleading or too vague,
 suggest a better one. - Comments & Documentation: The code’s comments should explain why something is
 done if it’s not obvious . If you see complex code with no comments, consider if a brief comment would
 help future readers. Also check if any public API changes require updating external docs or README 
reviewers often catch if docs were forgotten when an API is changed . - Style & Consistency: Code should
 follow the project’s style guidelines (formatting, idioms). However, as emphasized, don’t obsess beyond
 what the style guide mandates . If the codebase is internally inconsistent but working, it might not
 be worth blocking a PR to reformat something – but you can encourage a separate cleanup. A major style
 no-no (like not following security-sensitive guidelines) is different – that would be important. In general,
 enforce objective rules (from style guide or lint tool) and downplay personal preferences. - Performance,
 Security, etc.: Depending on the context, reviews should also consider non-functional requirements. For
 example, in a performance-critical component, a reviewer should think “Is this change going to slow things
 down? Did we run our benchmarks?”. In a security-critical component, think about injection, authentication,
 encryption – whatever is relevant (and flag the code to security experts if needed). Some organizations have
 specialty reviewers or a secondary sign-off for areas like security or UX. The regular reviewer at least needs
 to be aware and not introduce obvious issues (e.g., storing a password in plain text, etc.). Often, checklist
 questions here: “Does this handle error conditions gracefully? Any potential crash or leak?”.
 
 Empirical evidence backs the use of such checklists. A controlled experiment by Baum et al. (2017) found
 that giving reviewers a checklist improved defect detection rates, especially for less experienced reviewers,
 because it guided their attention systematically. Also, a study of open-source reviews noted that missing
 tests or docs are more often caught when projects explicitly list those in their review criteria (for instance,
 Qt project’s review checklist includes “Are new tests added if needed?” resulting in higher frequency of test
related comments than projects without such a norm).

---

 In sum, improving code review outcomes relies on: - Ensuring reviews are done with sufficient depth
 (coverage, focus) but not wasted on stylistic trivia (use tools for that). - Educating and empowering
 reviewers with guidelines, training (mentor new reviewers, maybe shadowing experienced ones). 
Fostering a positive review culture where feedback is constructive and authors are receptive. Authors
 also have responsibilities: e.g., self-review code before sending (clean it up, catch obvious bugs – one
 empirical finding is that higher rate of author self-verification correlates with fewer defects ). If authors
 treat code review as collaborative rather than adversarial, it goes better. - Continuous improvement: teams
 should periodically discuss their code review process (what’s working, what’s not). Perhaps maintain a living
 checklist that evolves, or hold “bug bar” meetings to align on what is a Must vs Should (so all reviewers
 apply similar standards)