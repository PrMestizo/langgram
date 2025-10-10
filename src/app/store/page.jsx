"use client";

import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { DnDProvider } from "../components/DnDContext";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import SearchIcon from "@mui/icons-material/Search";

const STORE_SECTIONS = [
  {
    id: "diagrams",
    title: "Diagrams",
    blurb: "Blueprints ready to plug into your workflows.",
    resources: [
      {
        id: "diagram-1",
        title: "Customer Support Flow",
        author: "María García",
        description:
          "Automated routing for multilingual customer support teams with sentiment awareness.",
        tags: ["automation", "support", "multilingual"],
        accent: "#6366F1",
      },
      {
        id: "diagram-2",
        title: "Product Onboarding Journey",
        author: "Liam Patel",
        description:
          "Guided onboarding that adapts to user intent and usage telemetry in real time.",
        tags: ["growth", "product", "personalization"],
        accent: "#0EA5E9",
      },
      {
        id: "diagram-3",
        title: "Fraud Review Console",
        author: "Sofía Chen",
        description:
          "Decision tree for escalations that blends heuristics with LLM powered anomaly checks.",
        tags: ["risk", "finance", "trust"],
        accent: "#F97316",
      },
    ],
  },
  {
    id: "nodes",
    title: "Nodes",
    blurb: "Reusable building blocks for your diagram canvas.",
    resources: [
      {
        id: "node-1",
        title: "OpenAI Moderation Node",
        author: "Helena Ruiz",
        description: "Wraps the moderation endpoint with caching and throttling controls.",
        tags: ["safety", "api"],
        accent: "#10B981",
      },
      {
        id: "node-2",
        title: "Salesforce Contact Sync",
        author: "Daniel Kim",
        description:
          "Bi-directional sync that normalises contacts before writing to Salesforce.",
        tags: ["crm", "integration"],
        accent: "#EC4899",
      },
    ],
  },
  {
    id: "edges",
    title: "Edges",
    blurb: "Smart connectors with programmable logic.",
    resources: [
      {
        id: "edge-1",
        title: "Confidence Threshold Split",
        author: "Camila Rossi",
        description:
          "Route low confidence outputs to human review with queue prioritisation.",
        tags: ["guardrails", "quality"],
        accent: "#14B8A6",
      },
      {
        id: "edge-2",
        title: "A/B Experiment Router",
        author: "Yusuf Ahmed",
        description:
          "Weighted splitter with experiment tracking hooks and automatic rollback.",
        tags: ["experimentation", "analytics"],
        accent: "#F43F5E",
      },
    ],
  },
  {
    id: "prompts",
    title: "Prompts",
    blurb: "Expert-crafted prompts for specialised tasks.",
    resources: [
      {
        id: "prompt-1",
        title: "Tone Harmoniser",
        author: "Zoe Laurent",
        description:
          "Normalises brand tone across replies while preserving critical information.",
        tags: ["copywriting", "branding"],
        accent: "#A855F7",
      },
      {
        id: "prompt-2",
        title: "Code Reviewer",
        author: "Mateo Silva",
        description:
          "Highlights risky diffs with actionable remediation steps tailored per stack.",
        tags: ["engineering", "qa"],
        accent: "#3B82F6",
      },
      {
        id: "prompt-3",
        title: "Meeting Synthesiser",
        author: "Hannah Lee",
        description:
          "Summarises meetings with follow-up tasks, owners and sentiment insights.",
        tags: ["productivity", "meetings"],
        accent: "#6366F1",
      },
    ],
  },
  {
    id: "chains",
    title: "Chains",
    blurb: "Opinionated orchestrations for end-to-end use cases.",
    resources: [
      {
        id: "chain-1",
        title: "Lead Qualifier",
        author: "Olivia Martín",
        description:
          "Enriches inbound leads, scores intent and triggers personalised outreach steps.",
        tags: ["sales", "automation"],
        accent: "#F59E0B",
      },
      {
        id: "chain-2",
        title: "Incident Co-Pilot",
        author: "Noah Fischer",
        description:
          "Guides responders through runbooks while drafting stakeholder comms automatically.",
        tags: ["operations", "sre"],
        accent: "#8B5CF6",
      },
    ],
  },
];

const CATEGORY_FILTERS = [
  { value: "all", label: "Todos" },
  ...STORE_SECTIONS.map((section) => ({
    value: section.id,
    label: section.title,
  })),
];

const ALL_TAGS = Array.from(
  new Set(
    STORE_SECTIONS.flatMap((section) =>
      section.resources.flatMap((resource) => resource.tags)
    )
  )
).sort((a, b) => a.localeCompare(b));

