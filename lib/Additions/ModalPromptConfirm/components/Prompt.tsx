import React, { useContext, useEffect, useState } from "react";
import { Modal } from "./Modal";
import { PromptContext } from "../PromptContext";
import Input from "terriajs/lib/Styled/Input";
import Button from "terriajs/lib/Styled/Button";

export const Prompt = () => {
  const [prompt, setPrompt] = useContext(PromptContext);
  const [input, setInput] = useState("");
  const {
    isOpen,
    props: { text, title, value, isInput, onSubmit }
  } = prompt;

  const closePrompt = () => setPrompt({ ...prompt, isOpen: false });
  useEffect(() => {
    value && setInput(value);
  }, [isOpen, value]);

  return (
    <Modal isOpen={isOpen}>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <span>{text}</span>
        {isInput && (
          <Input
            onChange={(e: any) => setInput(e.target.value)}
            value={input}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          onClick={() => {
            onSubmit(input);
            closePrompt();
          }}
        >
          submit
        </Button>
        <Button onClick={closePrompt}>cancel</Button>
      </Modal.Footer>
    </Modal>
  );
};
