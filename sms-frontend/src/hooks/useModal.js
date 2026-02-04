import { useCallback, useState } from "react";
// Small helper hook to manage a single modal's open/close with optional payload
// Returns: isOpen, open(payload), close(), payload
export const useModal = (initial = false) => {
  const [isOpen, setIsOpen] = useState(initial);
  const [payload, setPayload] = useState(null);
  const open = useCallback((data = null) => {
    setPayload(data);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setPayload(null);
  }, []);
  return { isOpen, open, close, payload };
};
export default useModal;
