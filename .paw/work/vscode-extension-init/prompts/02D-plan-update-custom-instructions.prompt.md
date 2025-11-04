---
mode: PAW-02B Impl Planner
model: Claude Sonnet 4.5 (copilot)
---

Additionally, I'd like to enhance this work by adding a new phase of the implementation plan and specification such that a file can be used to provide custom instructions to the project initialization prompt. Customization will be an important component across PAW. The design of how custom instructions are provided to the prompt that kicks off agent mode should be a repeatable and clean pattern.

For custom instructions, there can be a directory under .paw that is `instructions/`. This will host custom instructions for various parts of the PAW workflow.

`.paw/instructions/init-instructions.md` will provide custom instructions to the project initialization prompt. If no instructions exist, then that part of the prompt remains unchanged. If it does exist, there's some front-matter explaining the context of the instructions, and then the instructions themselves.

Update the implementation plan and specification to include this new phase for custom instructions. Add it as a new phase after the existing phases.