export const filterProjects = (projects, term) => {
  const normalized = term?.toString().trim().toLowerCase();
  if (!normalized) return projects;

  return projects.filter((project) => {
    const haystack = [
      project.name,
      project.client,
      project.manager,
      project.type,
      project.status,
      project.description,
    ];

    if (Array.isArray(project.team)) {
      haystack.push(...project.team);
    }

    return haystack
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(normalized));
  });
};

