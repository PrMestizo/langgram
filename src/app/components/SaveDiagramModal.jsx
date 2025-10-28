"use client";

import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

export default function SaveDiagramModal({
  open,
  diagramName,
  onDiagramNameChange,
  onSave,
  onClose,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="save-diagram-modal"
      aria-describedby="save-diagram-modal-description"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          bgcolor: "background.paper",
          boxShadow: 24,
          borderRadius: 2,
          p: 4,
          outline: "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography id="save-diagram-modal" variant="h6" component="h2">
            Guardar Diagrama
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
            sx={{ ml: 2 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            id="diagram-name"
            label="Nombre del diagrama"
            variant="outlined"
            value={diagramName}
            onChange={onDiagramNameChange}
            placeholder="Mi diagrama"
            margin="normal"
            autoFocus
            sx={{ mb: 2 }}
          />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={!diagramName.trim()}
            sx={{ textTransform: "none" }}
          >
            Guardar
          </Button>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ textTransform: "none" }}
          >
            Cancelar
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
