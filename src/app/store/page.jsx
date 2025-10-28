"use client";

import { useMemo, useState, useEffect } from "react";
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
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

const SECTION_CONFIG = {
  diagrams: {
    title: "Diagrams",
    blurb: "Blueprints ready to plug into your workflows.",
    accents: ["#6366F1", "#0EA5E9", "#F97316", "#38BDF8"],
    endpoint: "/api/diagrams?visibility=public",
  },
  nodes: {
    title: "Nodes",
    blurb: "Reusable building blocks for your diagram canvas.",
    accents: ["#10B981", "#EC4899", "#6366F1", "#FB7185"],
    endpoint: "/api/nodes?visibility=public",
  },
  edges: {
    title: "Edges",
    blurb: "Smart connectors with programmable logic.",
    accents: ["#14B8A6", "#F43F5E", "#F59E0B", "#8B5CF6"],
    endpoint: "/api/edges?visibility=public",
  },
  prompts: {
    title: "Prompts",
    blurb: "Expert-crafted prompts for specialised tasks.",
    accents: ["#A855F7", "#3B82F6", "#6366F1", "#F97316"],
    endpoint: "/api/prompts?visibility=public",
  },
  tools: {
    title: "Tools",
    blurb: "Utilities ready to empower your graph workflows.",
    accents: ["#60A5FA", "#7C3AED", "#22D3EE", "#F97316"],
    endpoint: "/api/tools?visibility=public",
  },
  chains: {
    title: "Chains",
    blurb: "Opinionated orchestrations for end-to-end use cases.",
    accents: ["#F59E0B", "#8B5CF6", "#0EA5E9", "#10B981"],
    endpoint: "/api/chains?visibility=public",
  },
};

const DEFAULT_RESOURCES = Object.fromEntries(
  Object.keys(SECTION_CONFIG).map((sectionId) => [sectionId, []])
);

const truncate = (value, limit = 160) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
};

