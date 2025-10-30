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

const NodeWithAttachments = ({ id, data }) => {
  const label = data?.label ?? data?.nodeType ?? "Node";
  const prompts = normalizeAttachmentList(data?.prompts);
  const chains = normalizeAttachmentList(data?.chains);
  const tools = normalizeAttachmentList(data?.tools);
  const { dragPayload, resetDrag } = useDnD();
  const { setNodes, setEdges, getEdges } = useReactFlow();

  const isAttachmentDrag =
    dragPayload?.kind === "prompt" ||
    dragPayload?.kind === "chain" ||
    dragPayload?.kind === "tool";
  const isConditionalEdgeDrag =
    dragPayload?.kind === "edge" && dragPayload?.type === "conditionalEdge";

  const handleDragOver = useCallback(
    (event) => {
      if (!isAttachmentDrag && !isConditionalEdgeDrag) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [isAttachmentDrag, isConditionalEdgeDrag]
  );

  const handleDrop = useCallback(
    (event) => {
      if (isConditionalEdgeDrag) {
        event.preventDefault();
        event.stopPropagation();

        const currentEdges = typeof getEdges === "function" ? getEdges() : [];
        const outgoingEdges = currentEdges.filter(
          (edge) => edge.source === id
        );

        if (outgoingEdges.length < 2) {
          resetDrag();
          return;
        }

        const existingGroupId = outgoingEdges[0]?.data?.conditionalGroupId;
        const groupId = existingGroupId || `conditional-${id}`;

        if (typeof setEdges === "function") {
          setEdges((edgesState) => {
            let hasChanges = false;
            const nextEdges = edgesState.map((edge) => {
              if (edge.source !== id) {
                return edge;
              }

              const nextData = {
                ...(edge.data ?? {}),
                conditionalGroupId: groupId,
              };

              if (
                edge.type !== "conditionalEdge" ||
                edge.data?.conditionalGroupId !== groupId
              ) {
                hasChanges = true;
                return {
                  ...edge,
                  type: "conditionalEdge",
                  data: nextData,
                };
              }

              return edge;
            });

            return hasChanges ? nextEdges : edgesState;
          });
        }

        resetDrag();
        return;
      }

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
    [
      dragPayload,
      getEdges,
      id,
      isAttachmentDrag,
      isConditionalEdgeDrag,
      resetDrag,
      setEdges,
      setNodes,
    ]
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
      className="langgram-node"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="group"
      aria-label={`Nodo ${label}`}
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <span className="langgram-node__label">{label}</span>
      <div className={attachmentsClassName} aria-label="Recursos asociados">
        {attachments.map(({ kind, name, Icon }) => (
            <div
              key={`${kind}-${name}`}
              className={`langgram-node__attachment langgram-node__attachment--${kind}`}
              title={name}
              data-label={name}
              role="img"
              aria-label={`${
                kind === "prompt"
                  ? "Prompt"
                  : kind === "chain"
                  ? "Chain"
                  : "Tool"
              } ${name}`}
            >
            <Icon aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NodeWithAttachments;
