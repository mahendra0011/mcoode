import React from "react";
import { ToolCallCard } from "./ZCodeUX";

export const AgentActionSequence = () => {
  return (
    <div className="flex flex-col py-2 w-full max-w-lg">
      <ToolCallCard type="explored" label="Exploring context" summary="Analyzing project structure..." active={true} defaultOpen={false} />
    </div>
  );
};