const matchesQuery = (value, query) =>
  value.toLowerCase().includes(query.trim().toLowerCase());

export default function StorePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState(CATEGORY_FILTERS[0].value);
  const [activeTag, setActiveTag] = useState("all");

  const filteredSections = useMemo(() => {
    return STORE_SECTIONS.map((section) => {
      if (activeCategory !== "all" && section.id !== activeCategory) {
        return { ...section, resources: [] };
      }

      const resources = section.resources.filter((resource) => {
        const matchesSearch =
          searchTerm.trim().length === 0 ||
          matchesQuery(resource.title, searchTerm) ||
          matchesQuery(resource.author, searchTerm) ||
          matchesQuery(resource.description, searchTerm) ||
          resource.tags.some((tag) => matchesQuery(tag, searchTerm));

        const matchesTag =
          activeTag === "all" || resource.tags.includes(activeTag);

        return matchesSearch && matchesTag;
      });

      return { ...section, resources };
    }).filter((section) => section.resources.length > 0);
  }, [activeCategory, activeTag, searchTerm]);

  return (
    <DnDProvider>
      <div className="dndflow">
        <Sidebar onLoadDiagram={() => {}} />
        <div className="workspace store-workspace">
          <Box component="header" className="store-header">
            <Box className="store-header__title">
              <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                Store
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Explora recursos creados por la comunidad para acelerar tus flujos.
              </Typography>
            </Box>
            <Box className="store-header__actions">
              <TextField
                fullWidth
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar diagramas, nodos, prompts..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Box>
          </Box>

          <Box component="section" className="store-filters">
            <Tabs
              value={activeCategory}
              onChange={(_event, value) => setActiveCategory(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {CATEGORY_FILTERS.map((category) => (
                <Tab
                  key={category.value}
                  value={category.value}
                  label={category.label}
                />
              ))}
            </Tabs>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              className="store-tags"
            >
              <Chip
                label="Todos los tags"
                variant={activeTag === "all" ? "filled" : "outlined"}
                color="primary"
                onClick={() => setActiveTag("all")}
                size="small"
              />
              {ALL_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  variant={activeTag === tag ? "filled" : "outlined"}
                  color={activeTag === tag ? "primary" : "default"}
                  onClick={() => setActiveTag(tag)}
                  size="small"
                />
              ))}
            </Stack>
          </Box>

          <Box className="store-scroll">
            {filteredSections.length === 0 ? (
              <Box className="store-empty">
                <Typography variant="h6" component="p" gutterBottom>
                  No encontramos resultados para tu búsqueda.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Intenta con otro término o limpia los filtros seleccionados.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setActiveCategory("all");
                    setActiveTag("all");
                    setSearchTerm("");
                  }}
                >
                  Restablecer filtros
                </Button>
              </Box>
            ) : (
              filteredSections.map((section) => (
                <Box key={section.id} component="section" className="store-section">
                  <Box className="store-section__header">
                    <Box>
                      <Typography variant="h5" component="h2" fontWeight={600}>
                        {section.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {section.blurb}
                      </Typography>
                    </Box>
                    <Button variant="text" size="small">
                      Ver todos
                    </Button>
                  </Box>
                  <Box className="store-grid">
                    {section.resources.map((resource) => (
                      <Box key={resource.id} className="store-grid__item">
                        <Card className="store-card" elevation={0}>
                          <CardContent>
                            <Box
                              className="store-card__preview"
                              sx={{ backgroundColor: resource.accent }}
                            />
                            <Stack
                              direction="row"
                              spacing={1.5}
                              alignItems="center"
                              className="store-card__meta"
                            >
                              <Avatar sx={{ bgcolor: resource.accent }}>
                                {resource.author.slice(0, 1)}
                              </Avatar>
                              <Box>
                                <Typography variant="overline" color="text.secondary">
                                  {resource.author}
                                </Typography>
                                <Typography variant="h6" component="h3" fontWeight={600}>
                                  {resource.title}
                                </Typography>
                              </Box>
                            </Stack>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              className="store-card__description"
                            >
                              {resource.description}
                            </Typography>
                          </CardContent>
                          <CardActions className="store-card__actions">
                            <Stack
                              direction="row"
                              spacing={1}
                              useFlexGap
                              flexWrap="wrap"
                              className="store-card__tags"
                            >
                              {resource.tags.map((tag) => (
                                <Chip key={tag} label={tag} size="small" variant="outlined" />
                              ))}
                            </Stack>
                            <Button variant="contained" size="small" color="primary">
                              Usar
                            </Button>
                          </CardActions>
                        </Card>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </div>
      </div>
    </DnDProvider>
  );
}
