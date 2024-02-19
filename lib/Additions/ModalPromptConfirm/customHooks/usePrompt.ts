import { useContext } from "react";
import { PromptContext, PromptProps } from "../PromptContext";

export const usePrompt = () => {
  const [, setPrompt] = useContext(PromptContext);

  const triggerPrompt = (props: PromptProps) => {
    setPrompt({ isOpen: true, props });
  };

  return { triggerPrompt };
};
