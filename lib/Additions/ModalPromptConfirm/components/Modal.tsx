// Adapted from https://github.com/Liadshiran/react-prompt-context

import React from "react";

export const Modal = ({
  isOpen,
  children
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) => (isOpen ? <div className="Modal">{children}</div> : null);

Modal.Header = ({ children }: { children: React.ReactNode }) => (
  <div className="Header">{children}</div>
);
Modal.Body = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);
Modal.Footer = ({ children }: { children: React.ReactNode }) => (
  <div className="Footer">{children}</div>
);
