import React, { createContext, useState } from "react";

export type PromptProps = {
  title: string;
  text: string;
  value?: string;
  isInput: boolean;
  onSubmit: (input: string) => void;
};

type PromptContextValue = {
  isOpen: boolean;
  props: PromptProps;
};

type SetPromptContextValue = React.Dispatch<
  React.SetStateAction<PromptContextValue>
>;

const defaultValue: PromptContextValue = {
  isOpen: false,
  props: {
    title: "",
    text: "",
    isInput: false,
    value: "",
    onSubmit: () => null
  }
};

export const PromptContext = createContext<
  [PromptContextValue, SetPromptContextValue]
>([defaultValue, () => {}]);

export const PromptContextProvider = ({ children }) => {
  const [prompt, setPrompt] = useState<PromptContextValue>(defaultValue);

  return (
    <PromptContext.Provider value={[prompt, setPrompt]}>
      {children}
    </PromptContext.Provider>
  );
};
