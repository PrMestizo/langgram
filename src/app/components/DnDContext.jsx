"use client";
import { createContext, useCallback, useContext, useState } from "react";

const defaultContextValue = {
  type: null,
  setType: () => {},
  code: null,
  setCode: () => {},
  dragPayload: null,
  setDragPayload: () => {},
  resetDrag: () => {},
};

const DnDContext = createContext(defaultContextValue);

export const DnDProvider = ({ children }) => {
  const [type, setType] = useState(null);
  const [code, setCode] = useState(null);
  const [dragPayload, setDragPayload] = useState(null);

  const resetDrag = useCallback(() => {
    setType(null);
    setCode(null);
    setDragPayload(null);
  }, [setCode, setDragPayload, setType]);

  return (
    <DnDContext.Provider
      value={{
        type,
        setType,
        code,
        setCode,
        dragPayload,
        setDragPayload,
        resetDrag,
      }}
    >
      {children}
    </DnDContext.Provider>
  );
};

export default DnDContext;

export const useDnD = () => {
  return useContext(DnDContext);
};
