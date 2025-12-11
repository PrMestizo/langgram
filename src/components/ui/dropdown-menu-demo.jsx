"use client";

import React from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

const DropdownMenuDemo = () => {
  return (
    <DropdownMenu
      options={[
        {
          label: "Editar",
          onClick: () => console.log("Editar"),
          Icon: <EditNoteIcon fontSize="small" />,
        },
        {
          label: "Duplicar",
          onClick: () => console.log("Duplicar"),
          Icon: <ContentCopyIcon fontSize="small" />,
        },
        {
          label: "Eliminar",
          onClick: () => console.log("Eliminar"),
          Icon: <DeleteOutlineIcon fontSize="small" />,
        },
      ]}
    >
      Opciones
    </DropdownMenu>
  );
};

export { DropdownMenuDemo };