const extractTags = (item) => {
  const tags = [];

  if (Array.isArray(item.tags)) {
    tags.push(...item.tags);
  }

  if (Array.isArray(item.metadata?.tags)) {
    tags.push(...item.metadata.tags);
  }

  return Array.from(
    new Set(
      tags
        .filter((tag) => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
};

const resolveDescription = (item, sectionId) => {
  if (
    typeof item.description === "string" &&
    item.description.trim().length > 0
  ) {
    return item.description.trim();
  }

  if (sectionId === "prompts" && typeof item.content === "string") {
    const promptSummary = truncate(item.content.trim(), 140);
    if (promptSummary.length > 0) {
      return promptSummary;
    }
  }

  const metadataDescription = item.metadata?.description;
  if (
    typeof metadataDescription === "string" &&
    metadataDescription.trim().length > 0
  ) {
    return metadataDescription.trim();
  }

  const fallbacks = {
    diagrams: "Diagrama compartido por la comunidad.",
    nodes: "Nodo listo para reutilizar en tus flujos.",
    edges: "Conector configurable para tus diagramas.",
    prompts: "Prompt curado por la comunidad.",
    chains: "Cadena lista para integrarse en tus soluciones.",
    tools: "Tool lista para ampliar tus capacidades Langgram.",
  };

  return fallbacks[sectionId] ?? "Recurso de la comunidad.";
};

const pickAccent = (item, sectionId, index) => {
  const metadataAccent = item.metadata?.accentColor;
  if (typeof metadataAccent === "string" && metadataAccent.trim().length > 0) {
    return metadataAccent;
  }

  const palette = SECTION_CONFIG[sectionId]?.accents ?? ["#6366F1"];
  return palette[index % palette.length];
};

export default function StorePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTag, setActiveTag] = useState("all");

  const [resourcesBySection, setResourcesBySection] = useState(() => ({
    ...DEFAULT_RESOURCES,
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchResources = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const entries = await Promise.all(
          Object.entries(SECTION_CONFIG).map(async ([sectionId, config]) => {
            const response = await fetch(config.endpoint, {
              cache: "no-store",
            });

            if (!response.ok) {
              throw new Error(
                `No se pudieron cargar los ${config.title.toLowerCase()}.`
              );
            }

            const data = await response.json();
            return [sectionId, Array.isArray(data) ? data : []];
          })
        );

        const mapped = entries.reduce(
          (accumulator, [sectionId, items]) => {
            const resources = items.map((item, index) => {
              const title = item.name ?? item.title ?? "Recurso sin nombre";
              const author =
                item.owner?.name || item.owner?.email || "Comunidad Langgram";

              return {
                id: item.id,
                title,
                author,
                description: resolveDescription(item, sectionId),
                tags: extractTags(item),
                accent: pickAccent(item, sectionId, index),
              };
            });

            return {
              ...accumulator,
              [sectionId]: resources,
            };
          },
          { ...DEFAULT_RESOURCES }
        );

        setResourcesBySection(mapped);
      } catch (fetchError) {
        console.error("Error al cargar la store:", fetchError);
        setError(fetchError);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, []);

  const sections = useMemo(
    () =>
      Object.entries(SECTION_CONFIG).map(([sectionId, config]) => ({
        id: sectionId,
        ...config,
        resources: resourcesBySection[sectionId] ?? [],
      })),
    [resourcesBySection]
  );
  const categoryFilters = useMemo(
    () => [
      { value: "all", label: "Todos" },
      ...sections.map((section) => ({
        value: section.id,
        label: section.title,
      })),
    ],
    [sections]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set();

    sections.forEach((section) => {
      section.resources.forEach((resource) => {
        resource.tags.forEach((tag) => tagSet.add(tag));
      });
    });

    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [sections]);

  useEffect(() => {
    if (
      !categoryFilters.some((category) => category.value === activeCategory)
    ) {
      setActiveCategory("all");
    }
  }, [categoryFilters, activeCategory]);

  useEffect(() => {
    if (activeTag !== "all" && !allTags.includes(activeTag)) {
      setActiveTag("all");
    }
  }, [allTags, activeTag]);

  const filteredSections = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return sections
      .map((section) => {
        if (activeCategory !== "all" && section.id !== activeCategory) {
          return { ...section, resources: [] };
        }

        const resources = section.resources.filter((resource) => {
          const matchesSearch =
            normalizedQuery.length === 0 ||
            [resource.title, resource.author, resource.description].some(
              (value) =>
                typeof value === "string" &&
                value.toLowerCase().includes(normalizedQuery)
            ) ||
            resource.tags.some((tag) =>
              tag.toLowerCase().includes(normalizedQuery)
            );

          const matchesTag =
            activeTag === "all" || resource.tags.includes(activeTag);

          return matchesSearch && matchesTag;
        });

        return { ...section, resources };
      })
      .filter((section) => section.resources.length > 0);
  }, [sections, activeCategory, activeTag, searchTerm]);

  return (
    <DnDProvider>
      <div className="dndflow">
        <Sidebar onLoadDiagram={() => {}} />
        <div className="workspace store-workspace">
          <Box component="header" className="store-header">
            <Box className="store-header__title">
              <Typography
                variant="h4"
                component="h1"
                fontWeight={700}
                gutterBottom
              >
                LANGGRAM STORE
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Explora recursos creados por la comunidad para acelerar tus
                flujos.
              </Typography>
            </Box>
            <Box className="store-header__actions">
              <TextField
                fullWidth
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar diagramas, nodos, prompts, tools..."
                input={{
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
              {categoryFilters.map((category) => (
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
              {allTags.map((tag) => (
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
            {isLoading ? (
              <Box className="store-loading">
                <CircularProgress color="primary" size={32} />
                <Typography variant="body2" color="text.secondary">
                  Cargando recursos de la comunidad…
                </Typography>
              </Box>
            ) : error ? (
              <Alert severity="error" variant="outlined">
                {error.message || "Ocurrió un error al cargar la store."}
              </Alert>
            ) : filteredSections.length === 0 ? (
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
                <Box
                  key={section.id}
                  component="section"
                  className="store-section"
                >
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
                            <Box />
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
                                <Typography
                                  variant="h6"
                                  component="h3"
                                  fontWeight={600}
                                >
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
                                <Chip
                                  key={tag}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Stack>
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
