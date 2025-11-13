---
agent: PAW-02B Impl Planner
description: Feedback for plan in commit 3c6c4cd
---
For Phase 3 - I don't want the agent to outright refuse. I want a value of PAW to be - always allow the user to override instructions. So if the user asks for implementation details, that's fine. We don't need to explicitly state it's not allowed, but let the agent reason about the request. But if the user doesn't request implementation details, then it shouldn't produce it, even in conversaitons where implementation details are discussed. For converstaions where implementation is discussed, that should be used to inform the spec but not generate the implementation details in the spec itself.