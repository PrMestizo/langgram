"use client";

import { useCallback, useMemo } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { TbPrompt } from "react-icons/tb";
import { GiCrossedChains } from "react-icons/gi";
import { FaTools } from "react-icons/fa";
import { useDnD } from "./DnDContext";

const ATTACHMENT_KINDS = {
  prompt: {
    key: "prompts",
    build: (payload) => ({
      name: payload.name,
      content: payload.content ?? "",
    }),
    icon: TbPrompt,
  },
  chain: {
    key: "chains",
    build: (payload) => ({
      name: payload.name,
      code: payload.code ?? "",
    }),
    icon: GiCrossedChains,
  },
  tool: {
    key: "tools",
    build: (payload) => ({
      name: payload.name,
      code: payload.code ?? "",
      description: payload.description ?? "",
    }),
    icon: FaTools,
  },
};

const normalizeAttachmentList = (value) => (Array.isArray(value) ? value : []);

const NodeWithAttachments = ({ id, data, selected }) => {
  const label = data?.label ?? data?.nodeType ?? "Node";
  const prompts = normalizeAttachmentList(data?.prompts);
  const chains = normalizeAttachmentList(data?.chains);
  const tools = normalizeAttachmentList(data?.tools);
  const { dragPayload, resetDrag } = useDnD();
  const { setNodes } = useReactFlow();

  const isAttachmentDrag =
    dragPayload?.kind === "prompt" ||
    dragPayload?.kind === "chain" ||
    dragPayload?.kind === "tool";

  const handleDragOver = useCallback(
    (event) => {
      if (!isAttachmentDrag) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [isAttachmentDrag]
  );

  const handleDrop = useCallback(
    (event) => {
      if (!isAttachmentDrag) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const attachmentConfig = ATTACHMENT_KINDS[dragPayload.kind];
      if (!attachmentConfig) {
        return;
      }

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== id) {
            return node;
          }

          const nextData = { ...node.data };
          const listKey = attachmentConfig.key;
          const existingList = normalizeAttachmentList(nextData[listKey]);
          const nextList = [...existingList];
          const nextEntry = attachmentConfig.build(dragPayload);
          const existingIndex = nextList.findIndex(
            (entry) => entry.name === nextEntry.name
          );

          if (existingIndex !== -1) {
            nextList[existingIndex] = nextEntry;
          } else {
            nextList.push(nextEntry);
          }

          nextData[listKey] = nextList;
          return {
            ...node,
            data: nextData,
          };
        })
      );

      resetDrag();
    },
    [dragPayload, id, isAttachmentDrag, resetDrag, setNodes]
  );

  const handleRemoveAttachment = useCallback(
    (attachmentKind, attachmentName) => {
      const attachmentConfig = ATTACHMENT_KINDS[attachmentKind];

      if (!attachmentConfig) {
        return;
      }

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== id) {
            return node;
          }

          const nextData = { ...node.data };
          const listKey = attachmentConfig.key;
          const existingList = normalizeAttachmentList(nextData[listKey]);

          nextData[listKey] = existingList.filter(
            (entry) => entry.name !== attachmentName
          );

          return {
            ...node,
            data: nextData,
          };
        })
      );
    },
    [id, setNodes]
  );

  const attachments = useMemo(
    () => [
      ...prompts.map((prompt) => ({
        kind: "prompt",
        name: prompt.name,
        Icon: ATTACHMENT_KINDS.prompt.icon,
      })),
      ...chains.map((chain) => ({
        kind: "chain",
        name: chain.name,
        Icon: ATTACHMENT_KINDS.chain.icon,
      })),
      ...tools.map((tool) => ({
        kind: "tool",
        name: tool.name,
        Icon: ATTACHMENT_KINDS.tool.icon,
      })),
    ],
    [chains, prompts, tools]
  );

  const attachmentsClassName = `langgram-node__attachments${
    attachments.length === 0 && isAttachmentDrag
      ? " langgram-node__attachments--hover"
      : ""
  }`;

  return (
    <div
      className={`langgram-node ${selected ? "langgram-node--selected" : ""}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="group"
      aria-label={`Nodo ${label}`}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <span className="langgram-node__label">{label}</span>
      <div className={attachmentsClassName} aria-label="Recursos asociados">
        {attachments.map(({ kind, name, Icon }) => {
          const attachmentLabel =
            kind === "prompt" ? "Prompt" : kind === "chain" ? "Chain" : "Tool";

          const handleRemoveClick = (event) => {
            event.stopPropagation();
            event.preventDefault();
            handleRemoveAttachment(kind, name);
          };

          return (
            <div
              key={`${kind}-${name}`}
              className={`langgram-node__attachment langgram-node__attachment--${kind}`}
              title={name}
              data-label={name}
              role="img"
              aria-label={`${attachmentLabel} ${name}`}
            >
              <Icon aria-hidden="true" />
              <button
                type="button"
                className="langgram-node__attachment-remove"
                aria-label={`Eliminar ${attachmentLabel.toLowerCase()} ${name}`}
                onClick={handleRemoveClick}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NodeWithAttachments;
