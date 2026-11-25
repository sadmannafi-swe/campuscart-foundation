import { useEffect, useState } from "react";

const TEXT_INPUT = /^(text|search|email|tel|url|password|number)$/;

function isTextField(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return TEXT_INPUT.test(el.type || "text");
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * True while the user is typing in a text field on a touch device. Fixed bottom bars
 * hide during that time: iOS Safari keeps `position: fixed` bars on screen above the
 * on-screen keyboard, where they cover the field being typed in (e.g. the chat composer).
 */
export function useTypingOnTouch(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const touch = window.matchMedia?.("(pointer: coarse)");
    if (!touch?.matches) return;
    const update = () => setTyping(isTextField(document.activeElement));
    // focus moves after focusout fires; read activeElement once it has settled
    const onOut = () => setTimeout(update, 0);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return typing;
}
